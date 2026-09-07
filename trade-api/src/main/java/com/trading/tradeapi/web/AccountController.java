package com.trading.tradeapi.web;

import com.trading.tradeapi.domain.Account;
import com.trading.tradeapi.domain.BalanceHistoryEntry;
import com.trading.tradeapi.domain.Position;
import com.trading.tradeapi.dto.DepositRequest;
import com.trading.tradeapi.dto.PositionView;
import com.trading.tradeapi.kafka.MarketDataCache;
import com.trading.tradeapi.kafka.MarketDataEvent;
import com.trading.tradeapi.mapper.AccountMapper;
import com.trading.tradeapi.mapper.BalanceHistoryMapper;
import com.trading.tradeapi.mapper.PositionMapper;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@RestController
public class AccountController {

    private final AccountMapper accountMapper;
    private final PositionMapper positionMapper;
    private final BalanceHistoryMapper balanceHistoryMapper;
    private final MarketDataCache marketDataCache;
    private final AccountService accountService;

    public AccountController(
            AccountMapper accountMapper,
            PositionMapper positionMapper,
            BalanceHistoryMapper balanceHistoryMapper,
            MarketDataCache marketDataCache,
            AccountService accountService) {
        this.accountMapper = accountMapper;
        this.positionMapper = positionMapper;
        this.balanceHistoryMapper = balanceHistoryMapper;
        this.marketDataCache = marketDataCache;
        this.accountService = accountService;
    }

    @GetMapping("/api/v1/accounts/me")
    public Account me(@CurrentAccount Long accountId) {
        Account account = accountMapper.findById(accountId);
        if (account == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "account not found");
        }
        return account;
    }

    @GetMapping("/api/v1/accounts/me/positions")
    public List<PositionView> positions(@CurrentAccount Long accountId) {
        return positionMapper.findByAccountId(accountId).stream()
                .map(this::toView)
                .toList();
    }

    private PositionView toView(Position position) {
        MarketDataEvent tick = marketDataCache.get(position.getSymbol());
        BigDecimal lastPrice = tick != null ? tick.price() : position.getAvgCost();
        BigDecimal qty = BigDecimal.valueOf(position.getQty());
        BigDecimal marketValue = lastPrice.multiply(qty);
        BigDecimal unrealizedPnl = lastPrice.subtract(position.getAvgCost()).multiply(qty);

        return new PositionView(
                position.getAccountId(),
                position.getSymbol(),
                position.getQty(),
                position.getAvgCost(),
                lastPrice,
                marketValue,
                unrealizedPnl
        );
    }

    @PostMapping("/api/v1/accounts/me/deposit")
    public Account deposit(@CurrentAccount Long accountId, @Valid @RequestBody DepositRequest request) {
        return accountService.deposit(accountId, request.getAmount());
    }

    @GetMapping("/api/v1/accounts/me/balance-history")
    public List<BalanceHistoryEntry> balanceHistory(@CurrentAccount Long accountId,
                                                      @RequestParam(defaultValue = "50") int limit) {
        return balanceHistoryMapper.findByAccountId(accountId, limit);
    }
}
