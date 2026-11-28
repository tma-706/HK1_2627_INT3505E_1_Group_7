ALTER TABLE public.identity_accounts
    ADD COLUMN role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    ADD COLUMN moderation_until timestamptz;

CREATE TABLE public.identity_login_windows (
    email_normalized text PRIMARY KEY,
    failures timestamptz[] NOT NULL DEFAULT '{}' CHECK (cardinality(failures) <= 4),
    locked_until timestamptz,
    discard_after timestamptz NOT NULL,
    CHECK (locked_until IS NULL OR (locked_until = discard_after AND cardinality(failures) = 0))
);
CREATE INDEX identity_login_windows_expiry ON public.identity_login_windows (discard_after);

CREATE TABLE public.identity_sessions (
    token_digest bytea PRIMARY KEY CHECK (octet_length(token_digest) = 32),
    account_id uuid NOT NULL REFERENCES public.identity_accounts ON DELETE CASCADE,
    issued_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL CHECK (expires_at = issued_at + interval '8 hours'),
    revoked_at timestamptz
);
CREATE INDEX identity_sessions_expiry ON public.identity_sessions (expires_at);
