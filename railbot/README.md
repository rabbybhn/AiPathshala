# RailBot (ElevenLabs agent) on a Hostinger VPS

Agent ID: `agent_9201m3n9wwe9e9mtn64cwwdmk39k`

A custom React voice UI (`src/`, built with `@elevenlabs/react`; no embedded widget) built by Docker and served by nginx with HTTPS
(browsers only allow the microphone on HTTPS).

## Deploy
1. Point DNS A records for `rundhk.com` and `www.rundhk.com` at the VPS IP.
2. In ElevenLabs → Agent → Security: enable public access (or add your domain to the allowlist).
3. On the VPS:
   ```bash
   git clone https://github.com/rabbybhn/AiPathshala && cd AiPathshala/railbot
   EMAIL=you@example.com sudo -E ./deploy.sh   # DOMAIN defaults to rundhk.com
   ```

No API key is needed for a public agent. If you set the agent to private, add a small server
endpoint that calls `GET /v1/convai/conversation/token?agent_id=...` with `xi-api-key` from an
env var and hands the token to the client. Never ship the API key in the page.

## Deploy on a bare IP (no domain)
```bash
cd AiPathshala/railbot && sudo DOMAIN=ip ./deploy.sh
```
Serves `https://<server-ip>` with a self-signed certificate (the browser will warn once; HTTPS is
still required for the microphone). Add the IP's origin to the agent's allowlist if you use one.
