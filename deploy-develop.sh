#!/usr/bin/env bash
set -euo pipefail

DEPLOY_BRANCH="${DEPLOY_BRANCH:-develop}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$(dirname "$0")"

git fetch origin "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"

test -f backend/.env.production
test -f frontend/.env.production

docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans
