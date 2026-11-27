#!/bin/sh
set -eu

# Credentials for this local stack use characters that are safe in JSON strings.
for credential in "$LF_S3_ADMIN_ACCESS_KEY" "$LF_S3_ADMIN_SECRET_KEY" "$LF_S3_ACCESS_KEY" "$LF_S3_SECRET_KEY"; do
  case "$credential" in
    ""|*[!a-zA-Z0-9._-]*) echo 'Invalid local S3 credential' >&2; exit 1 ;;
  esac
done

umask 077
config=$(mktemp)
cat > "$config" <<JSON
{
  "identities": [
    {
      "name": "media-provisioner",
      "credentials": [{"accessKey": "$LF_S3_ADMIN_ACCESS_KEY", "secretKey": "$LF_S3_ADMIN_SECRET_KEY"}],
      "actions": ["Admin"]
    },
    {
      "name": "core-media",
      "credentials": [{"accessKey": "$LF_S3_ACCESS_KEY", "secretKey": "$LF_S3_SECRET_KEY"}],
      "actions": ["List:campus-private", "Read:campus-private/uploads/*", "Write:campus-private/uploads/*"]
    }
  ]
}
JSON
chown seaweed:seaweed "$config"
mkdir -p /data
chown seaweed:seaweed /data
exec su-exec seaweed weed mini -dir=/data -bucket=campus-private -s3.config="$config" -s3.autoCreateBucket=false
