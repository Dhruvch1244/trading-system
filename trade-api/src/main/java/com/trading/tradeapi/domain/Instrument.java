package com.trading.tradeapi.domain;

import lombok.Data;

@Data
public class Instrument {
    private String symbol;
    private String name;
    private String assetClass;
    private String currency;
    private boolean tradable;
}
