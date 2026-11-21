BEGIN;

CREATE TABLE accounts (
    id uuid PRIMARY KEY,
    google_sub text UNIQUE NOT NULL,
    email text NOT NULL,
    display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 100),
    avatar_url text,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE sessions (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id),
    token_hash bytea UNIQUE NOT NULL CHECK (octet_length(token_hash) = 32),
    device_type text NOT NULL CHECK (device_type IN ('android', 'ios')),
    created_at timestamptz NOT NULL,
    last_activity_at timestamptz NOT NULL,
    revoked_at timestamptz
);

CREATE TABLE login_attempts (
    attempt_id uuid PRIMARY KEY,
    session_id uuid UNIQUE NOT NULL REFERENCES sessions(id),
    google_token_fingerprint bytea NOT NULL CHECK (octet_length(google_token_fingerprint) = 32),
    original_token_expires_at timestamptz NOT NULL,
    replay_key_version text NOT NULL,
    created_at timestamptz NOT NULL
);

COMMIT;
