#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."
umask 077
mkdir -p .local/tls
work_dir=$(mktemp -d .local/tls/.generate.XXXXXX)
trap 'rm -rf "$work_dir"' EXIT

san='DNS:localhost,IP:127.0.0.1,IP:10.0.2.2'
if [ -n "${LF_TLS_LAN_IP:-}" ]; then
  case "$LF_TLS_LAN_IP" in
    *[!0-9.]*) echo 'LF_TLS_LAN_IP phải là IPv4.' >&2; exit 1 ;;
  esac
  san="$san,IP:$LF_TLS_LAN_IP"
fi

if [ ! -s .local/gateway-ca.key ] || [ ! -s .local/tls/gateway-ca.crt ]; then
  openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 365 \
    -subj '/CN=Campus Lost and Found Local Gateway CA' \
    -addext 'basicConstraints=critical,CA:TRUE,pathlen:0' \
    -addext 'keyUsage=critical,keyCertSign,cRLSign' \
    -keyout "$work_dir/gateway-ca.key" -out "$work_dir/gateway-ca.crt"
  mv "$work_dir/gateway-ca.key" .local/gateway-ca.key
  mv "$work_dir/gateway-ca.crt" .local/tls/gateway-ca.crt
fi

openssl req -new -newkey rsa:2048 -sha256 -nodes \
  -subj '/CN=localhost' \
  -keyout "$work_dir/localhost.key" -out "$work_dir/localhost.csr"
cat > "$work_dir/extensions" <<EOF
subjectAltName=$san
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
EOF
openssl x509 -req -sha256 -days 30 -set_serial "0x$(openssl rand -hex 16)" \
  -in "$work_dir/localhost.csr" -extfile "$work_dir/extensions" \
  -CA .local/tls/gateway-ca.crt -CAkey .local/gateway-ca.key \
  -out "$work_dir/localhost.crt"

mv "$work_dir/localhost.key" "$work_dir/localhost.crt" .local/tls/
