package com.trading.tradeapi.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateAlertRequest {

    @NotBlank
    private String symbol;

    @NotNull
    @DecimalMin(value = "0.0001")
    private BigDecimal targetPrice;

    @NotBlank
    @Pattern(regexp = "ABOVE|BELOW")
    private String direction;
}
