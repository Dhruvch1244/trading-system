package com.trading.tradeapi.domain;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class Order {
    private UUID id;
    private Long accountId;
    private String symbol;
    private String side;
    private String orderType;
    private Integer qty;
    private BigDecimal price;
    private String status;
    private String idempotencyKey;
    private OffsetDateTime createdOn;
}
