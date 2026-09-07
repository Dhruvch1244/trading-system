package com.trading.tradeapi.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AddWatchlistRequest {

    @NotBlank
    private String symbol;
}
