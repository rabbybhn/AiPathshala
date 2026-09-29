#!/usr/bin/env bash
# Run on the VPS (Ubuntu/Debian) as root.
#   Domain:  EMAIL=you@example.com ./deploy.sh            (DOMAIN defaults to rundhk.com)
#   Any IP:  DOMAIN=ip ./deploy.sh                        (self-signed HTTPS, browser shows a warning)
set -euo pipefail
DOMAIN="${DOMAIN:-rundhk.com}"
cd "$(dirname "$0")"

command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
docker compose up -d --build

apt-get update -y && apt-get install -y nginx openssl certbot python3-certbot-nginx

if [ "$DOMAIN" = "ip" ]; then
  IP="${IP:-$(curl -4 -fsS https://api.ipify.org)}"
  mkdir -p /etc/ssl/railbot
  openssl req -x509 -nodes -newkey rsa:2048 -days 825 -subj "/CN=$IP" -addext "subjectAltName=IP:$IP" \
    -keyout /etc/ssl/railbot/key.pem -out /etc/ssl/railbot/cert.pem
  cat > /etc/nginx/sites-available/railbot <<CONF
server {
    listen 80 default_server;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl default_server;
    ssl_certificate /etc/ssl/railbot/cert.pem;
    ssl_certificate_key /etc/ssl/railbot/key.pem;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
    }
}
CONF
  rm -f /etc/nginx/sites-enabled/default
  ln -sf /etc/nginx/sites-available/railbot /etc/nginx/sites-enabled/railbot
  nginx -t && systemctl reload nginx
  echo "Live at https://$IP (accept the self-signed certificate warning; the mic needs HTTPS)"
  exit 0
fi

: "${EMAIL:?set EMAIL for LetsEncrypt}"
cat > /etc/nginx/sites-available/railbot <<CONF
server {
    server_name $DOMAIN www.$DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
CONF
ln -sf /etc/nginx/sites-available/railbot /etc/nginx/sites-enabled/railbot
nginx -t && systemctl reload nginx
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -m "$EMAIL" --agree-tos --no-eff-email --redirect -n
echo "Live at https://$DOMAIN"
