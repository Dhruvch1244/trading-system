package com.trading.tradeapi.web;

import com.trading.tradeapi.domain.Account;
import com.trading.tradeapi.domain.Instrument;
import com.trading.tradeapi.domain.Order;
import com.trading.tradeapi.dto.PlaceOrderRequest;
import com.trading.tradeapi.kafka.OrderPlacedEvent;
import com.trading.tradeapi.kafka.OrderProducer;
import com.trading.tradeapi.mapper.AccountMapper;
import com.trading.tradeapi.mapper.InstrumentMapper;
import com.trading.tradeapi.mapper.OrderMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class OrderService {

    private final AccountMapper accountMapper;
    private final InstrumentMapper instrumentMapper;
    private final OrderMapper orderMapper;
    private final OrderProducer orderProducer;

    public OrderService(
            AccountMapper accountMapper,
            InstrumentMapper instrumentMapper,
            OrderMapper orderMapper,
            OrderProducer orderProducer) {
        this.accountMapper = accountMapper;
        this.instrumentMapper = instrumentMapper;
        this.orderMapper = orderMapper;
        this.orderProducer = orderProducer;
    }

    public Order placeOrder(Long accountId, PlaceOrderRequest request) {
        Order existing = orderMapper.findByIdempotencyKey(request.getIdempotencyKey());
        if (existing != null) {
            if (!existing.getAccountId().equals(accountId)) {
                // Idempotency keys are globally unique - a collision from a different account is
                // a client bug or an attempted replay, never a legitimate retry. Never return
                // another account's order data.
                throw new ResponseStatusException(HttpStatus.CONFLICT, "idempotency key already used");
            }
            return existing;
        }

        Account account = accountMapper.findById(accountId);
        if (account == null || !"ACTIVE".equals(account.getStatus())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "account not active");
        }

        Instrument instrument = instrumentMapper.findBySymbol(request.getSymbol());
        if (instrument == null || !instrument.isTradable()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "instrument not tradable");
        }

        if ("LIMIT".equals(request.getOrderType()) && request.getPrice() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "limit orders require a price");
        }

        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setAccountId(accountId);
        order.setSymbol(request.getSymbol());
        order.setSide(request.getSide());
        order.setOrderType(request.getOrderType());
        order.setQty(request.getQty());
        order.setPrice(request.getPrice());
        order.setStatus("PENDING");
        order.setIdempotencyKey(request.getIdempotencyKey());

        orderMapper.insert(order);

        orderProducer.publish(new OrderPlacedEvent(
                order.getId(),
                order.getAccountId(),
                order.getSymbol(),
                order.getSide(),
                order.getOrderType(),
                order.getQty(),
                order.getPrice(),
                order.getIdempotencyKey(),
                OffsetDateTime.now()
        ));

        return orderMapper.findById(order.getId());
    }
}
