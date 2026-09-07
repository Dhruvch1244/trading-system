package com.trading.tradeapi.fauxnance;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;

/**
 * trade-api's own read-only client for historical candles, backing the price charts.
 * Separate from trade-executor's FauxnanceClient (which handles live quotes for fills/polling) -
 * different service, different concern, no shared module needed for two small HTTP clients.
 */
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

    public List<Candle> getCandles(String symbol) {
        try {
            QuoteResponse response = restClient.get()
                    .uri("/quotes/{symbol}", symbol)
                    .retrieve()
                    .body(QuoteResponse.class);
            return response != null && response.candles() != null ? response.candles() : List.of();
        } catch (Exception ex) {
            log.warn("fauxnance candle lookup failed for {}: {}", symbol, ex.getMessage());
            return List.of();
        }
    }

    public List<NewsItem> getNews(String symbol) {
        try {
            NewsResponse response = restClient.get()
                    .uri("/news/{symbol}", symbol)
                    .retrieve()
                    .body(NewsResponse.class);
            return response != null && response.items() != null ? response.items() : List.of();
        } catch (Exception ex) {
            log.warn("fauxnance news lookup failed for {}: {}", symbol, ex.getMessage());
            return List.of();
        }
    }

    public record QuoteResponse(String symbol, String name, Object quote, List<Candle> candles) {}

    public record Candle(String date, BigDecimal open, BigDecimal high, BigDecimal low, BigDecimal close, Long volume) {}

    public record NewsResponse(String symbol, List<NewsItem> items) {}

    public record NewsItem(String headline, String source, String sentiment, String publishedAt) {}
}
