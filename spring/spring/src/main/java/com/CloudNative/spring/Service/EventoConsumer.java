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

    @RabbitListener(queues = "cola1")
    @Transactional
    public void procesar(Long eventoId) {
        Evento evento = eventoRepository.findById(eventoId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "No existe el evento " + eventoId));

        evento.setEstado("PROCESADO");
        evento.setFechaProcesamiento(LocalDateTime.now());
        eventoRepository.save(evento);

        System.out.println(
                "EVENTO PROCESADO: " + evento.getTipoEvento()
                        + " | ID: " + evento.getId());
    }
}