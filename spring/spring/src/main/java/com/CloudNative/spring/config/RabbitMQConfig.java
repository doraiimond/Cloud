
package com.CloudNative.spring.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // EXCHANGES

    @Bean
    public TopicExchange xEventos() {
        return new TopicExchange("x.eventos", true, false);
    }

    @Bean
    public DirectExchange xDlx() {
        return new DirectExchange("x.dlx", true, false);
    }

    // COLAS QUORUM

    @Bean
    public Queue qEventosProcesamiento() {
        return QueueBuilder
                .durable("q.eventos.procesamiento")
                .quorum()
                .deadLetterExchange("x.dlx")
                .deadLetterRoutingKey("dlq.eventos")
                .build();
    }

    @Bean
    public Queue qNotificaciones() {
        return QueueBuilder
                .durable("q.notificaciones")
                .quorum()
                .deadLetterExchange("x.dlx")
                .deadLetterRoutingKey("dlq.notificaciones")
                .build();
    }

    // DEAD LETTER QUEUES

    @Bean
    public Queue qEventosDlq() {
        return QueueBuilder
                .durable("q.eventos.dlq")
                .quorum()
                .build();
    }

    @Bean
    public Queue qNotificacionesDlq() {
        return QueueBuilder
                .durable("q.notificaciones.dlq")
                .quorum()
                .build();
    }

    // BINDINGS PRINCIPALES

    @Bean
    public Binding bindingEventosProcesamiento() {
        return BindingBuilder
                .bind(qEventosProcesamiento())
                .to(xEventos())
                .with("evento.procesamiento");
    }

    @Bean
    public Binding bindingNotificaciones() {
        return BindingBuilder
                .bind(qNotificaciones())
                .to(xEventos())
                .with("evento.notificacion");
    }

    // BINDINGS DLQ

    @Bean
    public Binding bindingEventosDlq() {
        return BindingBuilder
                .bind(qEventosDlq())
                .to(xDlx())
                .with("dlq.eventos");
    }

    @Bean
    public Binding bindingNotificacionesDlq() {
        return BindingBuilder
                .bind(qNotificacionesDlq())
                .to(xDlx())
                .with("dlq.notificaciones");
    }
}
