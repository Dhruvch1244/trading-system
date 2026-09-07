package com.trading.tradeapi.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PlaceOrderRequest {

    @NotBlank
    private String symbol;

    @NotBlank
    @Pattern(regexp = "BUY|SELL")
    private String side;

    @NotBlank
    @Pattern(regexp = "MARKET|LIMIT")
    private String orderType;

    @NotNull
    @Positive
    private Integer qty;

    @DecimalMin(value = "0.0001")
    private BigDecimal price;

    @NotBlank
    private String idempotencyKey;
}
