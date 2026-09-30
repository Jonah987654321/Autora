#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# Load .env into shell
set -a
source ./.env
set +a

# Create directories for persistent volumes
if [[ -n "${DATA_DIR:-}" ]]; then
    mkdir -p "${DATA_DIR}/mongodb" \
             "${DATA_DIR}/caddy_data" \
             "${DATA_DIR}/caddy_config"
else
    echo "ERROR: DATA_DIR key missing in .env"
    exit 1
fi

if [[ ! -f "$SCRIPT_DIR/mongodb/mongo-keyfile" ]]; then
    "$SCRIPT_DIR/../scripts/gen-mongo-keyfile.sh"
fi

profile="development"
detach_flags=()

if [[ "${APP_ENV:-development}" == "production" ]]; then
    profile="production"
    detach_flags=(-d)
else
    export FRONTEND_PORT=5173
fi

exec docker compose --profile "$profile" up --build --renew-anon-volumes "${detach_flags[@]}"