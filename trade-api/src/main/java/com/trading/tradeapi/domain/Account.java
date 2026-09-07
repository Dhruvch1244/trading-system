package com.trading.tradeapi.domain;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class Account {
    private Long id;
    private String accountReference;
    private BigDecimal cashBalance;
    private BigDecimal buyingPower;
    private String status;
    private Integer version;
    private OffsetDateTime lastUpdated;
}
