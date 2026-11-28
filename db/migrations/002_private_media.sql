CREATE TABLE public.media_members (
    member_id uuid PRIMARY KEY,
    email_verified boolean NOT NULL DEFAULT false,
    locked boolean NOT NULL DEFAULT false
);

CREATE TABLE public.media_sessions (
    token_hash text PRIMARY KEY,
    member_id uuid NOT NULL REFERENCES public.media_members,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz
);

CREATE TABLE public.media_uploads (
    upload_id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES public.media_members,
    idempotency_key text NOT NULL,
    purpose text NOT NULL CHECK (purpose = 'avatar'),
    content_type text NOT NULL,
    size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 10000000),
    sha256 text NOT NULL,
    object_key text NOT NULL UNIQUE,
    form_fields jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    upload_expires_at timestamptz NOT NULL,
    confirmation_expires_at timestamptz NOT NULL,
    UNIQUE (owner_id, idempotency_key)
);
