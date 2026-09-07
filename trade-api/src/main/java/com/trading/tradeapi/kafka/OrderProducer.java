package com.trading.tradeapi.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class OrderProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String ordersTopic;

    public OrderProducer(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            @Value("${trading.kafka.topic-orders}") String ordersTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.ordersTopic = ordersTopic;
    }

    public void publish(OrderPlacedEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            String key = String.valueOf(event.accountId());
            kafkaTemplate.send(ordersTopic, key, payload);
            log.info("published order {} to topic {} (accountId={})", event.orderId(), ordersTopic, event.accountId());
        } catch (Exception ex) {
            log.error("failed to publish order {}", event.orderId(), ex);
            throw new IllegalStateException("failed to publish order to Kafka", ex);
        }
    }
}
