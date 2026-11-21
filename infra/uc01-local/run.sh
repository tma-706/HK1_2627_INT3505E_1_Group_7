#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
fixture_dir="$PWD/dist/uc01-local"
local_url="https://127.0.0.1:${UC01_HTTPS_PORT:-8443}"

compose() (
  # Ignore ambient production credentials. The overlay is a separate Compose project.
  unset GOOGLE_CLIENT_ID SESSION_REPLAY_KEY_VERSION SESSION_REPLAY_KEYS
  unset POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD
  docker compose -p lf-uc01-local --env-file .env.example --env-file "$fixture_dir/compose.env" \
    -f compose.yaml -f infra/uc01-local/compose.yaml "$@"
)

initialize() {
  umask 077
  mkdir -p "$fixture_dir/tls"
  if [ ! -s "$fixture_dir/compose.env" ] || [ ! -s "$fixture_dir/fixture-key.json" ] || [ ! -s "$fixture_dir/google-jwks.mjs" ]; then
    node infra/uc01-local/fixtures.mjs init "$fixture_dir"
    chmod 644 "$fixture_dir/google-jwks.mjs"
  fi
  (
    cd "$fixture_dir/tls"
    if [ ! -s ca.key ] || [ ! -s ca.crt ]; then
      openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 -subj '/CN=UC-01 Local Fixture CA' \
        -keyout ca.key -out ca.crt 2>/dev/null
    fi
    if [ ! -s server.key ] || [ ! -s server.crt ] || ! openssl x509 -checkend 86400 -noout -in server.crt >/dev/null; then
      cat > server.ext <<'CERT'
subjectAltName=IP:127.0.0.1,DNS:localhost
extendedKeyUsage=serverAuth
CERT
      openssl req -new -newkey rsa:2048 -nodes -subj '/CN=localhost' -keyout server.key -out server.csr 2>/dev/null
      openssl x509 -req -sha256 -days 30 -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
        -extfile server.ext -out server.crt 2>/dev/null
    fi
  )
}

verify() {
  NODE_EXTRA_CA_CERTS="$fixture_dir/tls/ca.crt" node infra/uc01-local/fixtures.mjs check "$fixture_dir" "$local_url"
}

case "${1:-}" in
  up)
    initialize
    compose up -d --build gateway-tls
    compose exec -T gateway-tls nginx -s reload
    schema=$(compose exec -T db psql -At -v ON_ERROR_STOP=1 -U lost_found -d lost_found \
      -c "SELECT to_regclass('public.login_attempts')")
    if [ "$schema" != login_attempts ]; then
      compose exec -T db psql -v ON_ERROR_STOP=1 -U lost_found -d lost_found < db/migrations/001_identity.sql
    fi
    for ((trial = 0; trial < 40; trial++)); do
      if curl -fsS --cacert "$fixture_dir/tls/ca.crt" "$local_url/api/health/ready" >/dev/null 2>&1; then
        verify
        printf 'Gateway fixture: %s\n' "$local_url"
        exit 0
      fi
      sleep .25
    done
    printf 'Gateway is not ready. Check the Compose logs.\n' >&2
    exit 1
    ;;
  check) verify ;;
  check-mobile)
    NODE_EXTRA_CA_CERTS="$fixture_dir/tls/ca.crt" apps/mobile/node_modules/.bin/tsx \
      infra/uc01-local/mobile-http-smoke.ts "$fixture_dir" "$local_url"
    ;;
  down) compose down ;;
  *)
    printf 'Usage: bash infra/uc01-local/run.sh up|check|check-mobile|down\n' >&2
    exit 2
    ;;
esac
