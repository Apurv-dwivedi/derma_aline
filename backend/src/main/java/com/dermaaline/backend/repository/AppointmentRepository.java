package com.dermaaline.backend.repository;

import com.dermaaline.backend.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    boolean existsByAppointmentDateAndTreatmentName(LocalDateTime appointmentDate, String treatmentName);
    List<Appointment> findByCustomerEmailIgnoreCaseOrderByAppointmentDateDesc(String customerEmail);
    List<Appointment> findByCustomerEmailIgnoreCaseOrEmailIgnoreCaseOrderByAppointmentDateDesc(String customerEmail, String email);
}