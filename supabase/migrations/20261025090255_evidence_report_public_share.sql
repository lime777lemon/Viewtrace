-- Login-free Evidence Report. The token is the only access. Service role reads and writes it.

CREATE TABLE IF NOT EXISTS public.evidence_report_shares (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_report_shares_token CHECK (token ~ '^[a-f0-9]{48}$'),
  CONSTRAINT evidence_report_shares_subject_len CHECK (char_length(subject) BETWEEN 1 AND 300),
  CONSTRAINT evidence_report_shares_body_len CHECK (char_length(body) BETWEEN 1 AND 200000)
);

COMMENT ON TABLE public.evidence_report_shares IS
  'Snapshot of a sent Evidence Report. Anyone with the token can read it. No login.';

ALTER TABLE public.evidence_report_shares ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.evidence_report_shares FROM anon;
REVOKE ALL ON TABLE public.evidence_report_shares FROM authenticated;
REVOKE ALL ON TABLE public.evidence_report_shares FROM PUBLIC;
