package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.ContactMessage;
import com.dermaaline.backend.repository.ContactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contact")
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class ContactController {

    @Autowired
    private ContactRepository contactRepository;

    @GetMapping
    public ResponseEntity<List<ContactMessage>> getAllContactMessages() {
        return ResponseEntity.ok(contactRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> submitContactMessage(@RequestBody ContactMessage contactMessage) {
        try {
            contactRepository.save(contactMessage);
            return ResponseEntity.ok(Map.of("message", "Message received successfully!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to save message"));
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateContactStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return contactRepository.findById(id).map(msg -> {
            String statusStr = payload.get("status");
            if (statusStr != null) {
                try {
                    msg.setStatus(com.dermaaline.backend.entity.ContactStatus.valueOf(statusStr.trim().toUpperCase()));
                    contactRepository.save(msg);
                    return ResponseEntity.ok(Map.of("success", true, "message", "Message status updated successfully"));
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid status value"));
                }
            }
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Status is required"));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Message not found")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteContactMessage(@PathVariable Long id) {
        return contactRepository.findById(id).map(msg -> {
            contactRepository.delete(msg);
            return ResponseEntity.ok(Map.of("success", true, "message", "Message deleted successfully"));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Message not found")));
    }
}
