package com.trading.tradeapi.kafka;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** In-memory read-model of the latest market-data tick per symbol, fed by the Kafka listener. */
@Component
public class MarketDataCache {

    private final Map<String, MarketDataEvent> latestBySymbol = new ConcurrentHashMap<>();

    public void put(MarketDataEvent event) {
        latestBySymbol.put(event.symbol(), event);
    }

    public MarketDataEvent get(String symbol) {
        return latestBySymbol.get(symbol);
    }

    public Map<String, MarketDataEvent> snapshot() {
        return Map.copyOf(latestBySymbol);
    }
}
