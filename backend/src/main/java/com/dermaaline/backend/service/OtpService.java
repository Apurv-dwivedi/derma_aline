package com.dermaaline.backend.service;

import com.dermaaline.backend.entity.EmailVerificationOtp;
import com.dermaaline.backend.repository.EmailVerificationOtpRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpService {

    private static final Logger logger = LoggerFactory.getLogger(OtpService.class);
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;

    @Autowired
    private EmailVerificationOtpRepository otpRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates, stores, and emails a secure 6-digit verification OTP.
     */
    @Transactional
    public boolean generateAndSendOtp(String email, String fullName) {
        String cleanEmail = email.trim().toLowerCase();

        // Check resend cooldown
        Optional<EmailVerificationOtp> latestOpt = otpRepository.findTopByEmailOrderByCreatedAtDesc(cleanEmail);
        if (latestOpt.isPresent()) {
            EmailVerificationOtp latest = latestOpt.get();
            if (latest.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(LocalDateTime.now())) {
                logger.warn("OTP resend requested within cooldown period for {}", cleanEmail);
                throw new IllegalStateException("Please wait " + RESEND_COOLDOWN_SECONDS + " seconds before requesting a new code.");
            }
        }

        // Generate 6-digit code
        int code = 100000 + secureRandom.nextInt(900000);
        String codeStr = String.valueOf(code);

        // Store hashed OTP
        EmailVerificationOtp record = new EmailVerificationOtp();
        record.setEmail(cleanEmail);
        record.setOtpHash(passwordEncoder.encode(codeStr));
        record.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        record.setAttempts(0);
        record.setVerified(false);
        record.setCreatedAt(LocalDateTime.now());
        otpRepository.save(record);

        // Compose luxury aesthetic email
        String subject = "Verify Your Account | Derma Aline Aesthétics Clinic";
        String body = "Dear " + (fullName != null && !fullName.trim().isEmpty() ? fullName.trim() : "Valued Client") + ",\n\n"
                + "Welcome to Derma Aline Aesthétics Skin Clinic.\n\n"
                + "Your 6-digit verification code is: " + codeStr + "\n\n"
                + "This verification code will expire in " + OTP_EXPIRY_MINUTES + " minutes. "
                + "For your privacy and security, never share this code with anyone.\n\n"
                + "Warm regards,\n"
                + "Derma Aline Aesthétics Skin Clinic";

        boolean sent = emailService.sendEmail(cleanEmail, subject, body);
        if (!sent) {
            logger.warn("Failed to dispatch OTP email to: {}", cleanEmail);
        }
        return sent;
    }

    /**
     * Validates submitted OTP. Returns true if valid and not expired.
     */
    @Transactional
    public boolean verifyOtp(String email, String codeStr) {
        String cleanEmail = email.trim().toLowerCase();
        Optional<EmailVerificationOtp> latestOpt = otpRepository.findTopByEmailOrderByCreatedAtDesc(cleanEmail);

        if (latestOpt.isEmpty()) {
            return false;
        }

        EmailVerificationOtp record = latestOpt.get();

        // Expired check
        if (record.getExpiresAt().isBefore(LocalDateTime.now())) {
            logger.warn("Expired OTP submitted for {}", cleanEmail);
            return false;
        }

        // Already verified check
        if (record.isVerified()) {
            return false;
        }

        // Exceeded maximum attempts check
        if (record.getAttempts() >= MAX_ATTEMPTS) {
            logger.warn("Max OTP attempts exceeded for {}", cleanEmail);
            return false;
        }

        // Increment attempt count
        record.setAttempts(record.getAttempts() + 1);

        // Check hash
        if (passwordEncoder.matches(codeStr.trim(), record.getOtpHash())) {
            record.setVerified(true);
            otpRepository.save(record);
            return true;
        }

        otpRepository.save(record);
        return false;
    }
}
