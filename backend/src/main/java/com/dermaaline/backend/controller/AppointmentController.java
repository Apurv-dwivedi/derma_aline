package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.service.AppointmentBookingService;
import com.dermaaline.backend.service.AppointmentBookingService.AppointmentNotFoundException;
import com.dermaaline.backend.service.AppointmentBookingService.BookingConflictException;
import com.dermaaline.backend.service.AppointmentBookingService.BookingValidationException;
import com.dermaaline.backend.service.AuditLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private static final Logger logger = LoggerFactory.getLogger(AppointmentController.class);

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private AppointmentBookingService appointmentBookingService;

    @Autowired(required = false)
    private AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        List<Appointment> appointments = appointmentRepository.findAll();
        return ResponseEntity.ok(appointments);
    }

    /**
     * Public anonymous slot availability check (returns zero PII).
     */
    @GetMapping("/availability")
    @PreAuthorize("permitAll()")
    public ResponseEntity<?> getSlotAvailability(
            @RequestParam("date") String date,
            @RequestParam(value = "treatmentName", required = false) String treatmentName) {
        try {
            return ResponseEntity.ok(appointmentBookingService.getDateAvailability(date, treatmentName));
        } catch (BookingValidationException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error checking appointment availability", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Unable to retrieve slot availability."));
        }
    }

    /**
     * Authenticated client appointments lookup endpoint
     */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Appointment>> getMyAppointments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        String email = auth.getName().trim().toLowerCase();
        List<Appointment> appointments = appointmentRepository
                .findByCustomerEmailIgnoreCaseOrEmailIgnoreCaseOrderByAppointmentDateDesc(email, email);
        return ResponseEntity.ok(appointments);
    }

    @PostMapping
    @PreAuthorize("permitAll()")
    public ResponseEntity<?> createAppointment(@RequestBody(required = false) Map<String, Object> payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Request body cannot be empty."));
        }
        try {
            Object pNameObj = payload.getOrDefault("patientName", payload.get("customerName"));
            String rawPatientName = pNameObj != null ? pNameObj.toString() : null;

            Object emailObj = payload.getOrDefault("email", payload.get("customerEmail"));
            String rawEmail = emailObj != null ? emailObj.toString() : null;

            Object phoneObj = payload.getOrDefault("phone", payload.get("customerPhone"));
            String rawPhone = phoneObj != null ? phoneObj.toString() : null;

            Object treatmentObj = payload.get("treatmentName");
            String rawTreatmentName = treatmentObj != null ? treatmentObj.toString() : null;

            Object dateObj = payload.get("appointmentDate");
            String dateStr = dateObj != null ? dateObj.toString() : null;

            Object timeObj = payload.get("appointmentTime");
            String timeStr = timeObj != null ? timeObj.toString() : null;

            Object notesObj = payload.get("notes");
            String rawNotes = notesObj != null ? notesObj.toString() : "";

            Appointment saved = appointmentBookingService.createBooking(
                    rawPatientName, rawEmail, rawPhone, rawTreatmentName, dateStr, timeStr, rawNotes, true);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Appointment booked successfully!",
                "appointmentId", saved.getId()
            ));
        } catch (BookingValidationException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (BookingConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Failed to book appointment", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Failed to book appointment."
            ));
        }
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('STAFF', 'SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateAppointmentStatus(@PathVariable Long id, @RequestBody(required = false) Map<String, String> payload) {
        try {
            String newStatus = payload != null ? payload.get("status") : null;
            Appointment saved = appointmentBookingService.transitionStatus(id, newStatus, "Derma Aline Specialist");
            if (auditLogService != null) {
                auditLogService.record("APPOINTMENT_STATUS_UPDATED", getActorEmail(), "STAFF_OR_ADMIN", "APPOINTMENT",
                        id.toString(), "Status changed to " + saved.getStatus());
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Appointment status updated successfully"));
        } catch (AppointmentNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", e.getMessage()));
        } catch (BookingValidationException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (BookingConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error updating appointment status for ID {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "Error updating appointment status."));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF', 'SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateAppointment(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Request body cannot be empty."));
        }
        try {
            Object pNameObj = payload.containsKey("patientName") ? payload.get("patientName") : payload.get("customerName");
            String patientName = pNameObj != null ? pNameObj.toString() : null;

            Object emailObj = payload.containsKey("email") ? payload.get("email") : payload.get("customerEmail");
            String email = emailObj != null ? emailObj.toString() : null;

            Object phoneObj = payload.containsKey("phone") ? payload.get("phone") : payload.get("customerPhone");
            String phone = phoneObj != null ? phoneObj.toString() : null;

            Object treatmentObj = payload.get("treatmentName");
            String treatmentName = treatmentObj != null ? treatmentObj.toString() : null;

            Object dateObj = payload.get("appointmentDate");
            String dateStr = dateObj != null ? dateObj.toString() : null;

            Object timeObj = payload.get("appointmentTime");
            String timeStr = timeObj != null ? timeObj.toString() : null;

            Object statusObj = payload.get("status");
            String status = statusObj != null ? statusObj.toString() : null;

            Object notesObj = payload.get("notes");
            String notes = notesObj != null ? notesObj.toString() : null;

            appointmentBookingService.updateAppointmentDetails(
                    id, patientName, email, phone, treatmentName, dateStr, timeStr, status, notes, "Derma Aline Specialist");

            if (auditLogService != null) {
                auditLogService.record("APPOINTMENT_UPDATED", getActorEmail(), "STAFF_OR_ADMIN", "APPOINTMENT",
                        id.toString(), "Updated appointment details");
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Appointment updated successfully"));
        } catch (AppointmentNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", e.getMessage()));
        } catch (BookingValidationException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (BookingConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error updating appointment ID {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "Error updating appointment."));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> deleteAppointment(@PathVariable Long id) {
        return appointmentRepository.findById(id).map(appointment -> {
            appointmentRepository.delete(appointment);
            if (auditLogService != null) {
                auditLogService.record("APPOINTMENT_DELETED", getActorEmail(), "ADMIN", "APPOINTMENT",
                        id.toString(), "Deleted appointment record");
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Appointment deleted successfully"));
        }).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "Appointment not found")));
    }

    private String getActorEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null) ? auth.getName() : "admin";
    }
}
