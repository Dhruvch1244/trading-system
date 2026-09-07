package com.trading.tradeapi.kafka;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Consumed from the 'trade-events' topic, produced by trade-executor. */
public record TradeEvent(
        UUID orderId,
        Long accountId,
        String eventType,
        Integer fillQuantity,
        BigDecimal fillPrice,
        String rejectReason,
        OffsetDateTime occurredAt
) {}
