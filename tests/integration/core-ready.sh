#!/usr/bin/env bash
set -eu
cd "$(dirname "$0")/../.."
dbid=$(docker run -d --rm -e POSTGRES_PASSWORD=pilot_fixture -p 127.0.0.1::5432 postgres:16-alpine)
pid=''
cleanup(){ if [ -n "$pid" ]; then kill "$pid" 2>/dev/null || true; fi; docker stop "$dbid" >/dev/null 2>&1 || true; }
trap cleanup EXIT
for i in {1..60}; do docker exec "$dbid" pg_isready -h 127.0.0.1 -U postgres >/dev/null && break; sleep 1; done

dbport=$(docker port "$dbid" 5432/tcp | cut -d: -f2)
export DATABASE_URL="postgres://postgres:pilot_fixture@127.0.0.1:$dbport/postgres"
export PORT=${PORT:-8091}
npm run build
node apps/core/dist/api.js &
pid=$!
for i in {1..50}; do kill -0 "$pid"; curl -fsS "http://127.0.0.1:$PORT/health/ready" >/dev/null 2>&1 && break; sleep .2; done
kill -0 "$pid"
node tests/integration/assert-ready.mjs 200 ok
docker stop "$dbid" >/dev/null
node tests/integration/assert-ready.mjs 503 unavailable
