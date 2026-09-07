package com.trading.tradeapi.dto;

import java.math.BigDecimal;

public record PositionView(
        Long accountId,
        String symbol,
        Integer qty,
        BigDecimal avgCost,
        BigDecimal lastPrice,
        BigDecimal marketValue,
        BigDecimal unrealizedPnl
) {}
