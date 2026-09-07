package com.trading.tradeapi.domain;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class Position {
    private Long accountId;
    private String symbol;
    private Integer qty;
    private BigDecimal avgCost;
}
