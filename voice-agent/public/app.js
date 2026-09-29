import { Conversation } from "https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.25.0/+esm";

const $ = (id) => document.getElementById(id);
const startBtn = $("start");
const stopBtn = $("stop");
const statusEl = $("status");
const orb = $("orb");
const log = $("log");
const textForm = $("text-form");
const textInput = $("text-input");

let conversation = null;

const STATUS_TEXT = {
  connecting: "সংযোগ হচ্ছে…",
  connected: "সংযুক্ত",
  disconnecting: "বিচ্ছিন্ন হচ্ছে…",
  disconnected: "প্রস্তুত",
};

function setStatus(text) {
  statusEl.textContent = text;
}

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function setConnectedUI(connected) {
  startBtn.hidden = connected;
  stopBtn.hidden = !connected;
  textForm.hidden = !connected;
  orb.classList.toggle("connected", connected);
  if (!connected) orb.classList.remove("speaking");
}

async function getSessionConfig() {
  const res = await fetch("/api/conversation-token", { cache: "no-store" });
  if (!res.ok) throw new Error("token");
  const data = await res.json();
  if (data.conversationToken) return { conversationToken: data.conversationToken, connectionType: "webrtc" };
  return { agentId: data.agentId, connectionType: "webrtc" };
}

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  setStatus("মাইক্রোফোনের অনুমতি চাওয়া হচ্ছে…");
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    setStatus("মাইক্রোফোন ব্যবহারের অনুমতি প্রয়োজন।");
    startBtn.disabled = false;
    return;
  }

  try {
    const config = await getSessionConfig();
    conversation = await Conversation.startSession({
      ...config,
      onConnect: () => setConnectedUI(true),
      onDisconnect: () => {
        setConnectedUI(false);
        setStatus(STATUS_TEXT.disconnected);
        conversation = null;
      },
      onStatusChange: ({ status }) => setStatus(STATUS_TEXT[status] || status),
      onModeChange: ({ mode }) => {
        orb.classList.toggle("speaking", mode === "speaking");
        if (conversation) setStatus(mode === "speaking" ? "এজেন্ট কথা বলছে…" : "শুনছি…");
      },
      onMessage: ({ message, source, role }) => {
        addMessage(message, source === "user" || role === "user" ? "user" : "agent");
      },
      onError: (message) => {
        console.error("Conversation error:", message);
        setStatus("একটি সমস্যা হয়েছে, আবার চেষ্টা করুন।");
      },
    });
  } catch (err) {
    console.error(err);
    setStatus("সংযোগ করা যায়নি, আবার চেষ্টা করুন।");
    setConnectedUI(false);
  } finally {
    startBtn.disabled = false;
  }
});

stopBtn.addEventListener("click", async () => {
  if (conversation) await conversation.endSession();
});

textForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  if (!text || !conversation) return;
  conversation.sendUserMessage(text);
  addMessage(text, "user");
  textInput.value = "";
});
