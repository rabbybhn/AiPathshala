# ElevenLabs Voice Agent — bdrailwayagent.webry.tech

Voice agent page for **ফজলে রাব্বি ভুইয়া** (`agent_3601m3nj9tyqez0sbcf61j5hvvv1`), deployed on its own subdomain of a Hostinger VPS. The installer adds one nginx site and one systemd service. If another nginx site already names the subdomain (e.g. RailBot), the installer disables it and keeps a backup in `/root/nginx-disabled-<domain>/`. Its app files and process are left running. Other sites, such as rundhaka.com, are not touched. To restore the old site, copy the backup file back to `/etc/nginx/sites-enabled/`, remove `/etc/nginx/sites-enabled/<domain>` and run `nginx -t && systemctl reload nginx`.

- `server.js` is a Node server with no dependencies. It serves `public/` and exposes `/api/conversation-token`.
  - If `ELEVENLABS_API_KEY` is set, it gets a short-lived WebRTC token from ElevenLabs. The key never reaches the browser.
  - If the key is empty, the page connects with the agent ID. This only works when the agent is **public**.
- `public/` holds the Bengali UI, built with `@elevenlabs/client`. It supports voice, a live transcript and text input.
- `deploy/setup.sh` is the installer. It picks a free local port (3100 or higher), a systemd unit named `bdrailwayagent`, and an nginx site for the subdomain.

## 1. DNS
Add this record in Hostinger hPanel → **Domains → webry.tech → DNS / Nameservers**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `bdrailwayagent` | `200.234.43.214` (the VPS IP) | 300 |

Use exactly this A record. Do not add a proxy or CDN in front of it, because certbot's HTTP check and WebRTC both need a direct connection. Check with `nslookup bdrailwayagent.webry.tech`.

## 2. Install on the VPS
```bash
ssh root@200.234.43.214
apt-get update && apt-get install -y git
git clone -b claude/happy-euler-qb8i5w https://github.com/rabbybhn/AiPathshala.git
cd AiPathshala/voice-agent
sudo bash deploy/setup.sh your-email@example.com
```
The script checks that the domain resolves to this server and stops with a clear message if it doesn't. It then installs anything missing (Node.js 22, nginx, certbot), asks for your ElevenLabs API key, starts the service and gets a Let's Encrypt certificate. HTTPS is required for microphone access.

To use another domain: `sudo DOMAIN=other.example.com bash deploy/setup.sh you@example.com`.

## 3. ElevenLabs settings
Agent → **Security**: add `bdrailwayagent.webry.tech` to the **allowlist**. If you did not enter an API key, also turn authentication **off**.

## Commands
```bash
systemctl status bdrailwayagent
journalctl -u bdrailwayagent -f
sudo nano /etc/bdrailwayagent.env && sudo systemctl restart bdrailwayagent   # change key
```

### Updating
```bash
cd ~/AiPathshala && git pull
cp -r voice-agent/{server.js,package.json,public} /var/www/bdrailwayagent.webry.tech/
sudo systemctl restart bdrailwayagent
```

## Run locally
```bash
ELEVENLABS_API_KEY=xxx node server.js   # http://127.0.0.1:3000
```
