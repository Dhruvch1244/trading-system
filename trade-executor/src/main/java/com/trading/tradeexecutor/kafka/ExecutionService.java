package com.trading.tradeexecutor.kafka;

import com.trading.tradeexecutor.fauxnance.FauxnanceClient;
import com.trading.tradeexecutor.repo.OrderExecutionRepository;
import com.trading.tradeexecutor.repo.OrderExecutionRepository.AccountRow;
import com.trading.tradeexecutor.repo.OrderExecutionRepository.OrderRow;
import com.trading.tradeexecutor.repo.OrderExecutionRepository.PositionRow;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Fill-or-reject module. One JDBC transaction per order covers the order status,
 * the account's cash/buying-power, and the position update together.
 */
@Service
@Slf4j
public class ExecutionService {

    private final OrderExecutionRepository repo;
    private final FauxnanceClient fauxnanceClient;

    public ExecutionService(OrderExecutionRepository repo, FauxnanceClient fauxnanceClient) {
        this.repo = repo;
        this.fauxnanceClient = fauxnanceClient;
    }

    @Transactional
    public TradeEvent process(OrderPlacedEvent event) {
        Optional<OrderRow> maybeOrder = repo.findOrderById(event.orderId());
        if (maybeOrder.isEmpty()) {
            log.warn("order {} not found in DB, skipping (not yet visible or already deleted)", event.orderId());
            return null;
        }

        OrderRow order = maybeOrder.get();
        if (!"PENDING".equals(order.status())) {
            log.info("order {} already processed (status={}), skipping duplicate delivery", order.id(), order.status());
            return null;
        }

        BigDecimal fillPrice = resolveFillPrice(order);
        if (fillPrice == null) {
            return reject(order, "market data unavailable");
        }

        AccountRow account = repo.findAccountForUpdate(order.accountId());

        if ("BUY".equals(order.side())) {
            return processBuy(order, account, fillPrice);
        } else {
            return processSell(order, account, fillPrice);
        }
    }

    private BigDecimal resolveFillPrice(OrderRow order) {
        if ("LIMIT".equals(order.orderType())) {
            return order.price();
        }
        return fauxnanceClient.getQuotePrice(order.symbol());
    }

    private TradeEvent processBuy(OrderRow order, AccountRow account, BigDecimal fillPrice) {
        BigDecimal cost = fillPrice.multiply(BigDecimal.valueOf(order.qty()));
        if (cost.compareTo(account.buyingPower()) > 0) {
            return reject(order, "insufficient buying power");
        }

        BigDecimal newCash = account.cashBalance().subtract(cost);
        BigDecimal newBuyingPower = account.buyingPower().subtract(cost);

        repo.upsertPositionBuy(order.accountId(), order.symbol(), order.qty(), fillPrice);
        repo.updateAccountBalances(order.accountId(), newCash, newBuyingPower);
        repo.insertBalanceHistory(order.accountId(), "TRADE_SETTLEMENT", cost.negate(), order.id());

        return fill(order, fillPrice);
    }

    private TradeEvent processSell(OrderRow order, AccountRow account, BigDecimal fillPrice) {
        Optional<PositionRow> maybePosition = repo.findPositionForUpdate(order.accountId(), order.symbol());
        if (maybePosition.isEmpty() || maybePosition.get().qty() < order.qty()) {
            return reject(order, "insufficient position");
        }

        BigDecimal proceeds = fillPrice.multiply(BigDecimal.valueOf(order.qty()));
        BigDecimal newCash = account.cashBalance().add(proceeds);
        BigDecimal newBuyingPower = account.buyingPower().add(proceeds);

        repo.reducePositionSell(order.accountId(), order.symbol(), order.qty());
        repo.updateAccountBalances(order.accountId(), newCash, newBuyingPower);
        repo.insertBalanceHistory(order.accountId(), "TRADE_SETTLEMENT", proceeds, order.id());

        return fill(order, fillPrice);
    }

    private TradeEvent fill(OrderRow order, BigDecimal fillPrice) {
        repo.insertExecution(order.id(), order.qty(), fillPrice);
        repo.updateOrderStatus(order.id(), "FILLED");
        return new TradeEvent(order.id(), order.accountId(), "FILLED", order.qty(), fillPrice, null, OffsetDateTime.now());
    }

    private TradeEvent reject(OrderRow order, String reason) {
        repo.updateOrderStatus(order.id(), "REJECTED");
        return new TradeEvent(order.id(), order.accountId(), "REJECTED", null, null, reason, OffsetDateTime.now());
    }
}
