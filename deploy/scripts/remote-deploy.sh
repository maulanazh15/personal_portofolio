#!/data/data/com.termux/files/usr/bin/sh
set -eu

PREFIX=${PREFIX:-/data/data/com.termux/files/usr}
BASE=/data/data/com.termux/files/home/homelab
APP="$BASE/apps/portfolio"
# Termux has no /tmp; stage under the prefix unless the caller overrides it.
DEPLOY=${DEPLOY:-"$PREFIX/tmp/portfolio-deploy"}
SVDIR=${SVDIR:-"$PREFIX/var/service"}
export SVDIR

mkdir -p "$BASE/sites/portfolio" "$APP/data" "$APP/seed" "$BASE/logs"

# Replace the static build atomically enough for this small site.
rm -rf "$BASE/sites/portfolio/public"
tar -xzf "$DEPLOY/portfolio-dist.tar.gz" -C "$BASE/sites/portfolio"
mv "$BASE/sites/portfolio/dist" "$BASE/sites/portfolio/public"

# Update the Go binary and importer, preserving the database and env file.
install -m 750 "$DEPLOY/portfolio-api" "$APP/portfolio-api"
install -m 750 "$DEPLOY/portfolio-import" "$APP/portfolio-import"

# Re-import seed content. Upsert keeps manual content edits intact.
rm -rf "$APP/seed/content"
mkdir -p "$APP/seed"
tar -xzf "$DEPLOY/portfolio-seed.tar.gz" -C "$APP/seed"
"$APP/portfolio-import" -db "$APP/data/portfolio.db" -dir "$APP/seed/content"

# Restart only the portfolio service, not Nginx or unrelated services.
if sv status portfolio-api >/dev/null 2>&1; then
    sv restart portfolio-api
else
    sv up portfolio-api
fi
sleep 2
curl -fsS http://127.0.0.1:8090/healthz >/dev/null

rm -rf "$DEPLOY"
echo "portfolio deploy completed"
