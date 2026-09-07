package com.trading.tradeapi.kafka;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory read-model of the latest market-data tick per symbol, fed by the Kafka listener.
 * Also tracks a daily reference price (the first tick seen since UTC midnight) per symbol so
 * percent-change/movers can be computed without a second round-trip to Fauxnance or the DB -
 * this cache already sees every tick as it arrives.
 */
@Component
public class MarketDataCache {

    private record Tracked(MarketDataEvent latest, BigDecimal referencePrice, LocalDate referenceDay) {}

    private final Map<String, Tracked> bySymbol = new ConcurrentHashMap<>();

    public void put(MarketDataEvent event) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        bySymbol.compute(event.symbol(), (symbol, existing) -> {
            if (existing == null || !existing.referenceDay().equals(today)) {
                return new Tracked(event, event.price(), today);
            }
            return new Tracked(event, existing.referencePrice(), existing.referenceDay());
        });
    }

    public MarketDataEvent get(String symbol) {
        Tracked tracked = bySymbol.get(symbol);
        return tracked != null ? tracked.latest() : null;
    }

    public record Mover(String symbol, BigDecimal price, BigDecimal changePercent) {}

    /** Sorted by change percent - most positive first for gainers, most negative first for losers. */
    public List<Mover> topMovers(int limit, boolean gainers) {
        Comparator<Mover> byChange = Comparator.comparing(Mover::changePercent);
        return bySymbol.values().stream()
                .filter(t -> t.referencePrice().signum() != 0)
                .map(t -> new Mover(
                        t.latest().symbol(),
                        t.latest().price(),
                        t.latest().price().subtract(t.referencePrice())
                                .divide(t.referencePrice(), 4, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100))
                ))
                .sorted(gainers ? byChange.reversed() : byChange)
                .limit(limit)
                .toList();
    }
}
