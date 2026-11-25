package com.dermaaline.backend.service;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.entity.AppointmentStatus;
import com.dermaaline.backend.entity.Customer;
import com.dermaaline.backend.entity.Treatment;
import com.dermaaline.backend.entity.TreatmentRecord;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.AppointmentSlotLockRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.TreatmentRecordRepository;
import com.dermaaline.backend.repository.TreatmentRepository;
import com.dermaaline.backend.security.SecuritySanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

@Service
public class AppointmentBookingService {

    private static final DateTimeFormatter DISPLAY_TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH);
    private static final DateTimeFormatter TIME_12H_FLEX = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);
    private static final List<String> DEFAULT_CLINIC_SLOTS = List.of(
        "10:00 AM", "11:00 AM", "12:00 PM", "01:30 PM",
        "03:00 PM", "04:30 PM", "05:30 PM", "06:30 PM"
    );

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired(required = false)
    private AppointmentSlotLockRepository slotLockRepository;

    @Autowired(required = false)
    private AppointmentSlotLockService slotLockService;

    @Autowired(required = false)
    private TransactionTemplate transactionTemplate;

    @Autowired
    private TreatmentRepository treatmentRepository;

    @Autowired
    private TreatmentRecordRepository treatmentRecordRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Value("${app.appointments.max-per-slot:1}")
    private int maxPerSlot = 1;

    @Value("${app.appointments.open-hour:10}")
    private int openHour = 10;

    @Value("${app.appointments.close-hour:20}")
    private int closeHour = 20;

    @Value("${app.clinic.timezone:Asia/Kolkata}")
    private String clinicTimezone = "Asia/Kolkata";

    public static class BookingValidationException extends IllegalArgumentException {
        public BookingValidationException(String message) {
            super(message);
        }
    }

    public static class BookingConflictException extends IllegalStateException {
        public BookingConflictException(String message) {
            super(message);
        }
    }

    public static class ForbiddenAppointmentAccessException extends SecurityException {
        public ForbiddenAppointmentAccessException(String message) {
            super(message);
        }
    }

    public static class AppointmentNotFoundException extends RuntimeException {
        public AppointmentNotFoundException(String message) {
            super(message);
        }
    }

    public Appointment createBooking(
            String rawName,
            String rawEmail,
            String rawPhone,
            String rawTreatmentName,
            String dateStr,
            String timeStr,
            String rawNotes,
            boolean phoneRequired
    ) {
        String patientName = SecuritySanitizer.sanitizeText(rawName, 100);
        String email = SecuritySanitizer.sanitizeEmail(rawEmail);
        String phone = (rawPhone != null && !rawPhone.trim().isEmpty()) ? SecuritySanitizer.sanitizePhone(rawPhone) : "";
        String treatmentName = SecuritySanitizer.sanitizeText(rawTreatmentName, 150);
        String notes = SecuritySanitizer.sanitizeText(rawNotes, 1000);

        if (patientName == null || patientName.isEmpty()) {
            throw new BookingValidationException("Patient name is required.");
        }
        if (email == null) {
            throw new BookingValidationException("A valid email address is required.");
        }
        if (phoneRequired && (rawPhone == null || rawPhone.trim().isEmpty())) {
            throw new BookingValidationException("A valid phone number is required.");
        }
        if (rawPhone != null && !rawPhone.trim().isEmpty() && phone == null) {
            throw new BookingValidationException("Phone number format is invalid.");
        }
        if (treatmentName == null || treatmentName.isEmpty()) {
            throw new BookingValidationException("Treatment selection is required.");
        }

        validateTreatmentAvailability(treatmentName);

        LocalDateTime slotDateTime = parseAndValidateFutureSlot(dateStr, timeStr);
        String normalizedTimeLabel = slotDateTime.toLocalTime().format(DISPLAY_TIME_FMT);
        String treatmentLockKey = buildSlotKey(slotDateTime, treatmentName);
        String customerLockKey = buildCustomerSlotKey(slotDateTime, email);

        List<String> orderedKeys = new ArrayList<>();
        orderedKeys.add(treatmentLockKey);
        if (customerLockKey != null && !customerLockKey.equals(treatmentLockKey)) {
            orderedKeys.add(customerLockKey);
        }
        Collections.sort(orderedKeys);

        // Ensure persistent DB slot-lock rows exist in their own committed transactions before acquiring FOR UPDATE
        if (slotLockService != null) {
            for (String lockKey : orderedKeys) {
                slotLockService.ensureSlotLockExists(lockKey);
            }
        }

        return executeInTransaction(() -> {
            for (String lockKey : orderedKeys) {
                acquireSlotLockOrThrow(lockKey);
            }

            LocalDateTime dayStart = slotDateTime.toLocalDate().atStartOfDay();
            LocalDateTime dayEnd = dayStart.plusDays(1);
            List<Appointment> existingBookings = appointmentRepository.findActiveDayBookings(dayStart, dayEnd);

            validateSlotCapacityAndDuplicates(existingBookings, slotDateTime.toLocalTime(), treatmentName, email, null);

            Appointment appt = new Appointment();
            appt.setCustomerName(patientName);
            appt.setPatientName(patientName);
            appt.setCustomerEmail(email);
            appt.setEmail(email);
            appt.setCustomerPhone(phone != null ? phone : "");
            appt.setPhone(phone != null ? phone : "");
            appt.setTreatmentName(treatmentName);
            appt.setAppointmentDate(slotDateTime);
            appt.setAppointmentTime(normalizedTimeLabel);
            appt.setNotes(notes != null ? notes : "");
            appt.setStatus(AppointmentStatus.PENDING.name());
            appt.setCreatedAt(LocalDateTime.now(resolveClinicZone()));

            return appointmentRepository.save(appt);
        });
    }

    private <T> T executeInTransaction(Supplier<T> work) {
        if (transactionTemplate != null) {
            return transactionTemplate.execute(status -> work.get());
        }
        return work.get();
    }

    private void acquireSlotLockOrThrow(String slotKey) {
        if (slotLockRepository == null) {
            return;
        }
        try {
            slotLockRepository.findLockedBySlotKey(slotKey)
                    .orElseThrow(() -> new BookingConflictException("Unable to reserve appointment slot lock. Please try again."));
        } catch (PessimisticLockingFailureException e) {
            throw new BookingConflictException("This appointment slot is currently busy due to concurrent booking activity. Please retry.");
        }
    }

    public static String buildTreatmentSlotKey(LocalDate date, LocalTime time, String treatmentName) {
        String datePart = date + "@" + time.withSecond(0).withNano(0);
        String cleanTreatment = normalizeTreatment(treatmentName);
        if (cleanTreatment.isEmpty()) {
            return datePart;
        }
        String slug = cleanTreatment.replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        if (slug.length() > 24) {
            slug = slug.substring(0, 24);
        }
        String hash = shortHash(cleanTreatment);
        String candidate = datePart + "|" + (slug.isEmpty() ? "tx" : slug) + "_" + hash;
        return candidate.length() <= 64 ? candidate : candidate.substring(0, 64);
    }

    private String buildSlotKey(LocalDateTime slotDateTime, String treatmentName) {
        return buildTreatmentSlotKey(slotDateTime.toLocalDate(), slotDateTime.toLocalTime(), treatmentName);
    }

    private String buildCustomerSlotKey(LocalDateTime slotDateTime, String customerEmail) {
        if (customerEmail == null || customerEmail.isBlank()) {
            return null;
        }
        String datePart = slotDateTime.toLocalDate() + "@" + slotDateTime.toLocalTime().withSecond(0).withNano(0);
        String key = "c|" + datePart + "|" + shortHash(customerEmail.trim().toLowerCase(Locale.ENGLISH));
        return key.length() <= 64 ? key : key.substring(0, 64);
    }

    private static String normalizeTreatment(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().toLowerCase(Locale.ENGLISH).replaceAll("\\s+", " ");
    }

    private static String shortHash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 12);
        } catch (Exception e) {
            return Integer.toHexString(input.hashCode());
        }
    }

    private boolean isSameTreatment(Appointment existing, String targetTreatment) {
        if (existing == null) {
            return false;
        }
        String targetNorm = normalizeTreatment(targetTreatment);
        if (targetNorm.isEmpty()) {
            return true;
        }
        String existingNorm = normalizeTreatment(existing.getTreatmentName());
        return existingNorm.equals(targetNorm);
    }

    private void validateSlotCapacityAndDuplicates(
            List<Appointment> existingBookings,
            LocalTime rawTargetTime,
            String targetTreatmentName,
            String customerEmail,
            Long excludeAppointmentId
    ) {
        LocalTime targetTime = rawTargetTime.withSecond(0).withNano(0);
        int treatmentSlotCount = 0;

        if (existingBookings != null) {
            for (Appointment existing : existingBookings) {
                if (excludeAppointmentId != null && excludeAppointmentId.equals(existing.getId())) {
                    continue;
                }
                if (!isSameSlotTime(existing, targetTime)) {
                    continue;
                }
                String existingEmail = extractBookingEmail(existing);
                if (existingEmail != null && customerEmail != null && existingEmail.equalsIgnoreCase(customerEmail)) {
                    throw new BookingConflictException("You already have an active appointment for this date and time slot.");
                }
                if (isSameTreatment(existing, targetTreatmentName)) {
                    treatmentSlotCount++;
                }
            }
        }

        int effectiveMax = Math.max(1, maxPerSlot);
        if (treatmentSlotCount >= effectiveMax) {
            throw new BookingConflictException("This treatment time slot is fully booked. Please select another available time.");
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDateAvailability(String dateStr) {
        return getDateAvailability(dateStr, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDateAvailability(String dateStr, String treatmentName) {
        LocalDate targetDate = parseDateOnly(dateStr);
        String cleanTreatment = (treatmentName != null && !treatmentName.isBlank())
                ? SecuritySanitizer.sanitizeText(treatmentName, 150)
                : null;
        LocalDateTime dayStart = targetDate.atStartOfDay();
        LocalDateTime dayEnd = dayStart.plusDays(1);
        List<Appointment> activeDayBookings = appointmentRepository.findActiveDayBookings(dayStart, dayEnd);

        int effectiveMax = Math.max(1, maxPerSlot);
        LocalDateTime now = LocalDateTime.now(resolveClinicZone());
        Map<String, Boolean> slotAvailability = new LinkedHashMap<>();

        for (String slotLabel : DEFAULT_CLINIC_SLOTS) {
            LocalTime slotTime = parseTimeStrict(slotLabel);
            LocalDateTime slotDateTime = LocalDateTime.of(targetDate, slotTime);
            if (!slotDateTime.isAfter(now)) {
                slotAvailability.put(slotLabel, false);
                continue;
            }
            int count = 0;
            if (activeDayBookings != null) {
                for (Appointment existing : activeDayBookings) {
                    if (!isSameSlotTime(existing, slotTime)) {
                        continue;
                    }
                    if (cleanTreatment == null || cleanTreatment.isEmpty() || isSameTreatment(existing, cleanTreatment)) {
                        count++;
                    }
                }
            }
            slotAvailability.put(slotLabel, count < effectiveMax);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", targetDate.toString());
        result.put("treatmentName", cleanTreatment != null ? cleanTreatment : "");
        result.put("maxPerSlot", effectiveMax);
        result.put("slots", slotAvailability);
        return result;
    }

    @Transactional
    public Appointment cancelCustomerAppointment(Long id, String authenticatedEmail) {
        String cleanEmail = SecuritySanitizer.sanitizeEmail(authenticatedEmail);
        if (cleanEmail == null) {
            throw new ForbiddenAppointmentAccessException("Authenticated customer email is required.");
        }

        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found."));

        String ownerEmail = extractBookingEmail(appointment);
        if (ownerEmail == null || !ownerEmail.equalsIgnoreCase(cleanEmail)) {
            throw new ForbiddenAppointmentAccessException("You are not authorized to cancel another client's appointment.");
        }

        AppointmentStatus currentStatus = parseStatus(appointment.getStatus());
        if (currentStatus == AppointmentStatus.COMPLETED) {
            throw new BookingConflictException("Completed appointments cannot be cancelled.");
        }
        if (currentStatus == AppointmentStatus.CANCELLED || currentStatus == AppointmentStatus.REJECTED) {
            throw new BookingConflictException("This appointment is already " + currentStatus.name().toLowerCase() + ".");
        }

        LocalDateTime scheduledSlot = resolveEffectiveAppointmentDateTime(appointment);
        if (scheduledSlot != null && scheduledSlot.isBefore(LocalDateTime.now(resolveClinicZone()))) {
            throw new BookingConflictException("Past appointments cannot be cancelled.");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED.name());
        return appointmentRepository.save(appointment);
    }

    @Transactional
    public Appointment transitionStatus(Long id, String rawNewStatus, String practitionerName) {
        if (rawNewStatus == null || rawNewStatus.trim().isEmpty()) {
            throw new BookingValidationException("Status is required.");
        }
        AppointmentStatus targetStatus;
        try {
            targetStatus = AppointmentStatus.valueOf(rawNewStatus.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BookingValidationException("Invalid appointment status value.");
        }

        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found."));

        AppointmentStatus currentStatus = parseStatus(appointment.getStatus());
        if (currentStatus != targetStatus && !isAllowedTransition(currentStatus, targetStatus)) {
            throw new BookingConflictException("Cannot transition appointment from " + currentStatus + " to " + targetStatus + ".");
        }

        appointment.setStatus(targetStatus.name());
        Appointment saved = appointmentRepository.save(appointment);
        if (targetStatus == AppointmentStatus.COMPLETED) {
            ensureTreatmentRecordCreated(saved, practitionerName);
        }
        return saved;
    }

    public Appointment updateAppointmentDetails(
            Long id,
            String rawPatientName,
            String rawEmail,
            String rawPhone,
            String rawTreatmentName,
            String dateStr,
            String timeStr,
            String rawStatus,
            String rawNotes,
            String practitionerName
    ) {
        LocalDateTime preParsedSlot = null;
        if (dateStr != null && !dateStr.trim().isEmpty()) {
            preParsedSlot = parseAndValidateFutureSlot(dateStr, timeStr);
        } else if (timeStr != null && !timeStr.trim().isEmpty()) {
            LocalTime updatedTime = parseTimeStrict(timeStr);
            validateClinicHours(updatedTime);
        }

        Appointment existingCheck = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found."));

        LocalDateTime targetSlot = null;
        if (preParsedSlot != null) {
            targetSlot = preParsedSlot;
        } else if (timeStr != null && !timeStr.trim().isEmpty()) {
            LocalDate existingDate = existingCheck.getAppointmentDate() != null
                    ? existingCheck.getAppointmentDate().toLocalDate()
                    : LocalDate.now(resolveClinicZone());
            targetSlot = LocalDateTime.of(existingDate, parseTimeStrict(timeStr));
        }

        String effectiveTreatment = (rawTreatmentName != null && !rawTreatmentName.trim().isEmpty())
                ? SecuritySanitizer.sanitizeText(rawTreatmentName, 150)
                : existingCheck.getTreatmentName();
        final String targetSlotKey = targetSlot != null ? buildSlotKey(targetSlot, effectiveTreatment) : null;
        if (targetSlotKey != null && slotLockService != null) {
            slotLockService.ensureSlotLockExists(targetSlotKey);
        }

        final LocalDateTime resolvedTargetSlot = targetSlot;
        return executeInTransaction(() -> {
            if (targetSlotKey != null) {
                acquireSlotLockOrThrow(targetSlotKey);
            }

            Appointment appointment = appointmentRepository.findById(id)
                    .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found."));

            if (rawPatientName != null) {
                String cleanName = SecuritySanitizer.sanitizeText(rawPatientName, 100);
                if (cleanName == null || cleanName.isEmpty()) {
                    throw new BookingValidationException("Patient name cannot be blank.");
                }
                appointment.setCustomerName(cleanName);
                appointment.setPatientName(cleanName);
            }
            if (rawEmail != null) {
                String cleanEmail = SecuritySanitizer.sanitizeEmail(rawEmail);
                if (cleanEmail == null) {
                    throw new BookingValidationException("A valid email address is required.");
                }
                appointment.setCustomerEmail(cleanEmail);
                appointment.setEmail(cleanEmail);
            }
            if (rawPhone != null) {
                if (rawPhone.trim().isEmpty()) {
                    appointment.setCustomerPhone("");
                    appointment.setPhone("");
                } else {
                    String cleanPhone = SecuritySanitizer.sanitizePhone(rawPhone);
                    if (cleanPhone == null) {
                        throw new BookingValidationException("Phone number format is invalid.");
                    }
                    appointment.setCustomerPhone(cleanPhone);
                    appointment.setPhone(cleanPhone);
                }
            }
            if (rawTreatmentName != null) {
                String cleanTreatment = SecuritySanitizer.sanitizeText(rawTreatmentName, 150);
                if (cleanTreatment == null || cleanTreatment.isEmpty()) {
                    throw new BookingValidationException("Treatment name cannot be blank.");
                }
                validateTreatmentAvailability(cleanTreatment);
                appointment.setTreatmentName(cleanTreatment);
            }
            if (rawNotes != null) {
                appointment.setNotes(SecuritySanitizer.sanitizeText(rawNotes, 1000));
            }

            AppointmentStatus targetStatus = null;
            if (rawStatus != null && !rawStatus.trim().isEmpty()) {
                try {
                    targetStatus = AppointmentStatus.valueOf(rawStatus.trim().toUpperCase());
                } catch (IllegalArgumentException e) {
                    throw new BookingValidationException("Invalid appointment status value.");
                }
                AppointmentStatus currentStatus = parseStatus(appointment.getStatus());
                if (currentStatus != targetStatus && !isAllowedTransition(currentStatus, targetStatus)) {
                    throw new BookingConflictException("Cannot transition appointment from " + currentStatus + " to " + targetStatus + ".");
                }
                appointment.setStatus(targetStatus.name());
            }

            if (resolvedTargetSlot != null) {
                AppointmentStatus effectiveStatus = parseStatus(appointment.getStatus());
                if (effectiveStatus == AppointmentStatus.PENDING || effectiveStatus == AppointmentStatus.CONFIRMED) {
                    LocalDateTime dayStart = resolvedTargetSlot.toLocalDate().atStartOfDay();
                    LocalDateTime dayEnd = dayStart.plusDays(1);
                    List<Appointment> dayBookings = appointmentRepository.findActiveDayBookings(dayStart, dayEnd);
                    validateSlotCapacityAndDuplicates(dayBookings, resolvedTargetSlot.toLocalTime(), appointment.getTreatmentName(), extractBookingEmail(appointment), appointment.getId());
                }
                appointment.setAppointmentDate(resolvedTargetSlot);
                appointment.setAppointmentTime(resolvedTargetSlot.toLocalTime().format(DISPLAY_TIME_FMT));
            }

            Appointment saved = appointmentRepository.save(appointment);
            if (AppointmentStatus.COMPLETED.name().equalsIgnoreCase(saved.getStatus())) {
                ensureTreatmentRecordCreated(saved, practitionerName);
            }
            return saved;
        });
    }

    public void ensureTreatmentRecordCreated(Appointment appointment, String practitioner) {
        if (appointment == null || !"COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            return;
        }
        try {
            final String rawEmail = extractBookingEmail(appointment);
            final String cleanEmail = (rawEmail != null && !rawEmail.trim().isEmpty())
                ? rawEmail.trim().toLowerCase()
                : "patient@dermaaline.com";

            final String finalTreatmentName = (appointment.getTreatmentName() != null && !appointment.getTreatmentName().trim().isEmpty())
                ? appointment.getTreatmentName().trim()
                : "Clinical Treatment";

            final LocalDate finalTreatmentDate = appointment.getAppointmentDate() != null
                ? appointment.getAppointmentDate().toLocalDate()
                : LocalDate.now(resolveClinicZone());

            List<TreatmentRecord> existing = treatmentRecordRepository.findByCustomerEmailIgnoreCaseOrderByTreatmentDateDesc(cleanEmail);
            boolean exists = existing != null && existing.stream().anyMatch(r ->
                finalTreatmentName.equalsIgnoreCase(r.getTreatmentName()) &&
                finalTreatmentDate.equals(r.getTreatmentDate())
            );

            if (!exists) {
                Optional<Customer> customerOpt = customerRepository.findByEmail(cleanEmail);
                Customer customer;
                if (customerOpt.isEmpty()) {
                    customer = new Customer();
                    customer.setEmail(cleanEmail);
                    customer.setFullName(appointment.getCustomerName() != null ? appointment.getCustomerName() : "Valued Client");
                    customer.setPhone(appointment.getCustomerPhone());
                    customer = customerRepository.save(customer);
                } else {
                    customer = customerOpt.get();
                }

                TreatmentRecord tr = new TreatmentRecord();
                tr.setCustomerId(customer.getId());
                tr.setCustomerEmail(cleanEmail);
                tr.setCustomerName(customer.getFullName() != null ? customer.getFullName() : "Valued Client");
                tr.setTreatmentName(finalTreatmentName);
                tr.setTreatmentDate(finalTreatmentDate);
                tr.setPractitionerName(practitioner != null ? practitioner : "Derma Aline Specialist");
                tr.setDescription("Clinical appointment procedure completed.");
                tr.setClinicalNotes(appointment.getNotes() != null && !appointment.getNotes().trim().isEmpty()
                    ? appointment.getNotes()
                    : "Clinical appointment procedure completed successfully.");
                tr.setAftercareInstructions("Keep the treated area clean, hydrated, and protected with broad-spectrum SPF 50+ sunscreen daily.");
                treatmentRecordRepository.save(tr);
            }
        } catch (Exception ignored) {}
    }

    public LocalDateTime parseAndValidateFutureSlot(String dateStr, String timeStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            throw new BookingValidationException("Appointment date is required.");
        }
        String cleanDate = dateStr.trim();
        LocalDate date;
        LocalTime embeddedTime = null;

        if (cleanDate.contains("T")) {
            String isoClean = cleanDate.replace("Z", "");
            int dotIdx = isoClean.indexOf('.');
            if (dotIdx > 0) {
                isoClean = isoClean.substring(0, dotIdx);
            }
            try {
                LocalDateTime parsedDt = LocalDateTime.parse(isoClean);
                date = parsedDt.toLocalDate();
                embeddedTime = parsedDt.toLocalTime().withSecond(0).withNano(0);
            } catch (DateTimeParseException e) {
                throw new BookingValidationException("Invalid appointment date format.");
            }
        } else {
            date = parseDateOnly(cleanDate);
        }

        LocalTime time;
        if (timeStr != null && !timeStr.trim().isEmpty()) {
            time = parseTimeStrict(timeStr);
        } else if (embeddedTime != null && !embeddedTime.equals(LocalTime.MIDNIGHT)) {
            time = embeddedTime;
        } else {
            throw new BookingValidationException("Appointment time slot is required.");
        }

        validateClinicHours(time);

        LocalDateTime slotDateTime = LocalDateTime.of(date, time);
        LocalDateTime now = LocalDateTime.now(resolveClinicZone());
        if (!slotDateTime.isAfter(now)) {
            throw new BookingValidationException("Appointments must be scheduled for a future date and time.");
        }
        if (date.isAfter(now.toLocalDate().plusDays(365))) {
            throw new BookingValidationException("Appointments can only be booked up to 365 days in advance.");
        }
        return slotDateTime;
    }

    private LocalDate parseDateOnly(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            throw new BookingValidationException("Appointment date is required.");
        }
        String candidate = dateStr.trim();
        if (candidate.length() > 10 && candidate.charAt(10) == 'T') {
            candidate = candidate.substring(0, 10);
        }
        try {
            return LocalDate.parse(candidate);
        } catch (DateTimeParseException e) {
            throw new BookingValidationException("Invalid appointment date. Use YYYY-MM-DD format.");
        }
    }

    private LocalTime parseTimeStrict(String rawTime) {
        String clean = rawTime.trim().toUpperCase(Locale.ENGLISH).replaceAll("\\s+", " ");
        try {
            if (clean.endsWith("AM") || clean.endsWith("PM")) {
                return LocalTime.parse(clean, TIME_12H_FLEX).withSecond(0).withNano(0);
            }
            if (clean.matches("^\\d{1,2}:\\d{2}:\\d{2}$")) {
                return LocalTime.parse(clean.length() == 7 ? "0" + clean : clean).withSecond(0).withNano(0);
            }
            if (clean.matches("^\\d{1,2}:\\d{2}$")) {
                return LocalTime.parse(clean.length() == 4 ? "0" + clean : clean).withSecond(0).withNano(0);
            }
        } catch (DateTimeParseException ignored) {}
        throw new BookingValidationException("Invalid appointment time format.");
    }

    private void validateClinicHours(LocalTime time) {
        if (time.getHour() < openHour || time.getHour() >= closeHour) {
            throw new BookingValidationException("Clinic appointments are available daily between 10:00 AM and 8:00 PM.");
        }
    }

    private void validateTreatmentAvailability(String treatmentName) {
        Optional<Treatment> dbTreatment = treatmentRepository.findByNameIgnoreCase(treatmentName);
        if (dbTreatment.isPresent() && !dbTreatment.get().isActive()) {
            throw new BookingValidationException("Selected treatment is currently inactive or unavailable.");
        }
    }

    private boolean isSameSlotTime(Appointment existing, LocalTime targetTime) {
        if (existing == null || targetTime == null) {
            return false;
        }
        LocalTime existingTime = null;
        if (existing.getAppointmentTime() != null && !existing.getAppointmentTime().trim().isEmpty()) {
            try {
                existingTime = parseTimeStrict(existing.getAppointmentTime());
            } catch (BookingValidationException ignored) {}
        }
        if (existingTime == null && existing.getAppointmentDate() != null) {
            existingTime = existing.getAppointmentDate().toLocalTime().withSecond(0).withNano(0);
        }
        return targetTime.equals(existingTime);
    }

    private LocalDateTime resolveEffectiveAppointmentDateTime(Appointment appointment) {
        if (appointment == null || appointment.getAppointmentDate() == null) {
            return null;
        }
        LocalDate date = appointment.getAppointmentDate().toLocalDate();
        LocalTime time = appointment.getAppointmentDate().toLocalTime();
        if (appointment.getAppointmentTime() != null && !appointment.getAppointmentTime().trim().isEmpty()) {
            try {
                time = parseTimeStrict(appointment.getAppointmentTime());
            } catch (BookingValidationException ignored) {}
        }
        return LocalDateTime.of(date, time);
    }

    private String extractBookingEmail(Appointment appointment) {
        if (appointment == null) {
            return null;
        }
        String raw = appointment.getCustomerEmail() != null ? appointment.getCustomerEmail() : appointment.getEmail();
        return raw != null ? raw.trim().toLowerCase() : null;
    }

    private AppointmentStatus parseStatus(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return AppointmentStatus.PENDING;
        }
        try {
            return AppointmentStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return AppointmentStatus.PENDING;
        }
    }

    private boolean isAllowedTransition(AppointmentStatus from, AppointmentStatus to) {
        return switch (from) {
            case PENDING -> to == AppointmentStatus.CONFIRMED
                    || to == AppointmentStatus.COMPLETED
                    || to == AppointmentStatus.CANCELLED
                    || to == AppointmentStatus.REJECTED;
            case CONFIRMED -> to == AppointmentStatus.COMPLETED
                    || to == AppointmentStatus.CANCELLED
                    || to == AppointmentStatus.REJECTED;
            case COMPLETED, CANCELLED, REJECTED -> false;
        };
    }

    private ZoneId resolveClinicZone() {
        try {
            return ZoneId.of(clinicTimezone != null && !clinicTimezone.isBlank() ? clinicTimezone : "Asia/Kolkata");
        } catch (Exception e) {
            return ZoneId.of("Asia/Kolkata");
        }
    }
}
