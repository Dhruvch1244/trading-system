package com.trading.tradeapi.kafka;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Published to the 'orders' topic, keyed by accountId, for trade-executor to consume. */
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
