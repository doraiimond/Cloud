package com.CloudNative.spring.kafka.dto;

import java.time.Instant;
import java.util.UUID;

public record KafkaEventDto(
        String eventId,
        String tipoEvento,
        String entidad,
        String operacion,
        String detalle,
        Instant ocurridoEn) {

    public static KafkaEventDto of(
            Long eventId,
            String tipoEvento,
            String entidad,
            String operacion,
            String detalle) {
        return new KafkaEventDto(
                eventId == null ? UUID.randomUUID().toString() : String.valueOf(eventId),
                tipoEvento,
                entidad,
                operacion,
                detalle,
                Instant.now());
    }

    public void validate() {
        if (eventId == null || eventId.isBlank()) throw new IllegalArgumentException("eventId es obligatorio");
        if (tipoEvento == null || tipoEvento.isBlank()) throw new IllegalArgumentException("tipoEvento es obligatorio");
        if (entidad == null || entidad.isBlank()) throw new IllegalArgumentException("entidad es obligatoria");
        if (operacion == null || operacion.isBlank()) throw new IllegalArgumentException("operacion es obligatoria");
    }
}
