-- Weekly goal: verify a requested US state once. Separate from each Observation's country fallback.

CREATE TABLE IF NOT EXISTS public.state_coverage (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  week_start date NOT NULL,
  region_value text NOT NULL,
  url text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'verified', 'exhausted')),
  verified_observation_id uuid,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  weekly_retries integer NOT NULL DEFAULT 0 CHECK (weekly_retries >= 0),
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  PRIMARY KEY (user_id, week_start, region_value)
);

ALTER TABLE public.state_coverage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.state_coverage FROM anon, authenticated, PUBLIC;

COMMENT ON TABLE public.state_coverage IS
  'Whether a requested US state was exit-verified once in the JST week. Pending rows are retried. A country-level Observation does not verify the state.';
