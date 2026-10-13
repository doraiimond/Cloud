package com.CloudNative.spring.controller;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/v1/rabbitmq")
public class RabbitController {

    private final RestClient rabbitClient;

    public RabbitController(
            @Value("${rabbitmq.management.url}") String url,
            @Value("${rabbitmq.management.username}") String username,
            @Value("${rabbitmq.management.password}") String password) {

        String credentials = username + ":" + password;

        String basicAuth = Base64.getEncoder().encodeToString(
                credentials.getBytes(StandardCharsets.UTF_8)
        );

        this.rabbitClient = RestClient.builder()
                .baseUrl(url)
                .defaultHeader(
                        HttpHeaders.AUTHORIZATION,
                        "Basic " + basicAuth
                )
                .build();
    }

    @GetMapping("/monitor")
    public ResponseEntity<?> monitor() {
        try {
            Object nodes = rabbitClient.get()
                    .uri("/api/nodes")
                    .retrieve()
                    .body(Object.class);

            Object queues = rabbitClient.get()
                    .uri("/api/queues")
                    .retrieve()
                    .body(Object.class);

            Object exchanges = rabbitClient.get()
                    .uri("/api/exchanges")
                    .retrieve()
                    .body(Object.class);

            Object bindings = rabbitClient.get()
                    .uri("/api/bindings")
                    .retrieve()
                    .body(Object.class);

            return ResponseEntity.ok(Map.of(
                    "nodes", nodes,
                    "queues", queues,
                    "exchanges", exchanges,
                    "bindings", bindings
            ));

        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of(
                    "error", "No se pudo consultar RabbitMQ Management"
            ));
        }
    }
}
