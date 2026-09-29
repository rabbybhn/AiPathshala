#!/usr/bin/env bash
# One-shot installer for rundhaka.com on an Ubuntu/Debian Hostinger VPS.
# Run as root from the rundhaka-agent folder:  sudo bash deploy/setup.sh you@example.com
set -euo pipefail

DOMAIN="rundhaka.com"
EMAIL="${1:-}"
APP_DIR="/var/www/rundhaka-agent"
ENV_FILE="/etc/rundhaka-agent.env"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ $EUID -ne 0 ]]; then echo "Run with sudo/root."; exit 1; fi
if [[ -z "$EMAIL" ]]; then echo "Usage: sudo bash deploy/setup.sh your-email@example.com"; exit 1; fi

echo "==> Installing packages (Node.js 22, nginx, certbot)"
apt-get update -y
apt-get install -y curl ca-certificates nginx certbot python3-certbot-nginx
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Copying app to $APP_DIR"
mkdir -p "$APP_DIR"
cp -r "$SRC_DIR/server.js" "$SRC_DIR/package.json" "$SRC_DIR/public" "$APP_DIR/"
chown -R www-data:www-data "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> Creating $ENV_FILE"
  cp "$SRC_DIR/.env.example" "$ENV_FILE"
  read -rsp "ElevenLabs API key (leave empty if the agent is public): " KEY; echo
  sed -i "s|^ELEVENLABS_API_KEY=.*|ELEVENLABS_API_KEY=${KEY}|" "$ENV_FILE"
fi
chown root:root "$ENV_FILE"; chmod 600 "$ENV_FILE"

echo "==> Installing systemd service"
cp "$SRC_DIR/deploy/rundhaka-agent.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now rundhaka-agent
systemctl restart rundhaka-agent

echo "==> Configuring nginx"
cp "$SRC_DIR/deploy/nginx-rundhaka.com.conf" /etc/nginx/sites-available/rundhaka.com
ln -sf /etc/nginx/sites-available/rundhaka.com /etc/nginx/sites-enabled/rundhaka.com
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

if command -v ufw >/dev/null && ufw status | grep -q active; then
  ufw allow 'Nginx Full'
fi

echo "==> Requesting HTTPS certificate (DNS for $DOMAIN must already point here)"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo "==> Done. Visit https://$DOMAIN"
curl -fsS http://127.0.0.1:3000/api/health && echo
