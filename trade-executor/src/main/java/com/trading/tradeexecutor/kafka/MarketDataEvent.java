package com.trading.tradeexecutor.kafka;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Published to the 'market-data' topic by the market-data poller. */
public record MarketDataEvent(
        String symbol,
        BigDecimal price,
        OffsetDateTime asOf
) {}
