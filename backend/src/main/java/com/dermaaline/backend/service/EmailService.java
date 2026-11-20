package com.dermaaline.backend.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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

    @Value("${spring.mail.username:dermaalineaesthetics@gmail.com}")
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

    /**
     * Dispatches 6-digit verification code with high-contrast luxury styling.
     * Google Gmail SMTP is the primary dispatcher.
     */
    public boolean sendOtpEmail(String to, String fullName, String codeStr, int expiryMinutes) {
        lastError = null;
        String recipientName = (fullName != null && !fullName.trim().isEmpty()) ? fullName.trim() : "Valued Client";
        String subject = "Your 6-Digit Verification Code | Derma Aline Aesthétics";

        String textBody = "Dear " + recipientName + ",\n\n"
                + "Welcome to Derma Aline Aesthétics Skin Clinic.\n\n"
                + "Your 6-digit verification code is: " + codeStr + "\n\n"
                + "This verification code will expire in " + expiryMinutes + " minutes. "
                + "For your privacy and security, never share this code with anyone.\n\n"
                + "Warm regards,\n"
                + "Derma Aline Aesthétics Skin Clinic\n"
                + "+91 93195 44704";

        String htmlBody = "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 28px; background-color: #FAFAF8; border-radius: 12px; border: 1px solid #E8E5E0;\">"
                + "<div style=\"text-align: center; padding-bottom: 24px; border-bottom: 1px solid #E8E5E0;\">"
                + "<h2 style=\"margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.08em; color: #806657; text-transform: uppercase;\">DERMA ALINE AESTH\u00c9TICS</h2>"
                + "<p style=\"margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.15em; color: #8F857D; text-transform: uppercase;\">Skin Clinic & Aesthetic Centre</p>"
                + "</div>"
                + "<div style=\"padding: 28px 0; color: #3E3834; font-size: 15px; line-height: 1.7;\">"
                + "<p style=\"margin-top: 0;\">Dear <strong>" + recipientName + "</strong>,</p>"
                + "<p>Thank you for choosing Derma Aline Aesth\u00e9tics Skin Clinic. To verify your email address and activate your personal client portal suite, please use the 6-digit security code below:</p>"
                + "<div style=\"text-align: center; margin: 28px 0;\">"
                + "<span style=\"display: inline-block; font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #806657; background: #FAF7F2; padding: 14px 28px; border-radius: 8px; border: 2px solid #806657;\">"
                + codeStr
                + "</span>"
                + "<p style=\"margin: 10px 0 0 0; font-size: 13px; color: #8F857D;\">Code expires in " + expiryMinutes + " minutes</p>"
                + "</div>"
                + "<p style=\"font-size: 13px; color: #736B63; background: #F3EFEA; padding: 12px 16px; border-radius: 6px;\">Security Note: Our clinical team will never ask for your verification code. Never share this code with anyone.</p>"
                + "</div>"
                + "<div style=\"margin-top: 24px; padding-top: 20px; border-top: 1px solid #E8E5E0; text-align: center; font-size: 12px; color: #A09891;\">"
                + "<p style=\"margin: 0; font-weight: 600;\">Derma Aline Aesth\u00e9tics Skin Clinic</p>"
                + "<p style=\"margin: 4px 0 0 0;\">First Floor, F-121, near Roshan di Kulfi, Main Market, Rajouri Garden, New Delhi &bull; +91 93195 44704</p>"
                + "<p style=\"margin: 4px 0 0 0;\"><a href=\"https://derma-aline.vercel.app\" style=\"color: #806657; text-decoration: underline;\">Visit Official Clinic Portal</a></p>"
                + "</div>"
                + "</div>";

        // 1. Primary: Brevo HTTPS API (Port 443 - Instant cloud delivery without SMTP port blocking)
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty()) {
            if (sendViaBrevoHttpApi(to, subject, textBody, htmlBody)) {
                return true;
            }
        }

        // 2. Secondary: Resend HTTP API (Port 443)
        if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
            if (sendViaResendHttpApi(to, subject, textBody, htmlBody)) {
                return true;
            }
        }

        // 3. Fallback: Google SMTP (smtp.gmail.com)
        if (sendViaGoogleSmtp(to, subject, textBody, htmlBody)) {
            return true;
        }

        return false;
    }

    public boolean sendEmail(String to, String subject, String body) {
        lastError = null;

        String htmlBody = "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #FAFAF8; border-radius: 12px; border: 1px solid #E8E5E0;\">"
                + "<div style=\"text-align: center; padding-bottom: 24px; border-bottom: 1px solid #E8E5E0;\">"
                + "<h2 style=\"margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.05em; color: #2C2623; text-transform: uppercase;\">Derma Aline Aesth\u00e9tics</h2>"
                + "<p style=\"margin: 4px 0 0 0; font-size: 12px; letter-spacing: 0.1em; color: #8F857D; text-transform: uppercase;\">Skin Clinic & Aesthetic Centre</p>"
                + "</div>"
                + "<div style=\"padding: 24px 0; color: #3E3834; font-size: 15px; line-height: 1.7;\">"
                + body.replace("\n", "<br/>")
                + "</div>"
                + "<div style=\"margin-top: 24px; padding-top: 16px; border-top: 1px solid #E8E5E0; text-align: center; font-size: 12px; color: #A09891;\">"
                + "<p style=\"margin: 0;\">Derma Aline Aesth\u00e9tics Skin Clinic &bull; +91 93195 44704</p>"
                + "<p style=\"margin: 4px 0 0 0;\"><a href=\"https://derma-aline.vercel.app\" style=\"color: #8F857D; text-decoration: underline;\">Visit Official Clinic Portal</a></p>"
                + "</div>"
                + "</div>";

        // 1. Primary: Brevo HTTPS API (Port 443 - Instant cloud delivery without SMTP port blocking)
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty()) {
            if (sendViaBrevoHttpApi(to, subject, body, htmlBody)) {
                return true;
            }
        }

        // 2. Secondary: Resend HTTP API (Port 443)
        if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
            if (sendViaResendHttpApi(to, subject, body, htmlBody)) {
                return true;
            }
        }

        // 3. Fallback: Google SMTP (smtp.gmail.com)
        if (sendViaGoogleSmtp(to, subject, body, htmlBody)) {
            return true;
        }

        return false;
    }

    private boolean sendViaGoogleSmtp(String to, String subject, String textBody, String htmlBody) {
        if (mailSender == null) {
            lastError = "Google SMTP JavaMailSender is not initialized";
            return false;
        }
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail, "Derma Aline Aesthétics");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(textBody, htmlBody);

            mailSender.send(mimeMessage);
            logger.info("Email dispatched successfully via Google SMTP to {}", to);
            return true;
        } catch (Exception e) {
            lastError = "Google SMTP error: " + e.getMessage();
            logger.warn("Google SMTP dispatch notice: {}", e.getMessage());
            return false;
        }
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
                "Warm regards,\n"
                + "Derma Aline Aesthetics Team\n"
                + "https://derma-aline.vercel.app";

        return sendEmail(to, subject, body);
    }
}
