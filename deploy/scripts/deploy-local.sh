#!/usr/bin/env bash
# Build the portfolio on this machine and deploy it to the Termux production
# host over SSH, without GitHub Actions.
#
# Usage:
#   deploy/scripts/deploy-local.sh             # build, show plan, ask to confirm
#   deploy/scripts/deploy-local.sh -y          # build, deploy without prompting
#   deploy/scripts/deploy-local.sh --dry-run   # build and stage only; no SSH
#
# Environment overrides:
#   DEPLOY_HOST     SSH host alias or user@host   (default: j2-ssh)
#   PUBLIC_URL      public site used for smoke tests
#   API_BUILD_PORT  local port for the temporary content API (default: 18199)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_HOST="${DEPLOY_HOST:-j2-ssh}"
PUBLIC_URL="${PUBLIC_URL:-https://portofolio.homelabchester.my.id}"
API_BUILD_PORT="${API_BUILD_PORT:-18199}"
REMOTE_STAGE='$PREFIX/tmp/portfolio-deploy'

ASSUME_YES=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

cd "$REPO_ROOT"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  die "tracked files have uncommitted changes; commit them before deploying"
fi
COMMIT="$(git rev-parse --short HEAD)"
if ! git merge-base --is-ancestor HEAD origin/master 2>/dev/null; then
  echo "warning: HEAD $COMMIT is not on origin/master; production will run unpushed code" >&2
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/portfolio-deploy.XXXXXX")"
API_PID=""
cleanup() {
  if [ -n "$API_PID" ]; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

log "Building ARMv7 binaries ($COMMIT)"
(
  cd backend
  GOOS=linux GOARCH=arm GOARM=7 go build -trimpath -ldflags="-s -w" -o "$WORK/portfolio-api" ./cmd/server
  GOOS=linux GOARCH=arm GOARM=7 go build -trimpath -ldflags="-s -w" -o "$WORK/portfolio-import" ./cmd/import
  chmod 750 "$WORK/portfolio-api" "$WORK/portfolio-import"
)

log "Seeding a temporary content database from content/"
(
  cd backend
  go run ./cmd/import -db "$WORK/seed.db" -dir ../content
  go build -o "$WORK/api-host" ./cmd/server
)

log "Starting temporary content API on 127.0.0.1:$API_BUILD_PORT"
PORTFOLIO_ADDR="127.0.0.1:$API_BUILD_PORT" \
PORTFOLIO_DB="$WORK/seed.db" \
PORTFOLIO_ADMIN_TOKEN="build-only-$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')" \
  "$WORK/api-host" >"$WORK/api.log" 2>&1 &
API_PID=$!
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$API_BUILD_PORT/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
curl -fsS "http://127.0.0.1:$API_BUILD_PORT/healthz" >/dev/null \
  || die "temporary content API did not start; see $WORK/api.log"

log "Building frontend"
(
  cd frontend
  npm ci
  CONTENT_API_URL="http://127.0.0.1:$API_BUILD_PORT" npm run build
  npm run test:static
)

log "Packaging artifacts"
tar -czf "$WORK/portfolio-dist.tar.gz" -C frontend dist
tar -czf "$WORK/portfolio-seed.tar.gz" -C . content
cp deploy/scripts/remote-deploy.sh "$WORK/"
(
  cd "$WORK"
  sha256sum portfolio-api portfolio-import portfolio-dist.tar.gz portfolio-seed.tar.gz remote-deploy.sh > SHA256SUMS
)
rm -f "$WORK/seed.db"* "$WORK/api-host" "$WORK/api.log"
ls -lh "$WORK"

if [ "$DRY_RUN" -eq 1 ]; then
  log "Dry run complete: artifacts built and checksummed; nothing was sent to $DEPLOY_HOST"
  exit 0
fi

log "Deploy plan"
echo "  commit:  $COMMIT"
echo "  target:  $DEPLOY_HOST"
echo "  public:  $PUBLIC_URL"
echo "  actions: back up portfolio.db, replace static site, update binaries,"
echo "           re-import seed (upsert), restart only portfolio-api"
if [ "$ASSUME_YES" -ne 1 ]; then
  printf '\nType "deploy" to continue: '
  read -r answer
  [ "$answer" = "deploy" ] || die "aborted"
fi

log "Checking SSH connection to $DEPLOY_HOST"
ssh -o BatchMode=yes -o ConnectTimeout=20 "$DEPLOY_HOST" 'true' \
  || die "cannot reach $DEPLOY_HOST"

log "Backing up the live database"
ssh -o BatchMode=yes "$DEPLOY_HOST" '
  set -eu
  cd /data/data/com.termux/files/home/homelab/apps/portfolio
  cp -p data/portfolio.db "data/portfolio.db.bak-$(date +%Y%m%d%H%M%S)"
  ls -l data/ | tail -n 3
'

log "Uploading artifacts"
tar -czf - -C "$WORK" . | ssh -o BatchMode=yes "$DEPLOY_HOST" "
  set -eu
  rm -rf $REMOTE_STAGE && mkdir -p $REMOTE_STAGE && tar -xzf - -C $REMOTE_STAGE
  cd $REMOTE_STAGE && sha256sum -c SHA256SUMS
"

log "Running remote-deploy.sh"
ssh -o BatchMode=yes "$DEPLOY_HOST" "SVDIR=\$PREFIX/var/service sh $REMOTE_STAGE/remote-deploy.sh"

log "Smoke testing"
ssh -o BatchMode=yes "$DEPLOY_HOST" '
  set -eu
  curl -fsS http://127.0.0.1:8090/healthz >/dev/null
  curl -fsS -H "Host: portofolio.homelabchester.my.id" http://127.0.0.1:8080/ >/dev/null
  curl -fsS -H "Host: portofolio.homelabchester.my.id" http://127.0.0.1:8080/api/healthz >/dev/null
  echo "local checks ok"
'
for path in / /id/ /en/ /id/kontak/ /en/projects/ /api/healthz; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$PUBLIC_URL$path")"
  echo "$code $PUBLIC_URL$path"
  [ "$code" = "200" ] || [ "$code" = "301" ] || [ "$code" = "302" ] \
    || die "public check failed for $path"
done
admin_code="$(curl -s -o /dev/null -w '%{http_code}' "$PUBLIC_URL/admin/")"
echo "$admin_code $PUBLIC_URL/admin/ (must not be 200)"
[ "$admin_code" != "200" ] || die "admin UI is publicly reachable"

ssh -o BatchMode=yes "$DEPLOY_HOST" "rm -rf $REMOTE_STAGE" || true
log "Deployed $COMMIT to $DEPLOY_HOST"
