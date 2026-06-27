-- Baristachaw v1.0.5 admin payment/plan hardening patch.
-- Safe to run more than once in Supabase SQL Editor.
-- Purpose:
-- 1) Let payment_receipts store both legacy and modern manual payment lifecycle statuses.
-- 2) Add indexes for admin payment queues and past-due account management.

alter table public.payment_receipts
  drop constraint if exists payment_receipts_status_check;

alter table public.payment_receipts
  add constraint payment_receipts_status_check
  check (
    status in (
      'queued',
      'pending_review',
      'receipt_received',
      'auto_accepted',
      'manual_review',
      'rejected',
      'applied',
      'verified_paid',
      'expired'
    )
  ) not valid;

create index if not exists app_users_past_due_period_idx
  on public.app_users (billing_period_end, updated_at desc)
  where billing_status = 'past_due'
     or status = 'past_due'
     or payment_action_required = true;

create index if not exists payment_receipts_modern_review_queue_idx
  on public.payment_receipts (status, updated_at desc)
  where status in ('queued', 'pending_review', 'receipt_received', 'manual_review');

select
  'admin_payment_plan_hardening_patch_applied' as status,
  now() as checked_at;
