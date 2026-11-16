package com.dermaaline.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:dermaalineskinaesthetics@gmail.com}")
    private String fromEmail;

    public boolean sendEmail(String to, String subject, String body) {
        if (mailSender == null) {
            logger.warn("JavaMailSender is not configured. Email to {} could not be sent. Subject: {}", to, subject);
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            message.setFrom(fromEmail);

            mailSender.send(message);
            logger.info("Email dispatched successfully to {}", to);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send email to {}: {}", to, e.getMessage());
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
