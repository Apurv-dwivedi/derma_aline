package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @GetMapping
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        return ResponseEntity.ok(appointmentRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> createAppointment(@RequestBody Map<String, Object> payload) {
        try {
            Appointment appointment = new Appointment();
            
            // Map fields safely supporting multiple naming conventions
            String customerName = getString(payload, new String[]{"customerName", "patientName", "name"});
            String customerEmail = getString(payload, new String[]{"customerEmail", "email"});
            String customerPhone = getString(payload, new String[]{"customerPhone", "phone", "mobile"});
            String treatmentName = getString(payload, new String[]{"treatmentName", "treatment", "service"});
            
            appointment.setCustomerName(customerName != null ? customerName : "Valued Patient");
            appointment.setCustomerEmail(customerEmail != null ? customerEmail : "patient@dermaaline.com");
            appointment.setCustomerPhone(customerPhone != null ? customerPhone : "0000000000");
            appointment.setTreatmentName(treatmentName != null ? treatmentName : "General Consultation");

            String dateStr = getString(payload, new String[]{"appointmentDate", "date"});
            if (dateStr != null && !dateStr.isEmpty()) {
                appointment.setAppointmentDate(LocalDate.parse(dateStr));
            } else {
                appointment.setAppointmentDate(LocalDate.now());
            }

            String timeStr = getString(payload, new String[]{"startTime", "appointmentTime", "time"});
            if (timeStr != null && !timeStr.isEmpty()) {
                try {
                    appointment.setStartTime(LocalTime.parse(timeStr));
                } catch (Exception e) {
                    appointment.setStartTime(LocalTime.of(10, 0));
                }
            } else {
                appointment.setStartTime(LocalTime.of(10, 0));
            }
            appointment.setEndTime(appointment.getStartTime().plusMinutes(30));

            appointment.setStatus(Appointment.AppointmentStatus.PENDING);
            appointment.setPaymentStatus(Appointment.PaymentStatus.PENDING);

            String message = getString(payload, new String[]{"customerMessage", "message", "notes"});
            if (message != null) {
                appointment.setCustomerMessage(message);
            }

            Appointment savedAppointment = appointmentRepository.save(appointment);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Appointment booked successfully!",
                "appointmentId", savedAppointment.getId()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateAppointmentStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            Optional<Appointment> appointmentOpt = appointmentRepository.findById(id);
            if (appointmentOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "Appointment not found"));
            }

            Appointment appointment = appointmentOpt.get();
            String statusStr = payload.get("status");
            if (statusStr != null) {
                appointment.setStatus(Appointment.AppointmentStatus.valueOf(statusStr.toUpperCase()));
                appointmentRepository.save(appointment);
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Appointment status updated successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private String getString(Map<String, Object> map, String[] keys) {
        for (String key : keys) {
            if (map.containsKey(key) && map.get(key) != null) {
                return map.get(key).toString();
            }
        }
        return null;
    }
}