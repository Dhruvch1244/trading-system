package com.trading.tradeexecutor.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class OrderListener {

    private final ObjectMapper objectMapper;
    private final ExecutionService executionService;
    private final TradeEventProducer tradeEventProducer;

    public OrderListener(ObjectMapper objectMapper, ExecutionService executionService, TradeEventProducer tradeEventProducer) {
        this.objectMapper = objectMapper;
        this.executionService = executionService;
        this.tradeEventProducer = tradeEventProducer;
    }

    @KafkaListener(topics = "${trading.kafka.topic-orders}", groupId = "trade-executor")
    public void onOrderPlaced(String payload) {
        try {
            OrderPlacedEvent event = objectMapper.readValue(payload, OrderPlacedEvent.class);
            TradeEvent result = executionService.process(event);
            if (result != null) {
                tradeEventProducer.publishTradeEvent(result);
                log.info("order {} -> {}", result.orderId(), result.eventType());
            }
        } catch (Exception ex) {
            log.error("failed to process order payload: {}", payload, ex);
        }
    }
}
