#!/bin/bash
set -e

APP_DIR="/Users/markbechler/Documents/iMac/sample-ledger"
cd "$APP_DIR"

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

exec npm run start -- -p 3047