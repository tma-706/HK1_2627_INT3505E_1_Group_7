#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
dbid=$(docker run -d --rm -e POSTGRES_PASSWORD=pilot_fixture -p 127.0.0.1::5432 postgres:16-alpine)
cleanup() { docker stop "$dbid" >/dev/null 2>&1 || true; }
trap cleanup EXIT
for _ in {1..60}; do
  docker exec "$dbid" pg_isready -h 127.0.0.1 -U postgres >/dev/null && break
  sleep 1
done
docker exec -i "$dbid" psql -v ON_ERROR_STOP=1 -U postgres < db/migrations/001_identity.sql
dbport=$(docker port "$dbid" 5432/tcp | cut -d: -f2)
export DATABASE_URL="postgres://postgres:pilot_fixture@127.0.0.1:$dbport/postgres"
npm run build
node --test tests/integration/core-identity.test.mjs
