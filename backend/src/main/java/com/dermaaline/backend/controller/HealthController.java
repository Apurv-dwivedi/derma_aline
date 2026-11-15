package com.dermaaline.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@CrossOrigin(origins = "*")
public class HealthController {

    @GetMapping
    public ResponseEntity<String> checkHealth() {
        // Cloud providers ping this endpoint to verify the backend didn't crash
        return ResponseEntity.ok("Derma Aline API is Live and Healthy!");
    }
}