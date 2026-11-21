package com.dermaaline.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseFixRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseFixRunner.class);

    @Bean
    public CommandLineRunner ensureDatabaseSchemaConsistency(JdbcTemplate jdbcTemplate) {
        return args -> {
            logger.info("Running database schema synchronization and column verification...");

            String[] ddlStatements = {
                // 1. Users table columns and default normalization
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(255);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'CUSTOMER';",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_picture TEXT;",
                "UPDATE users SET status = 'ACTIVE' WHERE status IS NULL;",
                "UPDATE users SET role = 'CUSTOMER' WHERE role IS NULL;",
                "UPDATE users SET role = 'SUPER_ADMIN' WHERE email IN ('dermaalineaesthetics@gmail.com', 'apurvdwivedi2205@gmail.com');",

                // 2. Appointments table backward-compatible column mappings
                "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);",
                "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);",
                "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);",
                "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS email VARCHAR(255);",
                "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(255);",
                "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone VARCHAR(255);",
                "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';",
                "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;",
                "UPDATE appointments SET customer_name = patient_name WHERE customer_name IS NULL AND patient_name IS NOT NULL;",
                "UPDATE appointments SET patient_name = customer_name WHERE patient_name IS NULL AND customer_name IS NOT NULL;",
                "UPDATE appointments SET customer_email = email WHERE customer_email IS NULL AND email IS NOT NULL;",
                "UPDATE appointments SET email = customer_email WHERE email IS NULL AND customer_email IS NOT NULL;",
                "UPDATE appointments SET customer_phone = phone WHERE customer_phone IS NULL AND phone IS NOT NULL;",
                "UPDATE appointments SET phone = customer_phone WHERE phone IS NULL AND customer_phone IS NOT NULL;",

                // 3. Contact Messages table status column
                "ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'UNREAD';",
                "UPDATE contact_messages SET status = 'UNREAD' WHERE status IS NULL;",

                // 4. Staff invitations table verification
                "CREATE TABLE IF NOT EXISTS staff_invitations (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "email VARCHAR(255) NOT NULL, " +
                    "full_name VARCHAR(255), " +
                    "phone VARCHAR(255), " +
                    "designation VARCHAR(255), " +
                    "token VARCHAR(255), " +
                    "status VARCHAR(50) DEFAULT 'INVITED', " +
                    "expires_at TIMESTAMP, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);",
                "ALTER TABLE staff_invitations ADD COLUMN IF NOT EXISTS phone VARCHAR(255);",
                "ALTER TABLE staff_invitations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'INVITED';",

                // 5. Treatment Records table verification and completed appointment sync
                "CREATE TABLE IF NOT EXISTS treatment_records (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "customer_id BIGINT DEFAULT 0, " +
                    "customer_name VARCHAR(255), " +
                    "customer_email VARCHAR(255), " +
                    "customer_phone VARCHAR(255), " +
                    "treatment_name VARCHAR(255), " +
                    "treatment_category VARCHAR(255), " +
                    "practitioner_name VARCHAR(255), " +
                    "treatment_date DATE DEFAULT CURRENT_DATE, " +
                    "description TEXT, " +
                    "clinical_notes TEXT, " +
                    "aftercare_instructions TEXT, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS customer_id BIGINT DEFAULT 0;",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS treatment_name VARCHAR(255);",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS treatment_date DATE DEFAULT CURRENT_DATE;",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS practitioner_name VARCHAR(255);",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS clinical_notes TEXT;",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS aftercare_instructions TEXT;",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS description TEXT;",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
                "ALTER TABLE treatment_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",

                // Backfill completed appointments into treatment_records so completed visits immediately appear in clinical logs
                "INSERT INTO treatment_records (" +
                    "customer_id, customer_email, customer_name, treatment_name, " +
                    "treatment_date, practitioner_name, clinical_notes, " +
                    "aftercare_instructions, created_at, updated_at) " +
                "SELECT " +
                    "0, " +
                    "COALESCE(LOWER(customer_email), LOWER(email), 'patient@dermaaline.com'), " +
                    "COALESCE(customer_name, patient_name, 'Valued Client'), " +
                    "treatment_name, " +
                    "COALESCE(CAST(appointment_date AS DATE), CURRENT_DATE), " +
                    "'Derma Aline Specialist', " +
                    "COALESCE(notes, 'Completed clinical session.'), " +
                    "'Keep the treated area clean, hydrated, and protected with broad-spectrum SPF 50+ sunscreen daily.', " +
                    "CURRENT_TIMESTAMP, " +
                    "CURRENT_TIMESTAMP " +
                "FROM appointments a " +
                "WHERE UPPER(a.status) = 'COMPLETED' " +
                "  AND NOT EXISTS (" +
                    "SELECT 1 FROM treatment_records tr " +
                    "WHERE LOWER(tr.customer_email) = LOWER(COALESCE(a.customer_email, a.email)) " +
                    "  AND LOWER(tr.treatment_name) = LOWER(a.treatment_name)" +
                ");",

                // 6. Email OTPs table verification
                "CREATE TABLE IF NOT EXISTS email_verification_otps (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "email VARCHAR(255) NOT NULL, " +
                    "hashed_otp VARCHAR(255) NOT NULL, " +
                    "attempts INT DEFAULT 0, " +
                    "expires_at TIMESTAMP NOT NULL, " +
                    "last_sent_at TIMESTAMP NOT NULL, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);",

                // 7. Clinic settings table verification
                "CREATE TABLE IF NOT EXISTS clinic_settings (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "clinic_name VARCHAR(255), " +
                    "tagline VARCHAR(255), " +
                    "phone VARCHAR(255), " +
                    "email VARCHAR(255), " +
                    "address TEXT, " +
                    "operating_hours VARCHAR(255), " +
                    "notice_banner TEXT, " +
                    "notice_banner_active BOOLEAN DEFAULT FALSE, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);",

                // 8. Audit logs table verification
                "CREATE TABLE IF NOT EXISTS audit_logs (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "action VARCHAR(255), " +
                    "performed_by VARCHAR(255), " +
                    "role VARCHAR(255), " +
                    "target_entity VARCHAR(255), " +
                    "target_id VARCHAR(255), " +
                    "details TEXT, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);",
                "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255);",
                "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS role VARCHAR(255);",
                "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_entity VARCHAR(255);",
                "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id VARCHAR(255);",
                "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;",
                "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
                "DELETE FROM audit_logs;",

                // 9. Notifications table verification
                "CREATE TABLE IF NOT EXISTS notifications (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "recipient_email VARCHAR(255), " +
                    "recipient_role VARCHAR(255), " +
                    "title VARCHAR(255), " +
                    "message TEXT, " +
                    "is_read BOOLEAN DEFAULT FALSE, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
            };

            for (String sql : ddlStatements) {
                try {
                    jdbcTemplate.execute(sql);
                } catch (Exception e) {
                    logger.debug("Database migration step notice for query [{}]: {}", sql, e.getMessage());
                }
            }
            logger.info("Database schema synchronization finished successfully.");
        };
    }
}
