# Auth OTP MVP Runbook

This runbook outlines the deployment and configuration steps required to fully enable the OTP-based Authentication MVP for Baristachaw, ensuring smooth migration and full web/mobile parity.

## 1. Supabase Dashboard Configuration

Because we have shifted from magic links/email templates to 6-digit OTP codes, you must manually update the Supabase Email Templates in the Supabase Dashboard.

### 1.1 Update Email Templates
Go to: **Supabase Dashboard -> Authentication -> Email Templates**

For **Confirm signup**, **Reset Password**, and **Magic Link**, modify the template content to use the `{{ .Token }}` variable instead of `{{ .ConfirmationURL }}`.

**Example for Confirm Signup:**
```html
<h2>Selamat datang di Baristachaw!</h2>
<p>Kode verifikasi pendaftaran Anda adalah: <strong>{{ .Token }}</strong></p>
<p>Masukkan kode ini di aplikasi untuk memverifikasi akun Anda.</p>
```

**Example for Reset Password:**
```html
<h2>Reset Password Baristachaw</h2>
<p>Kode reset password Anda adalah: <strong>{{ .Token }}</strong></p>
<p>Masukkan kode ini di aplikasi untuk membuat password baru.</p>
```

> **IMPORTANT:** Remove `{{ .ConfirmationURL }}` to prevent the email from rendering a clickable link that opens a browser window and breaks the in-app OTP flow.

### 1.2 Enable Phone/Email OTP Options
Go to: **Supabase Dashboard -> Authentication -> Providers -> Email**
- Ensure "Enable Email Signup" is ON.
- Ensure "Confirm email" is ON.
- Ensure "Secure email change" is ON.
- Enable "Enable OTP" if available/required for standard 6-digit emails.

## 2. Environment Variables

No new frontend environment variables are required. `SUPABASE_SERVICE_ROLE_KEY` must remain securely stored on the Vercel backend/server environment ONLY.

Ensure the following are set in the Vercel environment:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 3. Database Migrations

Apply the new `account_recovery_requests` table to support the "Forgot Email / Account Recovery" flow.

Run the migration script:
```bash
psql -h YOUR_SUPABASE_DB_HOST -U postgres -d postgres -f supabase/account_recovery_requests.sql
```

Ensure the Row Level Security (RLS) is applied so that only authenticated admins or service roles can view these requests.

## 4. Frontend & Backend Parity

- The frontend UI `EmailPasswordAuthForm` has been completely refactored to support inline OTP input.
- OTPs are sent securely via `/api/auth/email/otp/send` and verified via `/api/auth/email/otp/verify`.
- Account recovery requests are routed to `/api/auth/account-recovery`. It intentionally returns a generic success message to prevent "account enumeration / leak" attacks.

## 5. Mobile App (Expo)

To maintain parity, the Mobile App should reuse the same endpoints.
Instead of using `@supabase/supabase-js` directly to send magic links, the Mobile app should make `POST` requests to:
- `POST https://yourdomain.com/api/auth/email/otp/send`
- `POST https://yourdomain.com/api/auth/email/otp/verify`

This ensures rate-limits, error-handling, and logging remain perfectly synchronized between Web and Mobile.

## 6. Admin Manual Review for Account Recovery

When users use the "Lupa Email?" feature, their requests populate the `account_recovery_requests` table.
An admin must periodically check this table:
```sql
SELECT * FROM account_recovery_requests WHERE status = 'pending';
```
The admin will manually cross-reference the user's `contact_email` and `hints` against the `auth.users` table, and reach out to the user manually via the contact email provided.
