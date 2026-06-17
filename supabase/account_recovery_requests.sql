-- Migration: account_recovery_requests
-- Creates table to store forgotten email / account recovery requests.

CREATE TABLE IF NOT EXISTS public.account_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email text NOT NULL,
  normalized_contact_email text NOT NULL,
  display_name_hint text NOT NULL DEFAULT '',
  provider_hint text NOT NULL DEFAULT 'unknown',
  country text,
  evidence text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
  admin_note text NOT NULL DEFAULT '',
  request_ip_hash text NOT NULL DEFAULT '',
  user_agent_hash text NOT NULL DEFAULT '',
  matched_user_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_recovery_requests ENABLE ROW LEVEL SECURITY;

-- No public select policies, to prevent leaking data
-- Insert allowed only by service role (which overrides RLS) or a specific policy if needed.
-- Since backend uses service_role key to insert, we do not need to add an INSERT policy for authenticated/anon.

-- Optional: add trigger for updated_at
CREATE OR REPLACE FUNCTION update_account_recovery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_account_recovery_updated_at ON public.account_recovery_requests;
CREATE TRIGGER trg_account_recovery_updated_at
BEFORE UPDATE ON public.account_recovery_requests
FOR EACH ROW EXECUTE FUNCTION update_account_recovery_updated_at();

-- Add indices
CREATE INDEX IF NOT EXISTS idx_account_recovery_status ON public.account_recovery_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_recovery_email ON public.account_recovery_requests(normalized_contact_email);
