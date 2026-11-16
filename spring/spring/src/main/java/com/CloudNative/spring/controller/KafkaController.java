package com.CloudNative.spring.controller;

import com.CloudNative.spring.kafka.KafkaAdminService;
import com.CloudNative.spring.kafka.KafkaConsumerService;
import com.CloudNative.spring.kafka.KafkaProducerService;
import com.CloudNative.spring.kafka.KafkaTopics;
import com.CloudNative.spring.kafka.dto.KafkaEventDto;
import com.CloudNative.spring.kafka.dto.KafkaNotificationDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/kafka")
public class KafkaController {
    private final KafkaAdminService admin;
    private final KafkaProducerService producer;
    private final KafkaConsumerService consumer;
    private final KafkaTopics topics;

    public KafkaController(KafkaAdminService admin, KafkaProducerService producer,
                           KafkaConsumerService consumer, KafkaTopics topics) {
        this.admin = admin;
        this.producer = producer;
        this.consumer = consumer;
        this.topics = topics;
    }

    @GetMapping("/monitor")
    public ResponseEntity<?> monitor() {
        try {
            return ResponseEntity.ok(Map.of(
                    "topics", admin.topics(),
                    "consumerGroups", admin.consumerGroups(),
                    "consumed", Map.of(
                            "events", consumer.eventsConsumed(),
                            "notifications", consumer.notificationsConsumed())
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "No se pudo consultar Kafka", "detail", e.getClass().getSimpleName()));
        }
    }

    @GetMapping("/topics")
    public ResponseEntity<?> topics() {
        try { return ResponseEntity.ok(admin.topics()); }
        catch (Exception e) { return failure(e); }
    }

    @PostMapping("/topics")
    public ResponseEntity<?> createTopic(@RequestParam String name,
                                         @RequestParam(defaultValue = "3") int partitions,
                                         @RequestParam(defaultValue = "1") short replicationFactor) {
        try {
            admin.create(name, partitions, replicationFactor);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("created", name));
        } catch (Exception e) { return failure(e); }
    }

    @PutMapping("/topics/{name}/retention")
    public ResponseEntity<?> retention(@PathVariable String name, @RequestParam long retentionMs) {
        try {
            admin.updateRetention(name, retentionMs);
            return ResponseEntity.ok(Map.of("updated", name, "retentionMs", retentionMs));
        } catch (Exception e) { return failure(e); }
    }

    @DeleteMapping("/topics/{name}")
    public ResponseEntity<?> deleteTopic(@PathVariable String name) {
        try {
            admin.delete(name);
            return ResponseEntity.noContent().build();
        } catch (Exception e) { return failure(e); }
    }

    @GetMapping("/consumer-groups")
    public ResponseEntity<?> consumerGroups() {
        try { return ResponseEntity.ok(admin.consumerGroups()); }
        catch (Exception e) { return failure(e); }
    }

    @PostMapping("/test")
    public ResponseEntity<?> test(@RequestBody(required = false) DemoRequest request) {
        DemoRequest demo = request == null ? new DemoRequest(null, 1) : request;
        int count = Math.max(1, Math.min(100, demo.cantidad()));
        for (int i = 0; i < count; i++) {
            String id = "KAFKA-DEMO-" + Instant.now().toEpochMilli() + "-" + i;
            KafkaEventDto event = KafkaEventDto.of((long) (id.hashCode() & Integer.MAX_VALUE),
                    "DEMO_KAFKA", "mensajeria", "PUBLICAR", "Mensaje de prueba " + id);
            producer.publishEvent(event);
            producer.publishNotification(new KafkaNotificationDto(
                    event.eventId(), "DEMO", "frontend", "Notificación " + id, Instant.now()));
        }
        return ResponseEntity.accepted().body(Map.of(
                "mensaje", count + " eventos publicados en los dos tópicos Kafka",
                "topics", Map.of("events", topics.events(), "notifications", topics.notifications()),
                "cantidad", count));
    }

    private ResponseEntity<Map<String, String>> failure(Exception e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("error", "Operación Kafka no disponible", "detail", e.getClass().getSimpleName()));
    }

    public record DemoRequest(String topic, int cantidad) {}
}
