package com.trading.tradeapi.web;

import com.trading.tradeapi.domain.Instrument;
import com.trading.tradeapi.fauxnance.FauxnanceClient;
import com.trading.tradeapi.kafka.MarketDataCache;
import com.trading.tradeapi.kafka.MarketDataEvent;
import com.trading.tradeapi.mapper.InstrumentMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/instruments")
public class InstrumentController {

    private final InstrumentMapper instrumentMapper;
    private final MarketDataCache marketDataCache;
    private final FauxnanceClient fauxnanceClient;

    public InstrumentController(InstrumentMapper instrumentMapper, MarketDataCache marketDataCache, FauxnanceClient fauxnanceClient) {
        this.instrumentMapper = instrumentMapper;
        this.marketDataCache = marketDataCache;
        this.fauxnanceClient = fauxnanceClient;
    }

    /** With a few hundred instruments, callers should page/search rather than pull everything. */
    @GetMapping
    public List<Instrument> list(
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        int cappedLimit = Math.min(limit, 200);
        return instrumentMapper.search(search, cappedLimit, offset);
    }

    @GetMapping("/{symbol}/quote")
    public MarketDataEvent quote(@PathVariable String symbol) {
        return marketDataCache.get(symbol.toUpperCase());
    }

    @GetMapping("/{symbol}/candles")
    public List<FauxnanceClient.Candle> candles(@PathVariable String symbol) {
        return fauxnanceClient.getCandles(symbol.toUpperCase());
    }

    @GetMapping("/{symbol}/news")
    public List<FauxnanceClient.NewsItem> news(@PathVariable String symbol) {
        return fauxnanceClient.getNews(symbol.toUpperCase());
    }
}
