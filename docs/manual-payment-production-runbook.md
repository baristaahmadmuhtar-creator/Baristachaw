# Manual Payment Production Runbook

This runbook outlines the process for managing and verifying manual payments in production for Baristachaw.

## System Configuration

Manual payment processing relies on the following environment variables:

- `MANUAL_PAYMENT_ENABLED`: Must be set to `true` (or `1`) to enable the manual checkout flow.
- `SUPABASE_STORAGE_BUCKET_PROOF`: The name of the private Supabase storage bucket where proof screenshots/PDFs are uploaded (defaults to `payment-proofs`).
- `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: Service role access configuration to sign uploads/downloads.
- `MANUAL_PAYMENT_WHATSAPP_NUMBER`: The customer service support WhatsApp number displayed in the client UI.

## Admin Verification Flow

When a user submits a manual payment request, their status is set to `receipt_received`. The request appears in the Admin Management interface under the **Manual payment queue**.

### Step 1: Accessing the Queue
1. Log in to the admin panel.
2. Go to the Admin Management section.
3. Locate the **Manual payment queue** panel.

### Step 2: Reviewing the Proof
1. Locate the pending request (marked as `receipt_received` or `pending_review` with proof attached).
2. Click the **View Proof** button.
3. This generates a secure, single-use, 2-minute signed URL from the private storage bucket and opens the receipt image/PDF in a new tab.
4. Verify the bank receipt details (sender name, amount matching the unique suffix, reference code, transaction date).

### Step 3: Taking Action
- **Verify Paid**: If the transaction is valid and matches the bank records, click **Verify Paid**. This immediately activates the user's paid entitlement (Starter/Pro plan) and marks the billing provider as `manual`.
- **Reject**: If the receipt is invalid, forged, or wrong, click **Reject**. You must input a reason (minimum 3 characters) which is recorded in the transaction history and audit log.
- **Downgrade Free**: To revoke access or reverse a verification, click **Downgrade Free** and provide a reason.

## Troubleshooting

### "Manual payment storage is not ready" (503 Error)
If users receive a 503 error when clicking "Kirim Bukti", check the server logs. This occurs if:
1. `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_URL` is missing.
2. The private bucket specified in `SUPABASE_STORAGE_BUCKET_PROOF` has not been created in Supabase Storage. Ensure it is created and set to **Private**.

### "Gagal memuat preview bukti transfer"
If the admin clicks "View Proof" and gets an error:
1. Ensure the Vercel serverless function has access to Supabase.
2. Verify that the file actually exists in the bucket by checking the Supabase storage console for the file named `${paymentRequestId}_...`.
