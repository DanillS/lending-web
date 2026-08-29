#!/bin/sh
set -eu
# Print values to paste into .env. Does not write .env (never commit secrets).

rand() {
  python3 -c "import secrets; print(secrets.token_urlsafe($1))"
}

echo "SECRET_KEY=$(rand 48)"
echo "ADMIN_PASSWORD=$(rand 18)"
echo "POSTGRES_PASSWORD=$(rand 18)"
echo
echo "Paste into .env on the server. Keep APP_ENV=production"
echo "SITE_URL=https://elite-doors.shop"
echo "NEXT_PUBLIC_SITE_URL=https://elite-doors.shop"
echo "CORS_ORIGINS=https://elite-doors.shop"
echo
echo "VAPID (web push) keys are created in Postgres on first admin subscribe if left empty."
