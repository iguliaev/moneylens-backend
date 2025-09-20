#!/bin/bash
set -euo pipefail

function log_info() {
    echo "$(date -u -Iseconds) INFO [backup] $*"
}

function log_error() {
    echo "$(date -u -Iseconds) ERROR [backup] $*" >&2
}


# Dump the Postgres database to a file
# Args:
#   $1 - DATABASE_URL
#   $2 - OUT_FILE
function dump_db() {
    local DATABASE_URL=$1
    local OUT_FILE=$2

    /usr/lib/postgresql/17/bin/pg_dump \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges \
        --dbname="$DATABASE_URL" \
        --file="$OUT_FILE"
}


# Upload a file to Supabase Storage bucket
# Args:
#   $1 - SUPABASE_STORAGE_URL
#   $2 - SUPABASE_SERVICE_ROLE_KEY
#   $3 - SUPABASE_BUCKET
#   $4 - OBJECT_PATH (path in the bucket)
#   $5 - FILE_PATH (local file path)
function upload_to_supabase() {
    local SUPABASE_STORAGE_URL=$1
    local SUPABASE_SERVICE_ROLE_KEY=$2
    local SUPABASE_BUCKET=$3
    local OBJECT_PATH=$4
    local FILE_PATH=$5

    local UPLOAD_URL="${SUPABASE_STORAGE_URL%/}/storage/v1/object/${SUPABASE_BUCKET}/${OBJECT_PATH}"

    local HTTP_CODE
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "x-upsert: true" \
        -F "file=@${FILE_PATH};type=application/octet-stream" \
        "$UPLOAD_URL")

    if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "201" ]]; then
        echo "[backup] upload failed with HTTP $HTTP_CODE" >&2
        return 1
    fi

    return 0
}

# Env vars required:
#   DATABASE_URL               Postgres connection string (with sslmode=require for public runners)
#   SUPABASE_STORAGE_URL       https://<projectRef>.storage.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY  Service Role key
#   SUPABASE_BUCKET            Storage bucket name (e.g., db-backups)
#   BACKUP_ENV                 Environment label (e.g., prod|staging|dev)

for var in DATABASE_URL SUPABASE_STORAGE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_BUCKET BACKUP_ENV; do
  if [[ -z "${!var:-}" ]]; then
    log_error "Missing required env var: $var"
    exit 1
  fi
done

# Check required commands
for cmd in pg_dump curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        log_error "Command not found: $cmd"
        exit 1
    fi
done

PROJECT_NAME=${PROJECT_NAME:-moneylens}
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
FILENAME="${PROJECT_NAME}-${BACKUP_ENV}-pgdump-${TIMESTAMP}.dump"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

log_info "starting backup"

OUT_FILE="$TMP_DIR/$FILENAME"
log_info "running pg_dump to $OUT_FILE"

dump_db "$DATABASE_URL" "$OUT_FILE"

log_info "dump completed, file size: $(du -h "$OUT_FILE" | cut -f1)"

log_info "uploading to Supabase Storage bucket: $SUPABASE_BUCKET"
OBJECT_PATH="${BACKUP_ENV}/$FILENAME"
FILE_PATH="$OUT_FILE"
upload_to_supabase "$SUPABASE_STORAGE_URL" "$SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_BUCKET" "$OBJECT_PATH" "$FILE_PATH"

log_info "upload successful: $SUPABASE_BUCKET/$OBJECT_PATH"

