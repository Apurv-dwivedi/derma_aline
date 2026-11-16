package com.dermaaline.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:dermaalineskinaesthetics@gmail.com}")
    private String fromEmail;

    @Value("${spring.mail.password:iwtcifcnykbtljgz}")
    private String mailPassword;

    private String lastError;

    public String getLastError() {
        return lastError;
    }

    public boolean sendEmail(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        message.setFrom(fromEmail);

        // Attempt 1: Primary MailSender (port 587 STARTTLS)
        if (mailSender != null) {
            try {
                mailSender.send(message);
                logger.info("Email dispatched successfully via primary mail sender to {}", to);
                lastError = null;
                return true;
            } catch (Exception e) {
                logger.warn("Primary mail sender failed ({}), attempting SSL fallback on port 465...", e.getMessage());
                lastError = e.getMessage();
            }
        }

        // Attempt 2: Fallback to Port 465 SSL (SMTPS)
        try {
            JavaMailSenderImpl sslSender = new JavaMailSenderImpl();
            sslSender.setHost("smtp.gmail.com");
            sslSender.setPort(465);
            sslSender.setUsername(fromEmail);
            sslSender.setPassword(mailPassword);

            Properties sslProps = sslSender.getJavaMailProperties();
            sslProps.put("mail.transport.protocol", "smtps");
            sslProps.put("mail.smtp.auth", "true");
            sslProps.put("mail.smtp.ssl.enable", "true");
            sslProps.put("mail.smtp.ssl.trust", "*");
            sslProps.put("mail.smtp.connectiontimeout", "7000");
            sslProps.put("mail.smtp.timeout", "7000");
            sslProps.put("mail.smtp.writetimeout", "7000");

            sslSender.send(message);
            logger.info("Email dispatched successfully via SSL port 465 fallback to {}", to);
            lastError = null;
            return true;
        } catch (Exception ex2) {
            String combinedError = "Primary error: " + (lastError != null ? lastError : "not configured") + 
                    " | SSL Fallback error: " + ex2.getMessage();
            lastError = combinedError;
            logger.error("Failed to send email to {}: {}", to, combinedError);
            return false;
        }
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
