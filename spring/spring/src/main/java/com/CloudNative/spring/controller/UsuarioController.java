package com.CloudNative.spring.controller;

import com.CloudNative.spring.Repository.UsuarioRepository;
import com.CloudNative.spring.Model.Usuario;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController 
public class UsuarioController {
    
    private final UsuarioRepository usuarioRepository;
    public UsuarioController(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }
    @GetMapping ("/usuarios")
    public List<Usuario> getUsuarios() {        
        return usuarioRepository.findAll();
    }
    
}
