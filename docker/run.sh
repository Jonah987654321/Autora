#!/usr/bin/env bash
set -euo pipefail

# Load .env into shell
set -a
source ./.env
set +a

profile="development"
detach_flags=()

if [[ "${APP_ENV:-development}" == "production" ]]; then
    profile="production"
    detach_flags=(-d)
else
    export FRONTEND_PORT=5173
fi

exec docker compose --profile "$profile" up --build --renew-anon-volumes "${detach_flags[@]}"