package com.CloudNative.spring.Service;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class NotificacionConsumer {

    @RabbitListener(queues = "q.notificaciones")
    public void procesarNotificacion(Long eventoId) {

        System.out.println(
                "Notificación recibida para el evento ID: " + eventoId
        );

        // Aquí irá la lógica real de notificación.
        // Por ahora, simulamos que la notificación se procesó.

        System.out.println(
                "Notificación procesada correctamente para el evento ID: "
                        + eventoId
        );
    }
}
