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

SELECT 'CREATE ROLE core_reader LOGIN' WHERE NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'core_reader'
) \gexec
ALTER ROLE core_reader PASSWORD :'core_password';
GRANT CONNECT ON DATABASE campus TO core_reader;
GRANT USAGE ON SCHEMA public TO core_reader;
GRANT SELECT ON public.posts TO core_reader;

\ir fixtures/public-posts.sql
COMMIT;
