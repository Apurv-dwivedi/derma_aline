package com.dermaaline.backend.repository;

import com.dermaaline.backend.entity.Appointment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    boolean existsByAppointmentDateAndTreatmentName(LocalDateTime appointmentDate, String treatmentName);
    List<Appointment> findByCustomerEmailIgnoreCaseOrderByAppointmentDateDesc(String customerEmail);
    List<Appointment> findByCustomerEmailIgnoreCaseOrEmailIgnoreCaseOrderByAppointmentDateDesc(String customerEmail, String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a WHERE a.appointmentDate >= :dayStart AND a.appointmentDate < :dayEnd AND UPPER(a.status) IN ('PENDING', 'CONFIRMED')")
    List<Appointment> findActiveDayBookingsForUpdate(@Param("dayStart") LocalDateTime dayStart, @Param("dayEnd") LocalDateTime dayEnd);

    @Query("SELECT a FROM Appointment a WHERE a.appointmentDate >= :dayStart AND a.appointmentDate < :dayEnd AND UPPER(a.status) IN ('PENDING', 'CONFIRMED')")
    List<Appointment> findActiveDayBookings(@Param("dayStart") LocalDateTime dayStart, @Param("dayEnd") LocalDateTime dayEnd);
}