#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
body=$(mktemp)
trap 'rm -f "$body"' EXIT

url="https://127.0.0.1:${LF_HTTPS_PORT:-8443}/api/v1/posts"
response=$(curl --disable --silent --show-error --noproxy '*' \
  --cacert .local/tls/localhost.crt --connect-timeout 2 --max-time 5 \
  --retry 5 --retry-connrefused --retry-max-time 15 \
  --output "$body" --write-out '%{http_code} %{content_type}' "$url")

case "$response" in
  '200 application/json'|'200 application/json;'*) echo "GET $url -> $response, TLS verified" ;;
  *) echo "GET $url: expected 200 application/json, received $response" >&2; exit 1 ;;
esac

docker compose exec -T mock node validate-posts.mjs "$@" < "$body"
