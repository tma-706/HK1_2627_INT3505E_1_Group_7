CREATE TABLE public.posts (
    post_id text COLLATE "C" PRIMARY KEY CHECK (length(post_id) > 0),
    type text NOT NULL CHECK (type IN ('lost', 'found')),
    title text NOT NULL CHECK (length(title) BETWEEN 5 AND 100),
    description text NOT NULL CHECK (length(description) BETWEEN 20 AND 2000),
    category_id text NOT NULL CHECK (length(category_id) > 0),
    area_id text NOT NULL CHECK (length(area_id) > 0),
    occurred_at timestamptz(3) NOT NULL,
    published_at timestamptz(3) NOT NULL,
    status text NOT NULL,
    visibility text NOT NULL,
    author_display_name text NOT NULL CHECK (length(author_display_name) BETWEEN 1 AND 100),
    share_url text NOT NULL,
    custody text CHECK (custody IN ('heldByFinder', 'handedToAuthorities')),
    CHECK ((type = 'found') = (custody IS NOT NULL))
);

CREATE INDEX posts_public_feed_idx ON public.posts (published_at DESC, post_id DESC)
    WHERE status = 'open' AND visibility = 'visible';
