#!/usr/bin/env bash
# Run on the Hostinger VPS (Ubuntu/Debian) as root:  EMAIL=you@example.com ./deploy.sh
set -euo pipefail
DOMAIN="${DOMAIN:-rundhk.com}"
: "${EMAIL:?set EMAIL for LetsEncrypt}"
cd "$(dirname "$0")"

command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
docker compose up -d

apt-get update -y && apt-get install -y nginx certbot python3-certbot-nginx
cat > /etc/nginx/sites-available/railbot <<CONF
server {
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
CONF
ln -sf /etc/nginx/sites-available/railbot /etc/nginx/sites-enabled/railbot
nginx -t && systemctl reload nginx
certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --no-eff-email --redirect -n
echo "Live at https://$DOMAIN"
