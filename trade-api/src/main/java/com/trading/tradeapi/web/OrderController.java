package com.trading.tradeapi.web;

import com.trading.tradeapi.domain.Execution;
import com.trading.tradeapi.domain.Order;
import com.trading.tradeapi.dto.PlaceOrderRequest;
import com.trading.tradeapi.mapper.ExecutionMapper;
import com.trading.tradeapi.mapper.OrderMapper;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;
    private final OrderMapper orderMapper;
    private final ExecutionMapper executionMapper;

    public OrderController(OrderService orderService, OrderMapper orderMapper, ExecutionMapper executionMapper) {
        this.orderService = orderService;
        this.orderMapper = orderMapper;
        this.executionMapper = executionMapper;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Order placeOrder(@CurrentAccount Long accountId, @Valid @RequestBody PlaceOrderRequest request) {
        return orderService.placeOrder(accountId, request);
    }

    @GetMapping
    public List<Order> orderHistory(@CurrentAccount Long accountId,
                                     @RequestParam(defaultValue = "50") int limit) {
        return orderMapper.findByAccountId(accountId, limit);
    }

    @GetMapping("/{orderId}")
    public Map<String, Object> orderDetail(@CurrentAccount Long accountId, @PathVariable UUID orderId) {
        Order order = orderMapper.findById(orderId);
        if (order == null || !order.getAccountId().equals(accountId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "order not found");
        }
        List<Execution> executions = executionMapper.findByOrderId(orderId);
        return Map.of("order", order, "executions", executions);
    }

    @PatchMapping("/{orderId}/cancel")
    public Order cancelOrder(@CurrentAccount Long accountId, @PathVariable UUID orderId) {
        Order order = orderMapper.findById(orderId);
        if (order == null || !order.getAccountId().equals(accountId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "order not found");
        }

        int updated = orderMapper.cancelIfPending(orderId, accountId);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "order already filled, rejected, or cancelled");
        }

        return orderMapper.findById(orderId);
    }
}
