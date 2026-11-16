package com.dermaaline.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:dermaalineskinaesthetics@gmail.com}")
    private String fromEmail;

    @Value("${RESEND_API_KEY:}")
    private String resendApiKey;

    @Value("${BREVO_API_KEY:}")
    private String brevoApiKey;

    private String lastError;

    public String getLastError() {
        return lastError;
    }

    public boolean sendEmail(String to, String subject, String body) {
        lastError = null;

        // 1. Try Resend HTTP API (Port 443 - Never blocked by Render free tier)
        if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
            if (sendViaResendHttpApi(to, subject, body)) {
                return true;
            }
        }

        // 2. Try Brevo HTTP API (Port 443 - Never blocked by Render free tier)
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty()) {
            if (sendViaBrevoHttpApi(to, subject, body)) {
                return true;
            }
        }

        // 3. Try standard SMTP (Works on paid Render, VPS, or local development)
        if (mailSender != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(to);
                message.setSubject(subject);
                message.setText(body);
                message.setFrom(fromEmail);

                mailSender.send(message);
                logger.info("Email dispatched successfully via SMTP to {}", to);
                return true;
            } catch (Exception e) {
                lastError = e.getMessage();
                logger.warn("SMTP send failed (Render free tier blocks ports 25, 465, 587): {}", e.getMessage());
            }
        } else {
            lastError = "JavaMailSender not initialized";
        }

        return false;
    }

    private boolean sendViaResendHttpApi(String to, String subject, String body) {
        try {
            URL url = new URL("https://api.resend.com/emails");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + resendApiKey.trim());
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setDoOutput(true);

            String jsonPayload = String.format(
                "{\"from\":\"Derma Aline <onboarding@resend.dev>\",\"to\":[\"%s\"],\"subject\":\"%s\",\"text\":\"%s\"}",
                to, escapeJson(subject), escapeJson(body)
            );

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                logger.info("Email dispatched successfully via Resend HTTPS API to {}", to);
                return true;
            } else {
                logger.warn("Resend API returned status {}", code);
            }
        } catch (Exception e) {
            logger.warn("Resend HTTP API error: {}", e.getMessage());
        }
        return false;
    }

    private boolean sendViaBrevoHttpApi(String to, String subject, String body) {
        try {
            URL url = new URL("https://api.brevo.com/v3/smtp/email");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("api-key", brevoApiKey.trim());
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setDoOutput(true);

            String jsonPayload = String.format(
                "{\"sender\":{\"name\":\"Derma Aline\",\"email\":\"%s\"},\"to\":[{\"email\":\"%s\"}],\"subject\":\"%s\",\"textContent\":\"%s\"}",
                fromEmail, to, escapeJson(subject), escapeJson(body)
            );

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                logger.info("Email dispatched successfully via Brevo HTTPS API to {}", to);
                return true;
            } else {
                logger.warn("Brevo API returned status {}", code);
            }
        } catch (Exception e) {
            logger.warn("Brevo HTTP API error: {}", e.getMessage());
        }
        return false;
    }

    private String escapeJson(String raw) {
        if (raw == null) return "";
        return raw.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }

    public boolean sendPasswordResetEmail(String to, String recipientName, String resetLink) {
        String greeting = (recipientName != null && !recipientName.trim().isEmpty()) 
                ? "Dear " + recipientName + ",\n\n" 
                : "Hello,\n\n";

        String subject = "Reset Your Password - Derma Aline Aesthetics";
        String body = greeting +
                "We received a request to reset your password for your Derma Aline Aesthetics account.\n\n" +
                "To reset your password, please click the link below (or copy and paste it into your browser). This link is valid for 1 hour:\n\n" +
                resetLink + "\n\n" +
                "If you did not make this request, you can safely ignore this email and your password will remain unchanged.\n\n" +
                "Warm regards,\n" +
                "Derma Aline Aesthetics Team\n" +
                "https://derma-aline.vercel.app";

        return sendEmail(to, subject, body);
    }
}
