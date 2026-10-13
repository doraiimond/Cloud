package com.CloudNative.spring.Service;

import com.CloudNative.spring.Model.Evento;
import com.CloudNative.spring.Repository.EventoRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventoService {

    private final EventoRepository eventoRepository;
    private final RabbitTemplate rabbitTemplate;

    public EventoService(
            EventoRepository eventoRepository,
            RabbitTemplate rabbitTemplate) {
        this.eventoRepository = eventoRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional
    public Evento registrarEvento(
            String tipoEvento,
            String entidad,
            String operacion,
            String detalle) {

        // 1. Guardar el evento en MySQL
        Evento evento = new Evento();
        evento.setTipoEvento(tipoEvento);
        evento.setEntidad(entidad);
        evento.setOperacion(operacion);
        evento.setEstado("PENDIENTE");
        evento.setDetalle(detalle);

        Evento guardado = eventoRepository.saveAndFlush(evento);

        // 2. Publicar para el procesamiento del evento
        rabbitTemplate.convertAndSend(
                "x.eventos",
                "evento.procesamiento",
                guardado.getId()
        );

        // 3. Publicar para las notificaciones
        rabbitTemplate.convertAndSend(
                "x.eventos",
                "evento.notificacion",
                guardado.getId()
        );

        return guardado;
    }
}
