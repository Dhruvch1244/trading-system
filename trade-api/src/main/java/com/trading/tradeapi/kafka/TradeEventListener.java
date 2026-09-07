package com.trading.tradeapi.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trading.tradeapi.domain.PriceAlert;
import com.trading.tradeapi.mapper.PriceAlertMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Read-side consumer: trade-executor is the single writer of orders/positions/cash (one JDBC
 * transaction per order). This listener just keeps an in-memory cache fresh for fast reads -
 * it never mutates trading state, except for marking price alerts triggered, which is a
 * side-read-model concern of its own (not part of the order/cash/position invariant).
 */
@Component
@Slf4j
public class TradeEventListener {

    private final ObjectMapper objectMapper;
    private final MarketDataCache marketDataCache;
    private final PriceAlertMapper priceAlertMapper;

    public TradeEventListener(ObjectMapper objectMapper, MarketDataCache marketDataCache, PriceAlertMapper priceAlertMapper) {
        this.objectMapper = objectMapper;
        this.marketDataCache = marketDataCache;
        this.priceAlertMapper = priceAlertMapper;
    }

    @KafkaListener(topics = "${trading.kafka.topic-trade-events}", groupId = "trade-api")
    public void onTradeEvent(String payload) {
        try {
            TradeEvent event = objectMapper.readValue(payload, TradeEvent.class);
            log.info("trade-event received: order={} type={}", event.orderId(), event.eventType());
        } catch (Exception ex) {
            log.warn("failed to parse trade-event payload: {}", payload, ex);
        }
    }

    @KafkaListener(topics = "${trading.kafka.topic-market-data}", groupId = "trade-api")
    public void onMarketData(String payload) {
        try {
            MarketDataEvent event = objectMapper.readValue(payload, MarketDataEvent.class);
            marketDataCache.put(event);
            checkAlerts(event);
        } catch (Exception ex) {
            log.warn("failed to parse market-data payload: {}", payload, ex);
        }
    }

    private void checkAlerts(MarketDataEvent event) {
        for (PriceAlert alert : priceAlertMapper.findActiveBySymbol(event.symbol())) {
            boolean crossed = "ABOVE".equals(alert.getDirection())
                    ? event.price().compareTo(alert.getTargetPrice()) >= 0
                    : event.price().compareTo(alert.getTargetPrice()) <= 0;
            if (crossed) {
                priceAlertMapper.markTriggered(alert.getId());
                log.info("price alert {} triggered: {} {} {}", alert.getId(), event.symbol(), alert.getDirection(), alert.getTargetPrice());
            }
        }
    }
}
