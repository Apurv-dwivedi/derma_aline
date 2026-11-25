# Derma Aline Aesthetics Skin Clinic — Production Deployment & Operations Guide

## 1. Safe Environment Templates (Zero Secrets)
- Backend template: [`backend/.env.example`](../backend/.env.example)
- Frontend template: [`frontend/.env.example`](../frontend/.env.example)
- Never commit real credentials or `.env`, `.env.local`, `.env.production`, or `creds.txt` files. Local `.gitignore` excludes all private environment files, credential files, `node_modules/`, `target/`, `dist/`, `.idea/`, `.vscode/`, and `*.zip`.

---

## 2. Required Environment Variables

### Render (Backend Web Service — `backend/Dockerfile`)
| Variable | Purpose | Production Value Guidance |
| :--- | :--- | :--- |
| `SPRING_DATASOURCE_URL` | Supabase PostgreSQL JDBC URL | `jdbc:postgresql://db.<PROJECT_REF>.supabase.co:5432/postgres?prepareThreshold=0&preparedStatementCacheQueries=0&preferQueryMode=simple` |
| `SPRING_DATASOURCE_USERNAME` | PostgreSQL user | `postgres` (or pooler user) |
| `SPRING_DATASOURCE_PASSWORD` | PostgreSQL password | Rotated high-entropy password |
| `JWT_SECRET` | HS256 JWT signing secret (>= 32 chars required) | Newly generated 64-char random hex secret |
| `JWT_EXPIRATION_MS` | Token lifetime (ms) | `86400000` (24h) |
| `FRONTEND_URL` | Canonical frontend URL | `https://derma-aline.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact allowed browser origins | `https://derma-aline.vercel.app` (never include `*`) |
| `PORT` | HTTP listener port | Provided automatically by Render (default `8081`) |
| `APPOINTMENTS_MAX_PER_SLOT` | Concurrent active bookings allowed per time slot | `1` (or clinic room capacity) |
| `APPOINTMENTS_OPEN_HOUR` | Clinic opening hour (24h, clinic TZ) | `10` |
| `APPOINTMENTS_CLOSE_HOUR` | Clinic closing hour (24h, exclusive last start) | `20` |
| `CLINIC_TIMEZONE` | Timezone for past-slot checks | `Asia/Kolkata` |
| `BREVO_API_KEY` | Primary HTTPS Port 443 email OTP delivery | Rotated Brevo v3 API key |
| `BREVO_SENDER_EMAIL` | Verified Brevo sender email | Clinic sender address |
| `SPRING_MAIL_USERNAME` | Gmail SMTP fallback username | Clinic Gmail address |
| `SPRING_MAIL_PASSWORD` | Gmail SMTP fallback 16-char App Password | Rotated Google App Password |
| `SUPABASE_URL` | Supabase project URL for SSO token check | `https://<PROJECT_REF>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase public anon key | Rotated Supabase anon key |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret for local token verification | Rotated Supabase JWT secret |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STAFF_EMAIL`, `STAFF_PASSWORD` | Optional bootstrap overrides | Leave **blank** once initial accounts exist in DB |

### Vercel (Frontend Static Site — Root Directory `frontend`)
| Variable | Purpose | Production Value Guidance |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Spring Boot backend base URL | `https://derma-aline.onrender.com/api` |
| `VITE_SUPABASE_URL` | Public Supabase project URL | `https://<PROJECT_REF>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon key (safe browser-side key) | Rotated Supabase anon key |

Note: All `VITE_*` variables are compiled into client browser bundles. Never place `BREVO_API_KEY`, `SPRING_MAIL_PASSWORD`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`, or `SUPABASE_JWT_SECRET` in `frontend/.env`.

---

## 3. Deployment Platform Setup

### Vercel Frontend Deployment
1. Set **Root Directory** to `frontend`.
2. Build Command: `npm run build` | Output Directory: `dist`.
3. Configure the three `VITE_*` environment variables above for Production and Preview environments.
4. Security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and `Content-Security-Policy`) plus SPA rewrites are enforced by [`frontend/vercel.json`](../frontend/vercel.json).

### Render Backend Deployment
1. Set **Root Directory** to `backend` (uses multi-stage Docker build [`backend/Dockerfile`](../backend/Dockerfile) with Java 21).
2. Configure all backend environment variables listed in Section 2.
3. Verify `CORS_ALLOWED_ORIGINS` contains only your active Vercel domain(s), not localhost.

### Supabase Database & Security Setup
1. Use PgBouncer-compatible JDBC query flags (`prepareThreshold=0&preparedStatementCacheQueries=0&preferQueryMode=simple`).
2. Schema versioning is managed by **Flyway** (`backend/src/main/resources/db/migration/V1__baseline_schema.sql` and `V2__add_indexes_and_constraints.sql`) with `spring.flyway.baseline-on-migrate=true`, `baseline-version=0`, and `spring.jpa.hibernate.ddl-auto=validate`. All V1/V2 statements use additive `IF NOT EXISTS` DDL to preserve existing Supabase data.
3. Both appointment locking (`appointment_slot_locks`) and shared rate limits (`rate_limit_buckets`) are persisted in PostgreSQL to remain atomic and durable across restarts and multi-instance deployments.
4. Enable Row Level Security (RLS) on internal clinic tables (`users`, `appointments`, `appointment_slot_locks`, `rate_limit_buckets`, `treatment_records`, `customers`, `contact_messages`, `email_verification_otps`, `audit_logs`, `staff_invitations`) so direct `anon` PostgREST clients cannot access private clinic rows outside backend APIs.
5. See [`docs/DATABASE_RECOVERY.md`](./DATABASE_RECOVERY.md) for backup and `pg_dump`/`pg_restore` instructions.

### Email Provider Setup
1. Primary OTP delivery uses **Brevo HTTPS API** (Port 443, immune to Render outbound SMTP port blocking).
2. Secondary/fallback options use Resend HTTPS API (if `RESEND_API_KEY` set) and Gmail SMTP (`smtp.gmail.com:587` TLS with Google App Password).
3. Password reset strictly issues a 6-digit OTP email with no clickable reset links (`verify-reset-token` and token resets return `410 Gone`).

---

## 4. Build & Test Commands

### Backend (Isolated H2 PostgreSQL Compatibility Test Profile)
All Spring context and concurrency tests run with `@ActiveProfiles("test")` using `backend/src/test/resources/application-test.properties` (isolated in-memory H2 `MODE=PostgreSQL`), requiring **zero** access to Supabase PostgreSQL or production secrets.

```powershell
# Clean compile and execute full backend test suite (including contextLoads & DB concurrency tests)
mvn -f backend/pom.xml clean test
```

*Test Compatibility Note*: H2 `MODE=PostgreSQL` faithfully tests JPA pessimistic write row locking (`SELECT ... FOR UPDATE` on `appointment_slot_locks`) and `READ_COMMITTED` transactions across concurrent threads, while `AppointmentSlotLockService` executes PostgreSQL `INSERT ... ON CONFLICT (slot_key) DO NOTHING` in production and H2 `MERGE INTO ... KEY (slot_key)` in test mode. Before final launch, run one live smoke test against a staging Supabase PostgreSQL instance.

### Frontend
```powershell
# Validate dependencies & lint
npm --prefix frontend ls --depth=0
npm --prefix frontend run lint

# Production Vite build
npm --prefix frontend run build
```

---

## 5. Mandatory Pre-Launch Credential Rotation Checklist
Before going live, manually rotate any credential that existed in pre-hardening Git history or local workspace files:
- [ ] **Supabase PostgreSQL Password** (`SPRING_DATASOURCE_PASSWORD`)
- [ ] **Supabase Anon Key & JWT Secret** (`SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `VITE_SUPABASE_ANON_KEY`)
- [ ] **Backend JWT Signing Secret** (`JWT_SECRET` — fresh 64-char hex)
- [ ] **Brevo API Key** (`BREVO_API_KEY`)
- [ ] **Gmail SMTP App Password** (`SPRING_MAIL_PASSWORD`)
- [ ] **Clinic Admin & Staff Passwords** (`ADMIN_PASSWORD`, `STAFF_PASSWORD` / in-portal update)

---

## 6. Deployment Verification Checklist
1. `GET https://<render-backend>/api/health` returns HTTP `200` and Flyway logs confirm V1/V2 schema validation passed.
2. Register new client -> receives 6-digit OTP -> verifies account -> logs into `/client/dashboard` -> logout calls `POST /api/auth/logout` and revokes old JWT (`token_version`).
3. Admin invites staff (`POST /api/admin/staff/invitations`) -> receives single-use onboarding link (`/staff/activate?token=...`) with zero plaintext passwords -> staff sets personal password and logs in -> disabling staff immediately rejects active tokens.
4. Request client forgot-password -> receives 6-digit OTP (subject omits OTP; body contains OTP only; zero links) -> completes reset -> verifies old password and prior JWTs are rejected.
5. Book appointment on `/booking` or `/client/dashboard` -> verify treatment-based capacity allows concurrent distinct treatments while rejecting same-treatment overlap beyond `max-per-slot` with HTTP `409 Conflict`; verify **Cancel Visit** sets `CANCELLED` and opens the slot for rebooking.
6. Verify `/admin/audit-logs`, `/admin/staff/**`, `/admin/system/purge-all-data`, and `DELETE /api/customers/**` return HTTP `403` for `CUSTOMER` and `STAFF` tokens, and `DELETE /api/admin/audit-logs` returns `403` even for `ADMIN`.
7. Confirm responsive UI rendering at `360px`, `768px`, and `1440px` without horizontal scroll.
