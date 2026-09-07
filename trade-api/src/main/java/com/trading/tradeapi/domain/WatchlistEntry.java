package com.trading.tradeapi.domain;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class WatchlistEntry {
    private Long accountId;
    private String symbol;
    private OffsetDateTime addedOn;
}
