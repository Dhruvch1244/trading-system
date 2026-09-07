package com.trading.tradeapi.kafka;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Consumed from the 'market-data' topic, produced by trade-executor's market-data poller. */
public record MarketDataEvent(
        String symbol,
        BigDecimal price,
        OffsetDateTime asOf
) {}
