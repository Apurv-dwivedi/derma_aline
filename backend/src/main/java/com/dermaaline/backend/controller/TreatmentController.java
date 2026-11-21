package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Treatment;
import com.dermaaline.backend.repository.TreatmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/treatments")
public class TreatmentController {

    @Autowired
    private TreatmentRepository treatmentRepository;

    @Autowired
    private com.dermaaline.backend.service.AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<List<Treatment>> getAllTreatments() {
        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=120, stale-while-revalidate=300")
                .body(treatmentRepository.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Treatment>> getActiveTreatments() {
        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=120, stale-while-revalidate=300")
                .body(treatmentRepository.findByActiveTrue());
    }

    @PostMapping
    public ResponseEntity<?> createTreatment(@RequestBody Treatment treatment) {
        try {
            Treatment saved = treatmentRepository.save(treatment);
            if (auditLogService != null) {
                auditLogService.record("TREATMENT_CREATED", "admin", "SUPER_ADMIN", "TREATMENT", saved.getId().toString(), "Created treatment section entry: " + saved.getName());
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Treatment created successfully", "id", saved.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTreatment(@PathVariable Long id, @RequestBody Treatment details) {
        Optional<Treatment> opt = treatmentRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Treatment not found"));
        }
        Treatment t = opt.get();
        t.setName(details.getName());
        t.setCategory(details.getCategory());
        t.setDescription(details.getDescription());
        t.setPrice(details.getPrice());
        t.setDurationMinutes(details.getDurationMinutes());
        t.setActive(details.isActive());
        if (details.getImageUrl() != null) {
            t.setImageUrl(details.getImageUrl());
        }
        
        treatmentRepository.save(t);
        if (auditLogService != null) {
            auditLogService.record("TREATMENT_UPDATED", "admin", "SUPER_ADMIN", "TREATMENT", id.toString(), "Updated treatment details for: " + t.getName());
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Treatment updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTreatment(@PathVariable Long id) {
        if (!treatmentRepository.existsById(id)) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Treatment not found"));
        }
        treatmentRepository.deleteById(id);
        if (auditLogService != null) {
            auditLogService.record("TREATMENT_DELETED", "admin", "SUPER_ADMIN", "TREATMENT", id.toString(), "Deleted treatment ID: " + id);
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Treatment deleted successfully"));
    }
}