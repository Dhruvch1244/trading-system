package com.trading.tradeapi.domain;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class PriceAlert {
    private Long id;
    private Long accountId;
    private String symbol;
    private BigDecimal targetPrice;
    private String direction;
    private OffsetDateTime triggeredAt;
    private OffsetDateTime seenAt;
    private OffsetDateTime createdAt;
}
