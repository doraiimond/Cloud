package com.CloudNative.spring.kafka;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class KafkaTopics {

    private final String events;
    private final String notifications;

    public KafkaTopics(
            @Value("${app.kafka.events-topic}") String events,
            @Value("${app.kafka.notifications-topic}") String notifications) {
        this.events = events;
        this.notifications = notifications;
    }

    public String events() {
        return events;
    }

    public String notifications() {
        return notifications;
    }
}
