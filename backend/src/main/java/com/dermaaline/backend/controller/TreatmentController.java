package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Treatment;
import com.dermaaline.backend.repository.TreatmentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/treatments")
public class TreatmentController {

    private final TreatmentRepository treatmentRepository;

    public TreatmentController(TreatmentRepository treatmentRepository) {
        this.treatmentRepository = treatmentRepository;
    }

    // Public Endpoint: Fetch all active treatments for the booking page
    @GetMapping
    public List<Treatment> getActiveTreatments() {
        return treatmentRepository.findByActiveTrue();
    }

    // Admin Endpoint: Add a new treatment
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Treatment> createTreatment(@RequestBody Treatment treatment) {
        return ResponseEntity.ok(treatmentRepository.save(treatment));
    }

    // Admin Endpoint: Toggle active status (Soft Delete)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deactivateTreatment(@PathVariable Long id) {
        return treatmentRepository.findById(id).map(treatment -> {
            treatment.setActive(false);
            treatmentRepository.save(treatment);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}