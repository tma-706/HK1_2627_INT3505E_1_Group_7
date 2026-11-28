CREATE TABLE public.identity_accounts (
    account_id uuid PRIMARY KEY,
    email_normalized text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    verified_at timestamptz
);

CREATE TABLE public.identity_verification_tokens (
    token_digest bytea PRIMARY KEY CHECK (octet_length(token_digest) = 32),
    account_id uuid NOT NULL REFERENCES public.identity_accounts,
    issued_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL CHECK (expires_at = issued_at + interval '15 minutes'),
    consumed_at timestamptz
);

CREATE TABLE public.identity_email_receipts (
    request_id uuid PRIMARY KEY,
    received_at timestamptz NOT NULL
);

CREATE TABLE public.identity_resend_windows (
    email_normalized text PRIMARY KEY,
    accepted_at timestamptz[] NOT NULL DEFAULT '{}'
        CHECK (cardinality(accepted_at) <= 3)
);

CREATE TABLE public.identity_email_jobs (
    event_id uuid PRIMARY KEY,
    token_digest bytea NOT NULL UNIQUE REFERENCES public.identity_verification_tokens,
    encrypted_token text,
    state text NOT NULL DEFAULT 'PENDING'
        CHECK (state IN ('PENDING', 'SENDING', 'SENT', 'DEAD')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 4),
    next_attempt_at timestamptz NOT NULL,
    lease_id uuid,
    lease_until timestamptz,
    terminal_reason text CHECK (terminal_reason IN ('expired', 'verified', 'delivery_failed')),
    CHECK ((state = 'SENDING') = (lease_id IS NOT NULL AND lease_until IS NOT NULL)),
    CHECK ((state IN ('SENT', 'DEAD')) = (encrypted_token IS NULL))
);

CREATE INDEX identity_email_jobs_ready ON public.identity_email_jobs (next_attempt_at, event_id)
    WHERE state IN ('PENDING', 'SENDING');
