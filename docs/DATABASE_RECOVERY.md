# Database Schema, Backup & Recovery Guide

## 1. Schema Management & Data Safety Rules
- **Flyway Migrations**: Managed by Flyway (`backend/src/main/resources/db/migration/V1__baseline_schema.sql` and `V2__add_indexes_and_constraints.sql`) with `spring.flyway.baseline-on-migrate=true` and `spring.flyway.baseline-version=0`.
- **Hibernate Validation**: `spring.jpa.hibernate.ddl-auto=${JPA_DDL_AUTO:validate}` verifies JPA entity schemas strictly against migrated tables without auto-altering or dropping data.
- **Zero Destructive Migrations**: No migration or system cleanup step drops columns, wipes `audit_logs`, or resets live admin/treatment data automatically.

## 2. Database Engine & Connection Pooling
- **Provider**: Supabase PostgreSQL (`jdbc:postgresql://...` with `prepareThreshold=0`, `preparedStatementCacheQueries=0`, `preferQueryMode=simple` for PgBouncer compatibility).
- **Pooler Configuration**: HikariCP configured in `backend/src/main/resources/application.properties` (`maximum-pool-size=10`, `minimum-idle=2`, `connection-timeout=10000`).

## 3. Indexes Applied Non-Destructively (Flyway V2)
- `idx_users_email` on `users (email)`
- `idx_appointments_slot` on `appointments (appointment_date, status)`
- `idx_appointments_customer_email` on `appointments (customer_email)`
- `idx_appointments_treatment` on `appointments (treatment_name)`
- `idx_otps_email_purpose_created` on `email_verification_otps (email, purpose, created_at)`
- `idx_staff_invitations_token` on `staff_invitations (token)`
- `idx_audit_logs_created` on `audit_logs (created_at)`
- `idx_notifications_recipient` on `notifications (recipient_email, is_read)`
- `idx_rate_limit_window` on `rate_limit_buckets (window_start_ms)`

## 4. Backup & Disaster Recovery Procedure
1. **Automated Daily Backups (Supabase)**:
   - Verify scheduled daily backups and Point-in-Time Recovery (PITR) are enabled under Supabase Dashboard -> Database -> Backups.
2. **Manual Logical Snapshot Before Schema or Code Releases**:
   ```bash
   pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl -f "derma_aline_backup_$(date +%Y%m%d_%H%M%S).dump"
   ```
3. **Restore Verification (Staging / Recovery)**:
   ```bash
   pg_restore --clean --if-exists --no-owner --no-acl -d "$TARGET_DATABASE_URL" derma_aline_backup_YYYYMMDD_HHMMSS.dump
   ```
4. **Post-Restore Checks**:
   - Confirm row counts across `users`, `customers`, `appointments`, `treatment_records`, `treatments`, `contact_messages`, and `audit_logs`.
   - Confirm clinic health check `/api/health` returns HTTP 200.
