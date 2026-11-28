\set ON_ERROR_STOP on
\getenv core_password CORE_DB_PASSWORD

BEGIN;
SELECT pg_advisory_xact_lock(141501);
CREATE TABLE IF NOT EXISTS public.schema_migrations (version text PRIMARY KEY);
SELECT NOT EXISTS (SELECT FROM public.schema_migrations WHERE version = '001') AS apply_migration \gset
\if :apply_migration
    \ir migrations/001_public_posts.sql
    INSERT INTO public.schema_migrations VALUES ('001');
\endif

SELECT NOT EXISTS (SELECT FROM public.schema_migrations WHERE version = '002') AS apply_migration \gset
\if :apply_migration
    \ir migrations/002_private_media.sql
    INSERT INTO public.schema_migrations VALUES ('002');
\endif

SELECT NOT EXISTS (SELECT FROM public.schema_migrations WHERE version = '003') AS apply_migration \gset
\if :apply_migration
    \ir migrations/003_account_verification.sql
    INSERT INTO public.schema_migrations VALUES ('003');
\endif

SELECT 'CREATE ROLE core_reader LOGIN' WHERE NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'core_reader'
) \gexec
ALTER ROLE core_reader PASSWORD :'core_password';
GRANT CONNECT ON DATABASE campus TO core_reader;
GRANT USAGE ON SCHEMA public TO core_reader;
GRANT SELECT ON public.posts TO core_reader;

\getenv media_password MEDIA_DB_PASSWORD
SELECT 'CREATE ROLE core_media LOGIN' WHERE NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'core_media'
) \gexec
ALTER ROLE core_media PASSWORD :'media_password';
GRANT CONNECT ON DATABASE campus TO core_media;
GRANT USAGE ON SCHEMA public TO core_media;
GRANT SELECT ON public.media_members, public.media_sessions, public.media_uploads TO core_media;
GRANT INSERT ON public.media_uploads TO core_media;

\getenv identity_password IDENTITY_DB_PASSWORD
\getenv worker_password IDENTITY_WORKER_DB_PASSWORD
SELECT 'CREATE ROLE core_identity LOGIN' WHERE NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'core_identity'
) \gexec
SELECT 'CREATE ROLE identity_worker LOGIN' WHERE NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'identity_worker'
) \gexec
ALTER ROLE core_identity PASSWORD :'identity_password';
ALTER ROLE identity_worker PASSWORD :'worker_password';
GRANT CONNECT ON DATABASE campus TO core_identity, identity_worker;
GRANT USAGE ON SCHEMA public TO core_identity, identity_worker;
GRANT SELECT, INSERT ON public.identity_accounts, public.identity_verification_tokens,
    public.identity_email_receipts, public.identity_resend_windows TO core_identity;
GRANT UPDATE (verified_at) ON public.identity_accounts TO core_identity;
GRANT UPDATE (consumed_at) ON public.identity_verification_tokens TO core_identity;
GRANT UPDATE (accepted_at) ON public.identity_resend_windows TO core_identity;
GRANT INSERT ON public.identity_email_jobs TO core_identity;
GRANT SELECT (account_id, email_normalized, verified_at) ON public.identity_accounts TO identity_worker;
GRANT SELECT (token_digest, account_id, expires_at) ON public.identity_verification_tokens TO identity_worker;
GRANT SELECT, UPDATE ON public.identity_email_jobs TO identity_worker;

\ir fixtures/public-posts.sql
COMMIT;
