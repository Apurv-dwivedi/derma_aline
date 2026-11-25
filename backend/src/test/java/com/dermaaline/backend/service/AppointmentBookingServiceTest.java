package com.dermaaline.backend.service;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.entity.AppointmentSlotLock;
import com.dermaaline.backend.entity.Treatment;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.AppointmentSlotLockRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.TreatmentRecordRepository;
import com.dermaaline.backend.repository.TreatmentRepository;
import com.dermaaline.backend.service.AppointmentBookingService.BookingConflictException;
import com.dermaaline.backend.service.AppointmentBookingService.BookingValidationException;
import com.dermaaline.backend.service.AppointmentBookingService.ForbiddenAppointmentAccessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AppointmentBookingServiceTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private AppointmentSlotLockRepository slotLockRepository;

    @Mock
    private AppointmentSlotLockService slotLockService;

    @Mock
    private TreatmentRepository treatmentRepository;

    @Mock
    private TreatmentRecordRepository treatmentRecordRepository;

    @Mock
    private CustomerRepository customerRepository;

    @InjectMocks
    private AppointmentBookingService bookingService;

    private LocalDate futureDate;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(bookingService, "maxPerSlot", 1);
        ReflectionTestUtils.setField(bookingService, "openHour", 10);
        ReflectionTestUtils.setField(bookingService, "closeHour", 20);
        ReflectionTestUtils.setField(bookingService, "clinicTimezone", "Asia/Kolkata");
        futureDate = LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(3);
        lenient().when(slotLockRepository.findLockedBySlotKey(anyString()))
                .thenReturn(Optional.of(new AppointmentSlotLock("slot")));
    }

    @Test
    void testCreateBookingRejectsPastDate() {
        String pastDate = LocalDate.now(ZoneId.of("Asia/Kolkata")).minusDays(1).toString();
        assertThrows(BookingValidationException.class, () ->
                bookingService.createBooking("Alice", "alice@example.com", "9876543210",
                        "HydraFacial", pastDate, "11:00 AM", "", true));
    }

    @Test
    void testCreateBookingRejectsOutsideOperatingHours() {
        assertThrows(BookingValidationException.class, () ->
                bookingService.createBooking("Alice", "alice@example.com", "9876543210",
                        "HydraFacial", futureDate.toString(), "22:00", "", true));
    }

    @Test
    void testCreateBookingRejectsInactiveTreatment() {
        Treatment inactive = new Treatment();
        inactive.setName("Discontinued Peel");
        inactive.setActive(false);

        when(treatmentRepository.findByNameIgnoreCase("Discontinued Peel")).thenReturn(Optional.of(inactive));

        assertThrows(BookingValidationException.class, () ->
                bookingService.createBooking("Alice", "alice@example.com", "9876543210",
                        "Discontinued Peel", futureDate.toString(), "11:00 AM", "", true));
    }

    @Test
    void testDuplicateBookingSameEmailAndNormalizedTimeRejected() {
        Appointment existing = new Appointment();
        existing.setId(1L);
        existing.setCustomerEmail("alice@example.com");
        existing.setAppointmentDate(futureDate.atTime(13, 30));
        existing.setAppointmentTime("13:30");
        existing.setStatus("PENDING");

        when(appointmentRepository.findActiveDayBookings(any(), any())).thenReturn(List.of(existing));

        assertThrows(BookingConflictException.class, () ->
                bookingService.createBooking("Alice", "alice@example.com", "9876543210",
                        "Carbon Laser Peel", futureDate.toString(), "01:30 PM", "", true));
    }

    @Test
    void testSlotCapacityExceededRejectedEvenForDifferentCustomer() {
        Appointment existing = new Appointment();
        existing.setId(2L);
        existing.setCustomerEmail("first@example.com");
        existing.setTreatmentName("Carbon Laser Peel");
        existing.setAppointmentDate(futureDate.atTime(15, 0));
        existing.setAppointmentTime("03:00 PM");
        existing.setStatus("CONFIRMED");

        when(appointmentRepository.findActiveDayBookings(any(), any())).thenReturn(List.of(existing));

        assertThrows(BookingConflictException.class, () ->
                bookingService.createBooking("Second Client", "second@example.com", "9876543210",
                        "Carbon Laser Peel", futureDate.toString(), "15:00", "", true));
    }

    @Test
    void testDifferentTreatmentsAtSameTimeSlotAllowedForDistinctClients() {
        Appointment existing = new Appointment();
        existing.setId(3L);
        existing.setCustomerEmail("first@example.com");
        existing.setTreatmentName("HydraFacial Glow");
        existing.setAppointmentDate(futureDate.atTime(11, 0));
        existing.setAppointmentTime("11:00 AM");
        existing.setStatus("CONFIRMED");

        when(appointmentRepository.findActiveDayBookings(any(), any())).thenReturn(List.of(existing));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> {
            Appointment saved = inv.getArgument(0);
            saved.setId(99L);
            return saved;
        });

        Appointment booked = bookingService.createBooking("Second Client", "second@example.com", "9876543210",
                "Carbon Laser Peel", futureDate.toString(), "11:00 AM", "", true);

        assertNotNull(booked);
        assertEquals("Carbon Laser Peel", booked.getTreatmentName());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testGetDateAvailabilityFiltersByTreatmentName() {
        Appointment existing = new Appointment();
        existing.setId(4L);
        existing.setCustomerEmail("first@example.com");
        existing.setTreatmentName("HydraFacial Glow");
        existing.setAppointmentDate(futureDate.atTime(11, 0));
        existing.setAppointmentTime("11:00 AM");
        existing.setStatus("CONFIRMED");

        when(appointmentRepository.findActiveDayBookings(any(), any())).thenReturn(List.of(existing));

        java.util.Map<String, Object> hydraAvail = bookingService.getDateAvailability(futureDate.toString(), "HydraFacial Glow");
        java.util.Map<String, Boolean> hydraSlots = (java.util.Map<String, Boolean>) hydraAvail.get("slots");
        assertFalse(hydraSlots.get("11:00 AM"), "HydraFacial Glow at 11:00 AM must be unavailable");

        java.util.Map<String, Object> peelAvail = bookingService.getDateAvailability(futureDate.toString(), "Carbon Laser Peel");
        java.util.Map<String, Boolean> peelSlots = (java.util.Map<String, Boolean>) peelAvail.get("slots");
        assertTrue(peelSlots.get("11:00 AM"), "Carbon Laser Peel at 11:00 AM must remain available");
    }

    @Test
    void testLockAcquisitionFailureTranslatesCleanlyToBookingConflict() {
        when(slotLockRepository.findLockedBySlotKey(anyString()))
                .thenThrow(new CannotAcquireLockException("Simulated DB lock timeout"));

        assertThrows(BookingConflictException.class, () ->
                bookingService.createBooking("Client Lock", "lock@example.com", "9876543210",
                        "HydraFacial", futureDate.toString(), "11:00 AM", "", true));

        verify(appointmentRepository, never()).save(any());
    }

    @Test
    void testCustomerCancellationOwnershipAndTerminalTransitionGuards() {
        Appointment owned = new Appointment();
        owned.setId(50L);
        owned.setCustomerEmail("owner@example.com");
        owned.setAppointmentDate(futureDate.atTime(12, 0));
        owned.setAppointmentTime("12:00 PM");
        owned.setStatus("CONFIRMED");

        when(appointmentRepository.findById(50L)).thenReturn(Optional.of(owned));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        // IDOR attempt by another user fails
        assertThrows(ForbiddenAppointmentAccessException.class, () ->
                bookingService.cancelCustomerAppointment(50L, "attacker@example.com"));

        // Owner cancellation succeeds
        Appointment cancelled = bookingService.cancelCustomerAppointment(50L, "owner@example.com");
        assertEquals("CANCELLED", cancelled.getStatus());

        // Cannot transition cancelled appointment back to confirmed
        assertThrows(BookingConflictException.class, () ->
                bookingService.transitionStatus(50L, "CONFIRMED", "Staff"));
    }
}
