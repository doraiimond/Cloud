package com.CloudNative.spring.kafka.dto;

import java.time.Instant;

public record KafkaNotificationDto(
        String eventId,
        String canal,
        String destinatario,
        String mensaje,
        Instant creadoEn) {

    public void validate() {
        if (eventId == null || eventId.isBlank()) throw new IllegalArgumentException("eventId es obligatorio");
        if (canal == null || canal.isBlank()) throw new IllegalArgumentException("canal es obligatorio");
        if (mensaje == null || mensaje.isBlank()) throw new IllegalArgumentException("mensaje es obligatorio");
    }
}
