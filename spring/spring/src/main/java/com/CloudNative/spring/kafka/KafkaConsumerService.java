package com.CloudNative.spring.kafka;

import com.CloudNative.spring.kafka.dto.KafkaEventDto;
import com.CloudNative.spring.kafka.dto.KafkaNotificationDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicLong;

@Service
public class KafkaConsumerService {
    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerService.class);

    private final ObjectMapper mapper;
    private final AtomicLong eventsConsumed = new AtomicLong();
    private final AtomicLong notificationsConsumed = new AtomicLong();

    public KafkaConsumerService(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @KafkaListener(topics = "${app.kafka.events-topic}", groupId = "cloud-events-consumer")
    public void consumeEvent(String payload) throws Exception {
        KafkaEventDto event = mapper.readValue(payload, KafkaEventDto.class);
        event.validate();
        eventsConsumed.incrementAndGet();
        log.info("Kafka event consumed eventId={} operation={}", event.eventId(), event.operacion());
    }

    @KafkaListener(topics = "${app.kafka.notifications-topic}", groupId = "cloud-notifications-consumer")
    public void consumeNotification(String payload) throws Exception {
        KafkaNotificationDto notification = mapper.readValue(payload, KafkaNotificationDto.class);
        notification.validate();
        notificationsConsumed.incrementAndGet();
        log.info("Kafka notification consumed eventId={} channel={}", notification.eventId(), notification.canal());
    }

    public long eventsConsumed() { return eventsConsumed.get(); }
    public long notificationsConsumed() { return notificationsConsumed.get(); }
}
