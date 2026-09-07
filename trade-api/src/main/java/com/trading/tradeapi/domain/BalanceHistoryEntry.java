package com.trading.tradeapi.domain;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class BalanceHistoryEntry {
    private Long id;
    private Long accountId;
    private String type;
    private BigDecimal amount;
    private UUID relatedOrderId;
    private OffsetDateTime createdOn;
}
