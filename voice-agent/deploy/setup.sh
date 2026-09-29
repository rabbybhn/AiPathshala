#!/usr/bin/env bash
# Installs the voice agent on an Ubuntu/Debian VPS under its own (sub)domain.
# Leaves every other nginx site on the server untouched.
#
#   sudo bash deploy/setup.sh you@example.com                       # bdrailwayagent.webry.tech
#   sudo DOMAIN=other.example.com bash deploy/setup.sh you@example.com
set -euo pipefail

EMAIL="${1:-}"
DOMAIN="${DOMAIN:-bdrailwayagent.webry.tech}"
APP_NAME="${DOMAIN%%.*}"                     # e.g. bdrailwayagent
APP_DIR="/var/www/$DOMAIN"
ENV_FILE="/etc/$APP_NAME.env"
SERVICE="$APP_NAME.service"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ $EUID -ne 0 ]]; then echo "Run with sudo/root."; exit 1; fi
if [[ -z "$EMAIL" ]]; then echo "Usage: sudo bash deploy/setup.sh your-email@example.com"; exit 1; fi

port_in_use() { ss -ltnH "( sport = :$1 )" | grep -q .; }

echo "==> Checking DNS for $DOMAIN"
SERVER_IPS="$(hostname -I 2>/dev/null || true) $(curl -4 -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)"
if [[ -z "$DNS_IP" ]]; then
  echo "!! $DOMAIN does not resolve yet. Add the DNS A record first, wait a few minutes, then re-run."; exit 1
elif ! grep -qw "$DNS_IP" <<<"$SERVER_IPS"; then
  echo "!! $DOMAIN points to $DNS_IP, but this server is: $SERVER_IPS"
  echo "   Fix the A record (or disable any proxy/CDN on it), then re-run."; exit 1
fi

echo "==> Installing missing packages"
apt-get update -y
apt-get install -y curl ca-certificates
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v nginx >/dev/null || apt-get install -y nginx
command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx

echo "==> Copying app to $APP_DIR"
mkdir -p "$APP_DIR"
cp -r "$SRC_DIR/server.js" "$SRC_DIR/package.json" "$SRC_DIR/public" "$APP_DIR/"
chown -R www-data:www-data "$APP_DIR"

if [[ -f "$ENV_FILE" ]]; then
  PORT="$(sed -n 's/^PORT=//p' "$ENV_FILE")"
  echo "==> Reusing $ENV_FILE (port $PORT)"
else
  # Pick a free local port so existing apps on this VPS keep theirs.
  PORT=3100
  while port_in_use "$PORT"; do PORT=$((PORT + 1)); done
  echo "==> Creating $ENV_FILE (port $PORT)"
  read -rsp "ElevenLabs API key (leave empty if the agent is public): " KEY; echo
  cat > "$ENV_FILE" <<ENV
ELEVENLABS_API_KEY=$KEY
ELEVENLABS_AGENT_ID=agent_3601m3nj9tyqez0sbcf61j5hvvv1
PORT=$PORT
HOST=127.0.0.1
ENV
fi
chown root:root "$ENV_FILE"; chmod 600 "$ENV_FILE"

echo "==> Installing systemd service $SERVICE"
sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__APP_DIR__|$APP_DIR|g" \
    -e "s|__ENV_FILE__|$ENV_FILE|g" -e "s|__NODE__|$(command -v node)|g" \
    "$SRC_DIR/deploy/voice-agent.service.template" > "/etc/systemd/system/$SERVICE"
systemctl daemon-reload
systemctl enable "$SERVICE"
systemctl restart "$SERVICE"

echo "==> Adding nginx site for $DOMAIN"
if [[ -d /etc/nginx/sites-enabled ]]; then
  NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
else
  NGINX_CONF="/etc/nginx/conf.d/$DOMAIN.conf"
fi
# Take over the hostname: disable any other enabled nginx site that names it,
# keeping a backup so it can be restored. Catch-all/default sites are left alone.
BACKUP_DIR="/root/nginx-disabled-$DOMAIN"
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
  [[ -e "$f" ]] || continue
  [[ "$(readlink -f "$f")" == "$(readlink -f "$NGINX_CONF")" ]] && continue
  if grep -Eq "^[[:space:]]*server_name[^;]*[[:space:]]$DOMAIN[[:space:];]" "$f"; then
    mkdir -p "$BACKUP_DIR"
    echo "   Disabling existing site $f (backup in $BACKUP_DIR)"
    cp -aL "$f" "$BACKUP_DIR/$(basename "$f")"
    rm -f "$f"
  fi
done
# Keep certbot's HTTPS edits on re-runs; only write the file the first time.
if [[ ! -f "$NGINX_CONF" ]]; then
  sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__PORT__|$PORT|g" \
      "$SRC_DIR/deploy/nginx-site.conf.template" > "$NGINX_CONF"
fi
[[ -d /etc/nginx/sites-enabled ]] && ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/$DOMAIN"
if ! nginx -t; then
  echo "!! nginx config test failed; removing $DOMAIN site so other sites keep working."
  rm -f "/etc/nginx/sites-enabled/$DOMAIN" "$NGINX_CONF"; exit 1
fi
systemctl reload nginx

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp; ufw allow 443/tcp
fi

echo "==> Requesting HTTPS certificate for $DOMAIN"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect --keep-until-expiring

sleep 1
curl -fsS "http://127.0.0.1:$PORT/api/health" && echo
echo "==> Done. Visit https://$DOMAIN"
