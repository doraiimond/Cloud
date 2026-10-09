package com.CloudNative.spring.Service;

import com.CloudNative.spring.Model.Evento;
import com.CloudNative.spring.Repository.EventoRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

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

    public Evento registrar(String entidad, String operacion, String detalle) {
        Evento evento = new Evento();
        evento.setEntidad(entidad);
        evento.setOperacion(operacion);
        evento.setTipoEvento(entidad.toUpperCase() + "_" + operacion);
        evento.setEstado("PENDIENTE");
        evento.setDetalle(detalle);

        Evento guardado = eventoRepository.save(evento);

        rabbitTemplate.convertAndSend("cola1", guardado.getId());

        return guardado;
    }
}