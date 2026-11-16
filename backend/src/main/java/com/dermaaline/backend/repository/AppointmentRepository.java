package com.dermaaline.backend.repository;

import com.dermaaline.backend.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByAppointmentDate(LocalDate appointmentDate);
    List<Appointment> findByCustomerEmail(String customerEmail);

    // Strict LocalTime matching entity property type
    boolean existsByAppointmentDateAndStartTimeAndTreatmentName(LocalDate appointmentDate, LocalTime startTime, String treatmentName);
}