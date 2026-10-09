
package com.CloudNative.spring.controller;

import com.CloudNative.spring.Model.Usuario;
import com.CloudNative.spring.Repository.UsuarioRepository;
import com.CloudNative.spring.Service.EventoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final EventoService eventoService;

    public UsuarioController(
            UsuarioRepository usuarioRepository,
            EventoService eventoService) {
        this.usuarioRepository = usuarioRepository;
        this.eventoService = eventoService;
    }

    @GetMapping
    public List<Usuario> getUsuarios() {
        List<Usuario> usuarios = usuarioRepository.findAll();

        eventoService.registrar(
                "Usuario", "CONSULTADO",
                "Consulta de usuarios; resultados: " + usuarios.size());

        return usuarios;
    }

    @PostMapping
    public Usuario crearUsuario(@RequestBody Usuario usuario) {
        Usuario creado = usuarioRepository.save(usuario);

        eventoService.registrar(
                "Usuario", "CREADO",
                "Usuario creado con ID: " + creado.getId());

        return creado;
    }
}