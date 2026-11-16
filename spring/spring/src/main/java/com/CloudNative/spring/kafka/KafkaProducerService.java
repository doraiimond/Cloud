package com.CloudNative.spring.kafka;

import com.CloudNative.spring.kafka.dto.KafkaEventDto;
import com.CloudNative.spring.kafka.dto.KafkaNotificationDto;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaProducerService {
    private static final Logger log = LoggerFactory.getLogger(KafkaProducerService.class);

    private final KafkaTemplate<String, String> template;
    private final ObjectMapper mapper;
    private final KafkaTopics topics;

    public KafkaProducerService(KafkaTemplate<String, String> template, ObjectMapper mapper, KafkaTopics topics) {
        this.template = template;
        this.mapper = mapper;
        this.topics = topics;
    }

    public void publishEvent(KafkaEventDto event) {
        event.validate();
        publish(topics.events(), event.eventId(), event);
    }

    public void publishNotification(KafkaNotificationDto notification) {
        notification.validate();
        publish(topics.notifications(), notification.eventId(), notification);
    }

    public void publish(String topic, String key, Object payload) {
        try {
            String json = mapper.writeValueAsString(payload);
            template.send(topic, key, json).whenComplete((result, error) -> {
                if (error != null) {
                    log.error("Kafka publish failed topic={} key={}", topic, key, error);
                } else {
                    log.info("Kafka published topic={} key={} partition={} offset={}",
                            topic, key, result.getRecordMetadata().partition(), result.getRecordMetadata().offset());
                }
            });
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("No se pudo serializar el evento Kafka", e);
        }
    }
}
