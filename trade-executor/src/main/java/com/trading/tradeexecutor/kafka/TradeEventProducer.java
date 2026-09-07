package com.trading.tradeexecutor.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class TradeEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String tradeEventsTopic;
    private final String marketDataTopic;

    public TradeEventProducer(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            @Value("${trading.kafka.topic-trade-events}") String tradeEventsTopic,
            @Value("${trading.kafka.topic-market-data}") String marketDataTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.tradeEventsTopic = tradeEventsTopic;
        this.marketDataTopic = marketDataTopic;
    }

    public void publishTradeEvent(TradeEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(tradeEventsTopic, String.valueOf(event.accountId()), payload);
        } catch (Exception ex) {
            log.error("failed to publish trade-event for order {}", event.orderId(), ex);
        }
    }

    public void publishMarketData(MarketDataEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(marketDataTopic, event.symbol(), payload);
        } catch (Exception ex) {
            log.error("failed to publish market-data for {}", event.symbol(), ex);
        }
    }
}
