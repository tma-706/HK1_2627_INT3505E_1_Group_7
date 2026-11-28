#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
body=$(mktemp)
trap 'rm -f "$body"' EXIT

url="https://127.0.0.1:${LF_HTTPS_PORT:-8443}/api/v1/posts"

request() {
  curl --disable --noproxy '*' --silent --show-error --max-time 5 \
    --cacert .local/tls/gateway-ca.crt --get --output "$body" \
    --write-out '%{http_code} %{content_type}' "$url" "$@"
}

page() {
  expected=$1
  shift
  result=$(request "$@")
  case "$result" in
    '200 application/json'|'200 application/json;'*) ;;
    *) echo "Expected JSON page, got $result" >&2; exit 1 ;;
  esac
  docker compose exec -T mock node validate-posts.mjs "$expected" < "$body"
}

sh infra/smoke-posts.sh fixture-found-keys fixture-lost-wallet
page fixture-found-keys --data-urlencode limit=1
cursor=$(docker compose exec -T mock node -e '
  const cursor = JSON.parse(require("node:fs").readFileSync(0, "utf8")).nextCursor;
  if (!cursor) process.exit(1);
  process.stdout.write(cursor);
' < "$body")
page fixture-lost-wallet --data-urlencode limit=1 --data-urlencode "cursor=$cursor"
page fixture-found-keys --data-urlencode type=found --data-urlencode categoryId=keys \
  --data-urlencode areaId=library --data-urlencode "q=THƯ VIỆN" \
  --data-urlencode from=2026-11-26T07:00:00Z --data-urlencode to=2026-11-27T07:00:00Z
result=$(request --data-urlencode limit=1 --data-urlencode "cursor=$cursor" --data-urlencode areaId=gym)
case "$result" in
  '400 application/problem+json'|'400 application/problem+json;'*) ;;
  *) echo "Expected cursor rejection, got $result" >&2; exit 1 ;;
esac
echo 'PostgreSQL fixtures, filtering, pagination and cursor binding verified'

cors_headers() {
  curl --disable --noproxy '*' --fail --silent --show-error --max-time 5 \
    --cacert .local/tls/gateway-ca.crt --header "Origin: $1" \
    --dump-header - --output /dev/null "$url"
}

admin_origin=$(docker compose exec -T nginx printenv LF_ADMIN_ORIGIN)
headers=$(cors_headers "$admin_origin")
printf '%s\n' "$headers" | tr -d '\r' | grep -Fxi "Access-Control-Allow-Origin: $admin_origin" >/dev/null
printf '%s\n' "$headers" | tr -d '\r' | grep -Fxi 'Vary: Origin' >/dev/null
headers=$(cors_headers https://untrusted.invalid)
if printf '%s\n' "$headers" | grep -qi '^Access-Control-Allow-Origin:'; then
  echo 'Gateway allowed an unrelated origin' >&2
  exit 1
fi
echo 'Admin origin allowed and unrelated origin denied'
