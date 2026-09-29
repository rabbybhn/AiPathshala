// Minimal server for rundhaka.com: serves the voice-agent page and issues
// short-lived ElevenLabs conversation tokens so the API key never reaches the browser.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || "agent_3601m3nj9tyqez0sbcf61j5hvvv1";
const API_KEY = process.env.ELEVENLABS_API_KEY || "";
const PUBLIC_DIR = fileURLToPath(new URL("./public/", import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function handleToken(res) {
  // Without an API key the page falls back to a public agent connection by agent ID.
  if (!API_KEY) return sendJson(res, 200, { agentId: AGENT_ID });
  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(AGENT_ID)}`,
      { headers: { "xi-api-key": API_KEY } }
    );
    if (!r.ok) {
      console.error("Token request failed:", r.status, await r.text());
      return sendJson(res, 502, { error: "Could not get conversation token" });
    }
    const { token } = await r.json();
    sendJson(res, 200, { conversationToken: token });
  } catch (err) {
    console.error("Token request error:", err);
    sendJson(res, 502, { error: "Could not reach ElevenLabs" });
  }
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safe.endsWith("/") ? join(safe, "index.html") : safe);
  if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: "Forbidden" });
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    // Single-page site: unknown paths get the main page.
    const data = await readFile(join(PUBLIC_DIR, "index.html"));
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(req.method === "HEAD" ? undefined : data);
  }
}

http
  .createServer((req, res) => {
    const path = req.url.split("?")[0];
    if (path === "/api/health") return sendJson(res, 200, { ok: true });
    if (path === "/api/conversation-token" && req.method === "GET") return handleToken(res);
    if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "Method not allowed" });
    serveStatic(req, res);
  })
  .listen(PORT, HOST, () => {
    console.log(`rundhaka-agent listening on http://${HOST}:${PORT} (token mode: ${API_KEY ? "on" : "off"})`);
  });
