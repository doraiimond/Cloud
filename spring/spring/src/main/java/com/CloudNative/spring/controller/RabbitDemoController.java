package com.CloudNative.spring.controller;

import java.util.Map;
import java.util.UUID;

import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/rabbitmq")
public class RabbitDemoController {

    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.demo.enabled:false}")
    private boolean demoEnabled;

    public RabbitDemoController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @PostMapping("/test")
    public ResponseEntity<?> generar(
            @RequestBody Map<String, Integer> body) {

        if (!demoEnabled) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Modo demostración deshabilitado"));
        }

        Integer cantidad = body.get("cantidad");

        if (cantidad == null || cantidad < 1 || cantidad > 100) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Cantidad permitida: 1 a 100")
            );
        }

        try {
            for (int i = 0; i < cantidad; i++) {
                String mensaje = "DEMO-" + UUID.randomUUID();

                rabbitTemplate.convertAndSend(
                        "",
                        "q.demo",
                        mensaje
                );
            }

            return ResponseEntity.ok(Map.of(
                    "mensaje", cantidad + " mensajes enviados al broker",
                    "cantidad", cantidad,
                    "cola", "q.demo"
            ));

        } catch (Exception e) {
            return ResponseEntity.status(502).body(
                    Map.of("error", "Error publicando mensajes de prueba")
            );
        }
    }

    @RabbitListener(queuesToDeclare = @Queue(
            name = "q.demo",
            durable = "true"
    ))
    public void consumir(String mensaje) {
        System.out.println("RabbitMQ DEMO recibió: " + mensaje);
    }
}
