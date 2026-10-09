
package com.CloudNative.spring.controller;

import com.CloudNative.spring.Model.Tester;
import com.CloudNative.spring.Repository.TesterRepository;
import com.CloudNative.spring.Service.EventoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/testers")
public class TesterController {

    private final TesterRepository testerRepository;
    private final EventoService eventoService;

    public TesterController(
            TesterRepository testerRepository,
            EventoService eventoService) {
        this.testerRepository = testerRepository;
        this.eventoService = eventoService;
    }

    @GetMapping
    public List<Tester> getTesters() {
        List<Tester> testers = testerRepository.findAll();

        eventoService.registrar(
                "Tester", "CONSULTADO",
                "Consulta de testers; resultados: " + testers.size());

        return testers;
    }
}