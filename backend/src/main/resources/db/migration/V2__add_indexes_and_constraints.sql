-- ============================================================================
-- V2: Non-Destructive Performance & Integrity Indexes
-- Compatible with both PostgreSQL and H2 PostgreSQL compatibility mode.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments (appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_email ON appointments (customer_email);
CREATE INDEX IF NOT EXISTS idx_appointments_treatment ON appointments (treatment_name);
CREATE INDEX IF NOT EXISTS idx_otps_email_purpose_created ON email_verification_otps (email, purpose, created_at);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations (token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_email, is_read);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_buckets (window_start_ms);
