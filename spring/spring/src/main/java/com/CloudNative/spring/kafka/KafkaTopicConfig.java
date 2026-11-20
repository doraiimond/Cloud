package com.CloudNative.spring.kafka;

import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KafkaTopicConfig {

    @Bean
    NewTopic eventsTopic(
            KafkaTopics topics,
            @Value("${app.kafka.partitions:3}") int partitions,
            @Value("${app.kafka.replication-factor:1}") short replicationFactor) {
        return new NewTopic(topics.events(), partitions, replicationFactor);
    }

    @Bean
    NewTopic notificationsTopic(
            KafkaTopics topics,
            @Value("${app.kafka.partitions:3}") int partitions,
            @Value("${app.kafka.replication-factor:1}") short replicationFactor) {
        return new NewTopic(topics.notifications(), partitions, replicationFactor);
    }

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper;
    }
}