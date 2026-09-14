package com.CloudNative.spring.Repository;

import com.CloudNative.spring.Model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
}
