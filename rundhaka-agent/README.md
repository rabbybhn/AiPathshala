# rundhaka.com — ElevenLabs Voice Agent

Voice agent page for **ফজলে রাব্বি ভুইয়া** (`agent_3601m3nj9tyqez0sbcf61j5hvvv1`), set up for a Hostinger VPS.

- `server.js` is a Node server with no dependencies. It serves `public/` and exposes `/api/conversation-token`.
  - If `ELEVENLABS_API_KEY` is set, it gets a short-lived WebRTC conversation token from ElevenLabs. The API key never reaches the browser.
  - If the key is empty, the page connects with the agent ID. This only works when the agent is **public** (authentication turned off in ElevenLabs).
- `public/` holds the Bengali UI, built with `@elevenlabs/client` (loaded from jsDelivr). It supports voice over WebRTC, a live transcript and text input.
- `deploy/` has the nginx site, the systemd service and a one-shot `setup.sh`.

## 1. Point the domain at the VPS
In Hostinger hPanel → **Domains → rundhaka.com → DNS / Nameservers**:

| Type | Name | Value |
|------|------|-------|
| A    | @    | `<your VPS IP>` |
| A    | www  | `<your VPS IP>` |

Remove any old A/AAAA/CNAME records for `@` and `www` that point elsewhere. Wait until `ping rundhaka.com` shows your VPS IP.

## 2. Deploy on the VPS (Ubuntu/Debian)
```bash
ssh root@<your VPS IP>
apt-get update && apt-get install -y git
git clone -b claude/happy-euler-qb8i5w https://github.com/rabbybhn/AiPathshala.git
cd AiPathshala/rundhaka-agent
sudo bash deploy/setup.sh your-email@example.com
```
The script installs Node.js 22, nginx and certbot. It then:
1. copies the app to `/var/www/rundhaka-agent`
2. asks for your ElevenLabs API key and stores it in `/etc/rundhaka-agent.env` (mode 600)
3. starts the `rundhaka-agent` systemd service on `127.0.0.1:3000`
4. sets up nginx for `rundhaka.com` and `www.rundhaka.com`
5. gets a free Let's Encrypt HTTPS certificate. HTTPS is required because browsers only allow microphone access on secure pages.

Open **https://rundhaka.com** when it finishes.

## 3. ElevenLabs settings
In the ElevenLabs dashboard → Agent → **Security / Advanced**:
- Add `rundhaka.com` and `www.rundhaka.com` to the **allowlist** of permitted hosts.
- If you did not provide an API key, make sure authentication is **off**, so the agent is public.

## Useful commands
```bash
systemctl status rundhaka-agent           # service status
journalctl -u rundhaka-agent -f           # live logs
sudo nano /etc/rundhaka-agent.env && sudo systemctl restart rundhaka-agent   # change key
curl http://127.0.0.1:3000/api/health     # health check
```

### Updating the site
```bash
cd ~/AiPathshala && git pull
cp -r rundhaka-agent/{server.js,package.json,public} /var/www/rundhaka-agent/
sudo systemctl restart rundhaka-agent
```

## Alternative: widget only (no server)
To use Hostinger's website builder or shared hosting instead, paste this into the page HTML:
```html
<script src="https://elevenlabs.io/convai-widget/index.js" async></script>
<elevenlabs-convai agent-id="agent_3601m3nj9tyqez0sbcf61j5hvvv1"></elevenlabs-convai>
```
This requires the agent to be public.

## Run locally
```bash
ELEVENLABS_API_KEY=xxx node server.js   # http://127.0.0.1:3000
```
