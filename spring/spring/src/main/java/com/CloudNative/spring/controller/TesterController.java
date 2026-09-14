package com.CloudNative.spring.controller;

import com.CloudNative.spring.Repository.TesterRepository;
import com.CloudNative.spring.Model.Tester;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController 
public class TesterController {
    
    private final TesterRepository testerRepository;
    public TesterController(TesterRepository testerRepository) {
        this.testerRepository = testerRepository;
    }
    @GetMapping ("/testers")
    public List<Tester> getTesters() {        
        return testerRepository.findAll();
    }
    
}
