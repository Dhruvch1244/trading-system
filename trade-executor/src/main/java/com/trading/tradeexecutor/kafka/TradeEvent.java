package com.trading.tradeexecutor.kafka;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Published to the 'trade-events' topic after a fill-or-reject decision. */
public record TradeEvent(
        UUID orderId,
        Long accountId,
        String eventType, // FILLED | REJECTED
        Integer fillQuantity,
        BigDecimal fillPrice,
        String rejectReason,
        OffsetDateTime occurredAt
) {}
