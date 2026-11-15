package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.entity.AppointmentStatus;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.backend.service.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public AppointmentController(AppointmentRepository appointmentRepository, UserRepository userRepository, EmailService emailService) {
        this.appointmentRepository = appointmentRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @GetMapping
    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }
    
    @GetMapping("/my")
    public ResponseEntity<List<Appointment>> getMyAppointments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        Optional<User> user = userRepository.findByEmail(auth.getName());
        if (user.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        return ResponseEntity.ok(appointmentRepository.findByUserId(user.get().getId()));
    }

    @PostMapping
    public ResponseEntity<?> createAppointment(@RequestBody Appointment appointment) {
        // 1. Prevent Double Booking
        if (appointmentRepository.existsByAppointmentDateAndAppointmentTimeAndTreatmentName(
                appointment.getAppointmentDate(), appointment.getAppointmentTime(), appointment.getTreatmentName())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("This time slot is already booked for this treatment. Please select another time.");
        }

        // 2. Link to authenticated user if logged in
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            userRepository.findByEmail(auth.getName()).ifPresent(user -> appointment.setUserId(user.getId()));
        }

        appointment.setStatus(AppointmentStatus.PENDING);
        Appointment savedAppointment = appointmentRepository.save(appointment);
        
        // 3. Asynchronous Email Handling (Swallow exception safely without blocking the response)
        new Thread(() -> {
            try {
                String subject = "New Appointment Booking - " + savedAppointment.getPatientName();
                String body = "You have a new appointment booking!\n\n" +
                              "Patient Name: " + savedAppointment.getPatientName() + "\n" +
                              "Phone: " + savedAppointment.getPhone() + "\n" +
                              "Treatment: " + savedAppointment.getTreatmentName() + "\n" +
                              "Date: " + savedAppointment.getAppointmentDate() + "\n" +
                              "Time: " + savedAppointment.getAppointmentTime() + "\n" +
                              "Status: " + savedAppointment.getStatus();
                emailService.sendEmail("admin@dermaaline.com", subject, body);
            } catch (Exception e) {
                System.err.println("Email Delivery Failed: " + e.getMessage());
            }
        }).start();

        return ResponseEntity.status(HttpStatus.CREATED).body(savedAppointment);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Appointment> updateAppointment(@PathVariable Long id, @RequestBody Appointment appointmentDetails) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        appointment.setPatientName(appointmentDetails.getPatientName());
        appointment.setTreatmentName(appointmentDetails.getTreatmentName());
        appointment.setAppointmentDate(appointmentDetails.getAppointmentDate());
        appointment.setAppointmentTime(appointmentDetails.getAppointmentTime());
        appointment.setStatus(appointmentDetails.getStatus());

        return ResponseEntity.ok(appointmentRepository.save(appointment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAppointment(@PathVariable Long id) {
        if (appointmentRepository.existsById(id)) {
            appointmentRepository.deleteById(id);
            return ResponseEntity.ok().body("Deleted successfully");
        }
        return ResponseEntity.notFound().build();
    }
}