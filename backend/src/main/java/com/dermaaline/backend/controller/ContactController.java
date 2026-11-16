package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.ContactMessage;
import com.dermaaline.backend.repository.ContactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/contact")
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class ContactController {

    @Autowired
    private ContactRepository contactRepository;

    @PostMapping
    public ResponseEntity<?> submitContactMessage(@RequestBody ContactMessage contactMessage) {
        try {
            contactRepository.save(contactMessage);
            return ResponseEntity.ok(Map.of("message", "Message received successfully!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to save message"));
        }
    }
}