CREATE TABLE public.identity_password_reset_tokens (
    token_digest bytea PRIMARY KEY CHECK (octet_length(token_digest) = 32),
    account_id uuid NOT NULL REFERENCES public.identity_accounts,
    issued_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL CHECK (expires_at = issued_at + interval '30 minutes'),
    consumed_at timestamptz,
    revoked_at timestamptz,
    CHECK (consumed_at IS NULL OR revoked_at IS NULL)
);

CREATE INDEX identity_password_reset_tokens_account ON public.identity_password_reset_tokens (account_id)
    WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE TABLE public.identity_password_reset_windows (
    email_normalized text PRIMARY KEY,
    first_at timestamptz,
    resent_at timestamptz[] NOT NULL DEFAULT '{}' CHECK (cardinality(resent_at) <= 3),
    discard_after timestamptz NOT NULL
);

CREATE INDEX identity_password_reset_windows_expiry ON public.identity_password_reset_windows (discard_after);

CREATE TABLE public.identity_password_reset_jobs (
    event_id uuid PRIMARY KEY,
    token_digest bytea NOT NULL UNIQUE REFERENCES public.identity_password_reset_tokens,
    encrypted_token text,
    state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'SENDING', 'SENT', 'DEAD')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 4),
    next_attempt_at timestamptz NOT NULL,
    lease_id uuid,
    lease_until timestamptz,
    terminal_reason text CHECK (terminal_reason IN ('expired', 'invalidated', 'delivery_failed')),
    CHECK ((state = 'SENDING') = (lease_id IS NOT NULL AND lease_until IS NOT NULL)),
    CHECK ((state IN ('SENT', 'DEAD')) = (encrypted_token IS NULL))
);

CREATE INDEX identity_password_reset_jobs_ready ON public.identity_password_reset_jobs (next_attempt_at, event_id)
    WHERE state IN ('PENDING', 'SENDING');
