# Landing Page Conversion and Payment Flow

This document details the end-to-end user conversion and manual payment flow in Baristachaw.

## Conversion Funnel

The funnel is optimized for maximum conversions with low friction:

```mermaid
graph TD
  A[Visitor on Landing Page] --> B{Logged In?}
  B -- No --> C[Hero: "Start brewing free" or "See member plans"]
  B -- Yes --> D[Hero: "Open App"]
  C --> E[Pricing: Choose Plan]
  E -- Free --> F[Register Modal: Input Email/Password]
  E -- Plus / Pro --> F
  F --> G{OTP Required?}
  G -- Yes --> H[Register Modal: Input OTP Code]
  G -- No --> I{Paid Plan chosen?}
  H --> I
  I -- No --> J[Auto-Redirect to Web App]
  I -- Yes --> K[Register Modal: Step 2 Checkout]
  K --> L[View QRIS / Bank accounts & Amount with unique suffix]
  L --> M[Upload payment proof file]
  M --> N[File uploaded directly to private storage & registered in DB]
  N --> O[Success Screen: Pending Admin Review]
  O --> P[Admin verifies in Admin Panel]
  P --> J
```

## Step Details

### 1. Plan Selection
- **Free Plan**: Transitions guest directly to free app access after registering.
- **Paid Plans (Plus / Pro)**: Prompts user to register/login first, then opens the manual payment checkout drawer. If already logged in, it directly displays checkout to avoid repeat login prompts.

### 2. User Authentication with OTP Fallback
- For new accounts, the server requests verification code validation if email confirmation is required.
- The modal switches dynamically to the OTP code entry screen without redirecting or reloading.
- Users can request to resend the code via "/api/auth/email/otp/send".
- For password recovery, users input their email, receive an OTP code, enter the OTP with their new password, and are automatically authenticated and logged in upon validation.

### 3. Manual Checkout & QRIS
- The billing API (`/api/billing/checkout`) persists the manual payment request to the database (`payment_receipts`).
- The user is shown the exact amount to transfer (modified with a random 3-digit unique suffix for IDR transactions to simplify reconciliation).
- The user scans the QRIS code or copies the bank account details.
- Once transferred, the user uploads their proof of transfer (JPEG, PNG, WebP, PDF up to 5MB).
- The frontend registers the metadata via `/api/billing/proof`, gets a signed upload destination URL, and uploads the file directly to the private `payment-proofs` Supabase bucket.

### 4. Admin Verification & Entitlement Activation
- The request appears in the admin panel queue.
- The admin views the proof securely (file remains private, viewable only via temporary signed URL).
- Approving grants the plan entitlement immediately.
