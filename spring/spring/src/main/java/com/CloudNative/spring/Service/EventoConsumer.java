package com.CloudNative.spring.Service;

import com.CloudNative.spring.Model.Evento;
import com.CloudNative.spring.Repository.EventoRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class EventoConsumer {

    private final EventoRepository eventoRepository;

    public EventoConsumer(EventoRepository eventoRepository) {
        this.eventoRepository = eventoRepository;
    }

    @RabbitListener(queues = "q.eventos.procesamiento")
    @Transactional
    public void procesarEvento(Long eventoId) {

        System.out.println(
                "Recibido evento para procesamiento. ID: " + eventoId
        );

        Evento evento = eventoRepository.findById(eventoId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "No se encontró el evento ID: " + eventoId
                        )
                );

        // Evitar procesar nuevamente un evento ya completado
        if ("PROCESADO".equals(evento.getEstado())) {
            System.out.println(
                    "El evento ya estaba procesado. ID: " + eventoId
            );
            return;
        }

        // Aquí se ejecuta la lógica de procesamiento del evento
        evento.setEstado("PROCESADO");
        evento.setFechaProcesamiento(LocalDateTime.now());

        eventoRepository.save(evento);

        System.out.println(
                "Evento procesado correctamente. ID: " + eventoId
        );
    }
}
