#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."
umask 077
mkdir -p .local/tls
work_dir=$(mktemp -d .local/tls/.generate.XXXXXX)
trap 'rm -rf "$work_dir"' EXIT

openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 30 \
  -subj '/CN=localhost' \
  -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' \
  -addext 'basicConstraints=critical,CA:FALSE' \
  -addext 'extendedKeyUsage=serverAuth' \
  -keyout "$work_dir/localhost.key" -out "$work_dir/localhost.crt"

mv "$work_dir/localhost.key" "$work_dir/localhost.crt" .local/tls/
