package com.dermaaline.backend.repository;
import com.dermaaline.backend.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByUserId(Long userId);
    
    // Prevent double booking constraint
    boolean existsByAppointmentDateAndAppointmentTimeAndTreatmentName(LocalDate date, String time, String treatment);
}