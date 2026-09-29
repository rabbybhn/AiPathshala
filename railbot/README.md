# RailBot (ElevenLabs agent) on a Hostinger VPS

Agent ID: `agent_9201m3n9wwe9e9mtn64cwwdmk39k`

Serves `site/index.html`, which embeds the ElevenLabs widget, behind nginx with HTTPS
(browsers only allow the microphone on HTTPS).

## Deploy
1. Point a DNS A record for `rundhk.com` at the VPS IP.
2. In ElevenLabs → Agent → Security: enable public access (or add your domain to the allowlist).
3. On the VPS:
   ```bash
   git clone https://github.com/rabbybhn/AiPathshala && cd AiPathshala/railbot
   EMAIL=you@example.com sudo -E ./deploy.sh   # DOMAIN defaults to rundhk.com
   ```

No API key is needed for a public agent. If you set the agent to private, add a small server
endpoint that calls `GET /v1/convai/conversation/token?agent_id=...` with `xi-api-key` from an
env var and hands the token to the client. Never ship the API key in the page.
