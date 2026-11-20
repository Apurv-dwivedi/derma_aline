package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.ContactMessage;
import com.dermaaline.backend.repository.ContactRepository;
import com.dermaaline.backend.security.SecuritySanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contact")
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
            if (contactMessage == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Request body cannot be empty."));
            }

            // Input Sanitization & Validation to prevent Stored XSS and injection
            String sanitizedName = SecuritySanitizer.sanitizeText(contactMessage.getName(), 100);
            String sanitizedEmail = SecuritySanitizer.sanitizeEmail(contactMessage.getEmail());
            String sanitizedPhone = SecuritySanitizer.sanitizePhone(contactMessage.getPhone());
            String sanitizedMessage = SecuritySanitizer.sanitizeText(contactMessage.getMessage(), 2000);

            if (sanitizedName == null || sanitizedName.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A valid name is required."));
            }
            if (sanitizedEmail == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A valid email address is required."));
            }
            if (sanitizedPhone == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A valid phone number is required."));
            }
            if (sanitizedMessage == null || sanitizedMessage.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Message content cannot be blank."));
            }

            contactMessage.setName(sanitizedName);
            contactMessage.setEmail(sanitizedEmail);
            contactMessage.setPhone(sanitizedPhone);
            contactMessage.setMessage(sanitizedMessage);

            contactRepository.save(contactMessage);
            return ResponseEntity.ok(Map.of("success", true, "message", "Message received successfully!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to submit message."));
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
