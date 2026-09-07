package com.trading.tradeapi.web;

import com.trading.tradeapi.kafka.MarketDataCache;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Movers are computed from the market-data cache's daily reference price - a heuristic
 * "biggest move since UTC midnight" ranking, not a trading recommendation. The frontend labels
 * this accordingly rather than presenting it as real trading advice.
 */
@RestController
@RequestMapping("/api/v1/market")
public class MarketController {

    private final MarketDataCache marketDataCache;

    public MarketController(MarketDataCache marketDataCache) {
        this.marketDataCache = marketDataCache;
    }

    @GetMapping("/movers")
    public Map<String, List<MarketDataCache.Mover>> movers(@RequestParam(defaultValue = "10") int limit) {
        int cappedLimit = Math.min(limit, 50);
        return Map.of(
                "gainers", marketDataCache.topMovers(cappedLimit, true),
                "losers", marketDataCache.topMovers(cappedLimit, false)
        );
    }
}
