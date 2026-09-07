package com.trading.tradeexecutor.kafka;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Consumed from the 'orders' topic, produced by trade-api. */
public record OrderPlacedEvent(
        UUID orderId,
        Long accountId,
        String symbol,
        String side,
        String orderType,
        Integer qty,
        BigDecimal price,
        String idempotencyKey,
        OffsetDateTime createdOn
) {}
