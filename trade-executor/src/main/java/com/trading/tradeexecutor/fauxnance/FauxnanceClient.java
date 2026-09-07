package com.trading.tradeexecutor.fauxnance;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class FauxnanceClient {

    private final RestClient restClient;

    public FauxnanceClient(
            @Value("${trading.fauxnance.base-url}") String baseUrl,
            @Value("${trading.fauxnance.api-key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Api-Key", apiKey)
                .build();
    }

    /** Returns the latest delayed quote price for a symbol, or null if unavailable. */
    public BigDecimal getQuotePrice(String symbol) {
        try {
            FauxnanceQuoteResponse response = restClient.get()
                    .uri("/quotes/{symbol}", symbol)
                    .retrieve()
                    .body(FauxnanceQuoteResponse.class);
            return response != null && response.quote() != null ? response.quote().price() : null;
        } catch (Exception ex) {
            log.warn("fauxnance quote lookup failed for {}: {}", symbol, ex.getMessage());
            return null;
        }
    }

    /**
     * Batch quote lookup via the documented GET /quotes?symbols= contract - one HTTP call
     * covers up to `symbols.size()` names, which is what keeps polling hundreds of instruments
     * under Fauxnance's 2000-requests/day cap instead of one call per symbol per poll cycle.
     */
    public Map<String, BigDecimal> getQuotePrices(List<String> symbols) {
        if (symbols.isEmpty()) return Map.of();

        try {
            BatchQuoteResponse response = restClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/quotes").queryParam("symbols", String.join(",", symbols)).build())
                    .retrieve()
                    .body(BatchQuoteResponse.class);

            if (response == null || response.quotes() == null) return Map.of();

            Map<String, BigDecimal> prices = new HashMap<>();
            response.quotes().forEach((symbol, data) -> {
                if (data.quote() != null) {
                    prices.put(symbol, data.quote().price());
                }
            });
            return prices;
        } catch (Exception ex) {
            log.warn("fauxnance batch quote lookup failed for {} symbols: {}", symbols.size(), ex.getMessage());
            return Map.of();
        }
    }

    public record FauxnanceQuoteResponse(String symbol, String name, Quote quote) {
        public record Quote(BigDecimal price, String asOf, Integer delayedMinutes) {}
    }

    public record BatchQuoteResponse(Map<String, FauxnanceQuoteResponse> quotes, List<String> unknownSymbols) {}
}
