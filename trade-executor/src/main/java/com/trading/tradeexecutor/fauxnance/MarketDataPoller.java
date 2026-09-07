package com.trading.tradeexecutor.fauxnance;

import com.trading.tradeexecutor.kafka.MarketDataEvent;
import com.trading.tradeexecutor.kafka.TradeEventProducer;
import com.trading.tradeexecutor.repo.InstrumentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Polls Fauxnance for every tradable instrument on a fixed interval and republishes to
 * 'market-data'. The symbol list is read from the DB each cycle (not a static config list) so
 * it stays correct as the tradable universe grows into the hundreds. Quotes are fetched in
 * batches via the /quotes?symbols= endpoint, not one call per symbol - with ~250 instruments,
 * one-call-per-symbol at any reasonable interval blows through Fauxnance's 2000-requests/day
 * cap almost immediately (250 symbols x every 15s = ~1.4M req/day). Batches of 100 at a
 * 2-minute interval keep it under ~1500 req/day even wall against several hundred symbols.
 */
@Component
@Slf4j
public class MarketDataPoller {

    private static final int BATCH_SIZE = 100;

    private final FauxnanceClient fauxnanceClient;
    private final TradeEventProducer tradeEventProducer;
    private final InstrumentRepository instrumentRepository;

    public MarketDataPoller(
            FauxnanceClient fauxnanceClient,
            TradeEventProducer tradeEventProducer,
            InstrumentRepository instrumentRepository) {
        this.fauxnanceClient = fauxnanceClient;
        this.tradeEventProducer = tradeEventProducer;
        this.instrumentRepository = instrumentRepository;
    }

    @Scheduled(fixedDelayString = "${trading.market-data-poll.interval-ms:120000}")
    public void poll() {
        List<String> symbols = instrumentRepository.findTradableSymbols();
        if (symbols.isEmpty()) return;

        for (int start = 0; start < symbols.size(); start += BATCH_SIZE) {
            List<String> batch = symbols.subList(start, Math.min(start + BATCH_SIZE, symbols.size()));
            Map<String, BigDecimal> prices = fauxnanceClient.getQuotePrices(batch);
            OffsetDateTime now = OffsetDateTime.now();
            prices.forEach((symbol, price) -> tradeEventProducer.publishMarketData(new MarketDataEvent(symbol, price, now)));
        }

        log.debug("market-data poll published quotes for up to {} symbols", symbols.size());
    }
}
