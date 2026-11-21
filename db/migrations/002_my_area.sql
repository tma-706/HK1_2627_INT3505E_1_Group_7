BEGIN;

CREATE TABLE my_area_fixture_posts (
    id uuid PRIMARY KEY,
    tab text NOT NULL CHECK (tab IN ('lost', 'found')),
    author_id uuid NOT NULL REFERENCES accounts(id),
    title text NOT NULL CHECK (title <> ''),
    created_at timestamptz NOT NULL,
    status text NOT NULL CHECK (status <> ''),
    thumbnail_url text
);
COMMENT ON COLUMN my_area_fixture_posts.thumbnail_url IS
    'Source fixture thumbnail. For found posts, only the privacy-processed thumbnail is allowed.';

CREATE INDEX my_area_posts_by_author
    ON my_area_fixture_posts (author_id, tab, created_at DESC, id DESC);

CREATE TABLE my_area_fixture_claims (
    id uuid PRIMARY KEY,
    sender_id uuid NOT NULL REFERENCES accounts(id),
    post_owner_id uuid NOT NULL REFERENCES accounts(id),
    title text NOT NULL CHECK (title <> ''),
    sent_at timestamptz NOT NULL,
    status text NOT NULL CHECK (status <> ''),
    CHECK (sender_id <> post_owner_id)
);

CREATE INDEX my_area_claims_by_sender
    ON my_area_fixture_claims (sender_id, sent_at DESC, id DESC);
CREATE INDEX my_area_claims_by_owner
    ON my_area_fixture_claims (post_owner_id, sent_at DESC, id DESC);

CREATE TABLE my_area_cursors (
    token_hash bytea PRIMARY KEY CHECK (octet_length(token_hash) = 32),
    account_id uuid NOT NULL REFERENCES accounts(id),
    tab text NOT NULL CHECK (tab IN ('lost', 'found', 'claims')),
    boundary_at timestamptz NOT NULL,
    boundary_id uuid NOT NULL,
    expires_at timestamptz NOT NULL
);

CREATE INDEX my_area_cursors_by_expiry ON my_area_cursors (expires_at);

COMMIT;
