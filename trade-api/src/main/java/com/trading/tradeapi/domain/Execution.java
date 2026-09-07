package com.trading.tradeapi.domain;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class Execution {
    private Long id;
    private UUID orderId;
    private Integer quantity;
    private BigDecimal price;
    private OffsetDateTime executedAt;
}
