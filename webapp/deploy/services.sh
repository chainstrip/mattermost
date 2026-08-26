#!/usr/bin/env bash
# Local mattermost services via Apple Container — macOS. Linux/Docker hosts
# use deploy/compose.services.yml instead (see README).
#
#   deploy/services.sh up|down|status
#
# The mattermost server is a Go binary shipped in its image; it SERVES the
# webapp client from /mattermost/client — we mount OUR built client over it:
# the cove2e workspace build when chainstrip drives this (CS_COVE2E_WS in the
# env), else this checkout's own channels/dist. The server image tracks the
# same master this webapp checkout builds from (enterprise-edition dev image;
# runs unlicensed as team edition).
set -euo pipefail
cd "$(dirname "$0")/.." # the webapp root (the chainstrip target)

DB_NAME=mm-db
SRV_NAME=mm-server
PG_IMAGE=postgres:14 # the version mattermost's own e2e stack pins
# Mattermost publishes NO arm64 Docker images (dev + official are amd64-only,
# verified via the Hub manifests), and Apple Container's buildkit needs
# Rosetta — so on arm64 we run the OFFICIAL linux-arm64 release tarball,
# extracted on the HOST, inside a stock debian container (a volume mount, no
# image build anywhere). The webapp checkout tracks master; minor server-API
# drift vs the pinned release is accepted for the smoke scope. amd64 hosts
# can instead set MM_SERVER_IMAGE (e.g. mattermostdevelopment/
# mattermost-enterprise-edition:master) to use a real image.
MM_VERSION="${MM_VERSION:-11.10.0}"
BASE_IMAGE=debian:bookworm-slim
CACHE_DIR="$PWD/deploy/.cache"
MM_TREE="$CACHE_DIR/mattermost-$MM_VERSION/mattermost"

# The checkout tracks MASTER, and master's webapp + e2e harness talk to master's
# API. A released server is not a substitute: measured 2026-08-22, master's
# client4 calls GET /api/v4/license/client with no `format=old`, which the 11.10.0
# release rejects with a 400 — killing the e2e suite in globalSetup before a
# single browser opened, so cove2e captured zero coverage. So the server is BUILT
# FROM THIS CHECKOUT (`services.sh build-server`, cross-compiled to linux/arm64)
# and dropped into the release tree, which still supplies config defaults and the
# runtime skeleton. i18n/templates/fonts come from the checkout too, so they match
# the binary. Without a local build the release binary is used unchanged, which is
# fine for anything that does not exercise a master-only API.
SERVER_BUILD="$CACHE_DIR/server-build/mattermost"
SERVER_SRC="$PWD/../server"

build_server() {
  command -v go >/dev/null 2>&1 || { echo "go toolchain not on PATH — install go (>= the version in server/go.mod) or run without build-server" >&2; return 1; }
  mkdir -p "$CACHE_DIR/server-build"
  # server/ and server/public are two modules; the product's own Makefile wires
  # them with a go.work, and without it the build fails on master-only model symbols.
  ( cd "$SERVER_SRC" && [ -f go.work ] || ( go work init && go work use . ./public ) ) || return 1
  echo "building the mattermost server from this checkout (linux/arm64)..."
  ( cd "$SERVER_SRC" && GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o "$SERVER_BUILD" ./cmd/mattermost )
}

ensure_server_tree() {
  if [ ! -x "$MM_TREE/bin/mattermost" ]; then
    echo "fetching the official mattermost-team $MM_VERSION linux-arm64 tarball..."
    mkdir -p "$CACHE_DIR/mattermost-$MM_VERSION"
    curl -fsSL "https://releases.mattermost.com/$MM_VERSION/mattermost-team-$MM_VERSION-linux-arm64.tar.gz" \
      | tar -xz -C "$CACHE_DIR/mattermost-$MM_VERSION"
  fi
  if [ -x "$SERVER_BUILD" ]; then
    cp "$SERVER_BUILD" "$MM_TREE/bin/mattermost"
    for d in i18n templates fonts; do
      [ -d "$SERVER_SRC/$d" ] && rm -rf "$MM_TREE/$d" && cp -R "$SERVER_SRC/$d" "$MM_TREE/$d"
    done
    echo "server: locally built from this checkout (matches the webapp under test)"
  else
    echo "server: official $MM_VERSION release binary (run '$0 build-server' to match this checkout)"
  fi
}

CLIENT_DIR="${CS_COVE2E_WS:-$PWD}/channels/dist"

exists() { container inspect "$1" >/dev/null 2>&1; }

up() {
  container system status >/dev/null 2>&1 || container system start
  if [ ! -f "$CLIENT_DIR/root.html" ]; then
    echo "no built client at $CLIENT_DIR — run the webapp production build first" >&2
    exit 1
  fi

  if exists "$DB_NAME"; then
    container start "$DB_NAME" >/dev/null 2>&1 || true # no-op when already running
  else
    container run -d --name "$DB_NAME" \
      -e POSTGRES_USER=mmuser -e POSTGRES_PASSWORD=mostest -e POSTGRES_DB=mattermost_test \
      "$PG_IMAGE"
  fi
  echo "waiting for postgres..."
  for _ in $(seq 1 30); do
    if container exec "$DB_NAME" pg_isready -U mmuser -d mattermost_test >/dev/null 2>&1; then break; fi
    sleep 2
  done

  # Apple Container has no service-name DNS between containers — the server
  # reaches postgres by its vmnet IP (column 6 of `container list`).
  DB_IP=$(container list | awk -v n="$DB_NAME" '$1==n {print $6}' | cut -d/ -f1)
  if [ -z "$DB_IP" ]; then
    echo "cannot determine $DB_NAME container IP" >&2
    exit 1
  fi

  # The client mount is fixed at container CREATE — a reused server would keep
  # serving the PREVIOUS client dir (e.g. the checkout's dist instead of the
  # cove2e workspace's). Always recreate the server; the db is reusable.
  if exists "$SRV_NAME"; then
    container stop "$SRV_NAME" >/dev/null 2>&1 || true
    container delete "$SRV_NAME" >/dev/null 2>&1 || true
  fi
  ensure_server_tree
    # Env mirrors mattermost's own e2e server stack (e2e-tests/.ci/server.generate.sh).
  # The client mount sits INSIDE the tree mount (mount ordering matters).
  container run -d --name "$SRV_NAME" -p 8065:8065 \
    -v "$MM_TREE":/mattermost \
    -v "$CLIENT_DIR":/mattermost/client \
    -w /mattermost \
    -e MM_SQLSETTINGS_DRIVERNAME=postgres \
    -e "MM_SQLSETTINGS_DATASOURCE=postgres://mmuser:mostest@${DB_IP}:5432/mattermost_test?sslmode=disable&connect_timeout=10&binary_parameters=yes" \
    -e MM_SERVICESETTINGS_SITEURL=http://localhost:8065 \
    -e MM_SERVICESETTINGS_ENABLELOCALMODE=true \
    -e MM_SERVICESETTINGS_ENABLESECURITYFIXALERT=false \
    -e "MM_SERVICESETTINGS_ALLOWCORSFROM=*" \
    -e MM_SERVICEENVIRONMENT=test \
    -e MM_PLUGINSETTINGS_ENABLE=true \
    -e MM_PLUGINSETTINGS_ENABLEUPLOADS=true \
    -e MM_LOGSETTINGS_ENABLEDIAGNOSTICS=false \
    -e MM_EMAILSETTINGS_SMTPSERVER=localhost \
    -e MM_CLUSTERSETTINGS_READONLYCONFIG=false \
    "$BASE_IMAGE" /mattermost/bin/mattermost

  echo "waiting for mattermost on localhost:8065..."
  for _ in $(seq 1 60); do
    if curl -s -o /dev/null http://localhost:8065/api/v4/system/ping; then
      echo "services up: mattermost :8065 (client: $CLIENT_DIR)"
      return 0
    fi
    sleep 2
  done
  echo "mattermost not ready in 120s — check: container logs $SRV_NAME" >&2
  return 1
}

# ---- seeding (chainbot's `up-seeded`; plain `up` never seeds) ----
#
# The testbed has TWO consumers with different user expectations: the
# product's own playwright smoke (cove2e driver) seeds ITS canonical users
# through its lib, and chainbot needs config-known users at bring-up. The
# admin identity is therefore THE SMOKE'S sysadmin (test_config.ts defaults),
# so whichever consumer runs first, the other finds the world it expects.
# Seeding inside `up` broke cove2e on a reused DB (first-user path 4xx when
# accounts exist) — hence the separate verb.

API="http://localhost:8065/api/v4"
ADMIN_EMAIL="sysadmin@sample.mattermost.com"; ADMIN_USER="sysadmin"; ADMIN_PASS="Sys@dmin-sample1"
# 14-char minimum: this server's password policy rejects anything shorter
# (the canonical sysadmin password passes at 16; a 10-char guess died at 400).
PRO_EMAIL="pro@example.com"; PRO_USER="pro"; PRO_PASS="Chainbot-Pr0be-2026!"

# First JSON "id" value — enough for create/get responses, no jq dependency.
json_id() { sed -n 's/.*"id":"\([a-z0-9]\{26\}\)".*/\1/p' | head -1; }

admin_token() {
  curl -sfi -X POST "$API/users/login" -H 'Content-Type: application/json' \
    -d "{\"login_id\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" \
    | awk 'tolower($1)=="token:"{print $2}' | tr -d '\r'
}

# No -f inside seed: under `set -e` a failing curl -f in a fallback KILLS the
# script with curl's exit code and NO message (measured: the first chainbot
# bring-up died as a bare "status 22" while the API's own error — a password-
# policy 400 — sat unread). Fallback GETs use -s and empty-checks; every
# failure path prints the API body it saw.
seed() {
  TOKEN=$(admin_token || true)
  if [ -z "$TOKEN" ]; then
    # Empty server: the FIRST user may be created unauthenticated and becomes
    # system_admin — the same path the setup screen uses.
    echo "seed: creating sysadmin (first user)..."
    ADMIN_RES=$(curl -s -X POST "$API/users" -H 'Content-Type: application/json' \
      -d "{\"email\":\"$ADMIN_EMAIL\",\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")
    TOKEN=$(admin_token || true)
    [ -n "$TOKEN" ] || { echo "seed: cannot create sysadmin and cannot log in — API said: $ADMIN_RES — if the DB holds foreign accounts, reset with: container delete $DB_NAME" >&2; return 1; }
  fi
  AUTH="Authorization: Bearer $TOKEN"

  TEAM_RES=$(curl -s -X POST "$API/teams" -H "$AUTH" -H 'Content-Type: application/json' \
    -d '{"name":"chainstrip","display_name":"Chainstrip","type":"O"}')
  TEAM_ID=$(printf '%s' "$TEAM_RES" | json_id)
  [ -n "$TEAM_ID" ] || TEAM_ID=$(curl -s "$API/teams/name/chainstrip" -H "$AUTH" | json_id)
  [ -n "$TEAM_ID" ] || { echo "seed: team chainstrip neither created nor found — API said: $TEAM_RES" >&2; return 1; }

  PRO_RES=$(curl -s -X POST "$API/users" -H "$AUTH" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$PRO_EMAIL\",\"username\":\"$PRO_USER\",\"password\":\"$PRO_PASS\"}")
  PRO_ID=$(printf '%s' "$PRO_RES" | json_id)
  [ -n "$PRO_ID" ] || PRO_ID=$(curl -s "$API/users/email/$PRO_EMAIL" -H "$AUTH" | json_id)
  [ -n "$PRO_ID" ] || { echo "seed: pro user neither created nor found — API said: $PRO_RES" >&2; return 1; }

  ADMIN_ID=$(curl -s "$API/users/me" -H "$AUTH" | json_id)
  [ -n "$ADMIN_ID" ] || { echo "seed: /users/me yielded no id" >&2; return 1; }
  for uid in "$ADMIN_ID" "$PRO_ID"; do # membership POST is idempotent-tolerant (already-a-member is fine)
    curl -s -o /dev/null -X POST "$API/teams/$TEAM_ID/members" -H "$AUTH" -H 'Content-Type: application/json' \
      -d "{\"team_id\":\"$TEAM_ID\",\"user_id\":\"$uid\"}"
  done
  echo "seed: team chainstrip ready (sysadmin + pro)"
}

down() {
  container stop "$SRV_NAME" "$DB_NAME" >/dev/null 2>&1 || true
  container delete "$SRV_NAME" "$DB_NAME" >/dev/null 2>&1 || true
  echo "services down"
}

status() {
  container list
  curl -s -o /dev/null -w "ping: %{http_code}\n" http://localhost:8065/api/v4/system/ping || true
}

case "${1:-}" in
  build-server) build_server ;;
  up) up ;;
  up-seeded) up && seed ;;
  seed) seed ;;
  down) down ;;
  status) status ;;
  *) echo "usage: $0 build-server|up|up-seeded|seed|down|status" >&2; exit 2 ;;
esac
