#!/bin/bash 
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
TARGET=$SCRIPT_DIR/../docker/mongodb/mongo-keyfile

OVERWRITE=0
for arg in "$@"; do
    if [ "$arg" == "--overwrite" ]; then
        OVERWRITE=1
    fi
done

if [ -e "$TARGET" ]; then
    if [ "$OVERWRITE" == 1 ]; then
        echo "Removing existing keyfile..."
        rm -f "$TARGET"
    else
        echo "Abort: keyfile already exists. Use --overwrite to force."
        exit 0
    fi
fi

echo "Generating new keyfile..."
openssl rand -base64 756 > "$TARGET"
chmod 400 "$TARGET"
# Set owner to uid 999 (mongodb container default user)
sudo chown 999:999 "$TARGET"
echo "Generation successful"