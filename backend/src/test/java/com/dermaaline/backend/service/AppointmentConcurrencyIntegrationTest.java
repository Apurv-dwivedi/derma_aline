package com.dermaaline.backend.service;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.AppointmentSlotLockRepository;
import com.dermaaline.backend.service.AppointmentBookingService.BookingConflictException;
import derma_aline.BackendApplication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = BackendApplication.class)
@ActiveProfiles("test")
public class AppointmentConcurrencyIntegrationTest {

    @Autowired
    private AppointmentBookingService bookingService;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private AppointmentSlotLockRepository slotLockRepository;

    @Autowired
    private org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    private LocalDate futureDate;

    @BeforeEach
    void setUp() {
        appointmentRepository.deleteAll();
        slotLockRepository.deleteAll();
        ReflectionTestUtils.setField(bookingService, "maxPerSlot", 1);
        futureDate = LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(5);
    }

    @Test
    void testTwoSimultaneousRequestsOnEmptySlotWithDatabaseRowLock() throws Exception {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger conflictCount = new AtomicInteger();

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            final int idx = i;
            futures.add(executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    bookingService.createBooking("Client " + idx, "empty" + idx + "@example.com", "987654321" + idx,
                            "HydraFacial Glow", futureDate.toString(), "11:00 AM", "", true);
                    successCount.incrementAndGet();
                } catch (BookingConflictException e) {
                    conflictCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        ready.await();
        start.countDown();
        for (Future<?> f : futures) {
            f.get();
        }
        executor.shutdown();

        assertEquals(1, successCount.get(), "Only one concurrent booking may succeed on empty slot when capacity=1");
        assertEquals(1, conflictCount.get(), "Second concurrent booking must hit database lock conflict");
        assertEquals(1, appointmentRepository.findAll().size());
        assertTrue(slotLockRepository.existsById(
                AppointmentBookingService.buildTreatmentSlotKey(futureDate, java.time.LocalTime.of(11, 0), "HydraFacial Glow")));
    }

    @Test
    void testHighConcurrencyBurstAcrossSimulatedInstancesAndCapacityTwo() throws Exception {
        ReflectionTestUtils.setField(bookingService, "maxPerSlot", 2);

        int threads = 6;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger conflictCount = new AtomicInteger();

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            final int idx = i;
            futures.add(executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    bookingService.createBooking("Guest " + idx, "burst" + idx + "@example.com", "998877660" + idx,
                            "Carbon Laser Peel", futureDate.toString(), "03:00 PM", "", true);
                    successCount.incrementAndGet();
                } catch (BookingConflictException e) {
                    conflictCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        ready.await();
        start.countDown();
        for (Future<?> f : futures) {
            f.get();
        }
        executor.shutdown();

        assertEquals(2, successCount.get(), "Exactly two concurrent bookings should succeed when maxPerSlot=2");
        assertEquals(4, conflictCount.get(), "Remaining four requests must be rejected atomically");
        assertEquals(2, appointmentRepository.findAll().size());
    }

    @Test
    void testConcurrentDuplicateBookingBySameCustomerBlockedEvenWhenCapacityAllowsMultiple() throws Exception {
        ReflectionTestUtils.setField(bookingService, "maxPerSlot", 2);

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger conflictCount = new AtomicInteger();

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            futures.add(executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    bookingService.createBooking("Same Client", "dup@example.com", "9876543210",
                            "HydraFacial Glow", futureDate.toString(), "04:30 PM", "", true);
                    successCount.incrementAndGet();
                } catch (BookingConflictException e) {
                    conflictCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        ready.await();
        start.countDown();
        for (Future<?> f : futures) {
            f.get();
        }
        executor.shutdown();

        assertEquals(1, successCount.get());
        assertEquals(1, conflictCount.get());
        assertEquals(1, appointmentRepository.findAll().size());
    }

    @Test
    void testCancellationFreesCapacityForImmediateRebooking() {
        Appointment booked = bookingService.createBooking("Client A", "clienta@example.com", "9876543210",
                "Hair GFC + PRP", futureDate.toString(), "12:00 PM", "", true);

        // Slot full while active
        assertThrows(BookingConflictException.class, () ->
                bookingService.createBooking("Client B", "clientb@example.com", "9876543211",
                        "Hair GFC + PRP", futureDate.toString(), "12:00 PM", "", true));

        // Cancel frees slot
        Appointment cancelled = bookingService.cancelCustomerAppointment(booked.getId(), "clienta@example.com");
        assertEquals("CANCELLED", cancelled.getStatus());

        // Same customer or new customer can rebook freed slot
        Appointment rebooked = bookingService.createBooking("Client A", "clienta@example.com", "9876543210",
                "Hair GFC + PRP", futureDate.toString(), "12:00 PM", "", true);
        assertNotNull(rebooked.getId());
        assertEquals("PENDING", rebooked.getStatus());
    }

    @Test
    void testTransactionRollbackLeavesZeroOrphanedRowsAndReleasesSlot() {
        assertThrows(RuntimeException.class, () ->
                transactionTemplate.execute(status -> {
                    Appointment a = new Appointment();
                    a.setCustomerName("Temp Tx");
                    a.setPatientName("Temp Tx");
                    a.setCustomerEmail("tx@example.com");
                    a.setEmail("tx@example.com");
                    a.setTreatmentName("HydraFacial Glow");
                    a.setAppointmentDate(futureDate.atTime(17, 30));
                    a.setAppointmentTime("05:30 PM");
                    a.setStatus("PENDING");
                    appointmentRepository.saveAndFlush(a);
                    throw new RuntimeException("Simulated mid-transaction persistence failure");
                }));

        assertEquals(0, appointmentRepository.findAll().size());

        // Subsequent valid booking for same slot succeeds cleanly after rollback
        Appointment valid = bookingService.createBooking("Clean Client", "clean@example.com", "9876543210",
                "HydraFacial Glow", futureDate.toString(), "05:30 PM", "", true);
        assertNotNull(valid.getId());
    }

    @Test
    void testConcurrentDifferentTreatmentsAtSameSlotBothSucceedForDistinctClients() throws Exception {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger();

        String[] treatments = {"HydraFacial Glow", "Carbon Laser Peel"};
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            final int idx = i;
            futures.add(executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    bookingService.createBooking("Guest " + idx, "tx" + idx + "@example.com", "987654320" + idx,
                            treatments[idx], futureDate.toString(), "01:30 PM", "", true);
                    successCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        ready.await();
        start.countDown();
        for (Future<?> f : futures) {
            f.get();
        }
        executor.shutdown();

        assertEquals(2, successCount.get(), "Different treatments at the same hour should both succeed up to per-treatment capacity");
        assertEquals(2, appointmentRepository.findAll().size());
    }

    @Test
    void testConcurrentSameCustomerDifferentTreatmentsBlockedAtSameHour() throws Exception {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger conflictCount = new AtomicInteger();

        String[] treatments = {"HydraFacial Glow", "Carbon Laser Peel"};
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            final int idx = i;
            futures.add(executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    bookingService.createBooking("Same Client", "overlapping@example.com", "9876543210",
                            treatments[idx], futureDate.toString(), "06:30 PM", "", true);
                    successCount.incrementAndGet();
                } catch (BookingConflictException e) {
                    conflictCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        ready.await();
        start.countDown();
        for (Future<?> f : futures) {
            f.get();
        }
        executor.shutdown();

        assertEquals(1, successCount.get());
        assertEquals(1, conflictCount.get(), "Same client cannot simultaneously hold two bookings in the same time slot");
    }
}
