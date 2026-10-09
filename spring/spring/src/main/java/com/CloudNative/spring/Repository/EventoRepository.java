package com.CloudNative.spring.Repository;

import com.CloudNative.spring.Model.Evento;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventoRepository extends JpaRepository<Evento, Long> {
}