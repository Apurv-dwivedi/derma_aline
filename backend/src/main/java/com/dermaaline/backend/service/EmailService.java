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

    @Value("${BREVO_SENDER_EMAIL:}")
    private String brevoSenderEmail;

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

        // Compose clinic-branded HTML template to maximize inbox delivery and avoid spam filters
        String htmlBody = "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #FAFAF8; border-radius: 12px; border: 1px solid #E8E5E0;\">"
                + "<div style=\"text-align: center; padding-bottom: 24px; border-bottom: 1px solid #E8E5E0;\">"
                + "<h2 style=\"margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.05em; color: #2C2623; text-transform: uppercase;\">Derma Aline Aesth\u00e9tics</h2>"
                + "<p style=\"margin: 4px 0 0 0; font-size: 12px; letter-spacing: 0.1em; color: #8F857D; text-transform: uppercase;\">Skin Clinic & Aesthetic Centre</p>"
                + "</div>"
                + "<div style=\"padding: 24px 0; color: #3E3834; font-size: 15px; line-height: 1.7;\">"
                + body.replace("\n", "<br/>")
                + "</div>"
                + "<div style=\"margin-top: 24px; padding-top: 16px; border-top: 1px solid #E8E5E0; text-align: center; font-size: 12px; color: #A09891;\">"
                + "<p style=\"margin: 0;\">Derma Aline Aesth\u00e9tics Skin Clinic &bull; +91 87007 51880</p>"
                + "<p style=\"margin: 4px 0 0 0;\"><a href=\"https://derma-aline.vercel.app\" style=\"color: #8F857D; text-decoration: underline;\">Visit Official Clinic Portal</a></p>"
                + "</div>"
                + "</div>";

        // 1. Try Brevo HTTP API (Port 443 - Never blocked by cloud hosting firewalls)
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty()) {
            if (sendViaBrevoHttpApi(to, subject, body, htmlBody)) {
                return true;
            }
        }

        // 2. Try Resend HTTP API (Port 443 - Never blocked by cloud hosting firewalls)
        if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
            if (sendViaResendHttpApi(to, subject, body, htmlBody)) {
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

    private boolean sendViaResendHttpApi(String to, String subject, String textBody, String htmlBody) {
        try {
            URL url = new URL("https://api.resend.com/emails");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + resendApiKey.trim());
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            conn.setDoOutput(true);

            String jsonPayload = String.format(
                "{\"from\":\"Derma Aline <onboarding@resend.dev>\",\"to\":[\"%s\"],\"subject\":\"%s\",\"text\":\"%s\",\"html\":\"%s\"}",
                to, escapeJson(subject), escapeJson(textBody), escapeJson(htmlBody)
            );

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                logger.info("Email dispatched successfully via Resend HTTPS API to {}", to);
                return true;
            } else {
                try (java.io.InputStream es = conn.getErrorStream()) {
                    String err = es != null ? new String(es.readAllBytes(), StandardCharsets.UTF_8) : "";
                    logger.warn("Resend API returned status {}: {}", code, err);
                    lastError = "Resend API error (" + code + "): " + err;
                }
            }
        } catch (Exception e) {
            logger.warn("Resend HTTP API error: {}", e.getMessage());
            lastError = "Resend error: " + e.getMessage();
        }
        return false;
    }

    private boolean sendViaBrevoHttpApi(String to, String subject, String textBody, String htmlBody) {
        try {
            URL url = new URL("https://api.brevo.com/v3/smtp/email");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("api-key", brevoApiKey.trim());
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            conn.setDoOutput(true);

            String senderEmailToUse = (brevoSenderEmail != null && !brevoSenderEmail.trim().isEmpty())
                    ? brevoSenderEmail.trim()
                    : fromEmail;

            String jsonPayload = String.format(
                "{\"sender\":{\"name\":\"Derma Aline Aesthétics\",\"email\":\"%s\"},\"to\":[{\"email\":\"%s\"}],\"subject\":\"%s\",\"textContent\":\"%s\",\"htmlContent\":\"%s\"}",
                senderEmailToUse, to, escapeJson(subject), escapeJson(textBody), escapeJson(htmlBody)
            );

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                try (java.io.InputStream is = conn.getInputStream()) {
                    String responseBody = is != null ? new String(is.readAllBytes(), StandardCharsets.UTF_8) : "";
                    logger.info("Email dispatched successfully via Brevo HTTPS API to {}: {}", to, responseBody);
                }
                return true;
            } else {
                try (java.io.InputStream es = conn.getErrorStream()) {
                    String err = es != null ? new String(es.readAllBytes(), StandardCharsets.UTF_8) : "";
                    logger.warn("Brevo API returned status {}: {}", code, err);
                    lastError = "Brevo API status (" + code + "): " + err;
                }
            }
        } catch (Exception e) {
            logger.warn("Brevo HTTP API error: {}", e.getMessage());
            lastError = "Brevo error: " + e.getMessage();
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
