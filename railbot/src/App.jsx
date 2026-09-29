import { useState, useRef, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";

const AGENT_ID = "agent_9201m3n9wwe9e9mtn64cwwdmk39k";

const GREETING =
  "Welcome to Bangladesh Railway Support! আমি রেলবট। আপনার ট্রেন যাত্রা সহজ করতে আমি প্রস্তুত। How can I help you today?";

const CHIPS = [
  { label: "Train Schedule", icon: "schedule", color: "text-blue-400" },
  { label: "Ticket Status", icon: "confirmation_number", color: "text-emerald-400" },
  { label: "Fare Inquiry", icon: "payments", color: "text-purple-400" },
  { label: "PNR Check", icon: "search", color: "text-amber-400" },
];

const Icon = ({ name, className = "" }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export default function App() {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(null);
  const logRef = useRef(null);

  const conversation = useConversation({
    onMessage: (m) =>
      setMessages((prev) => [...prev, { role: m.source === "user" ? "user" : "agent", text: m.message }]),
    onError: (e) => setError(typeof e === "string" ? e : e?.message || "Something went wrong"),
  });

  const connected = conversation.status === "connected";
  const connecting = conversation.status === "connecting";
  const speaking = connected && conversation.isSpeaking;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (connected && pending) {
      conversation.sendUserMessage(pending);
      setPending(null);
    }
  }, [connected, pending]);

  const start = async () => {
    setError("");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId: AGENT_ID, connectionType: "webrtc" });
      return true;
    } catch (e) {
      setError(e?.name === "NotAllowedError" ? "Microphone access was denied." : e?.message || "Could not start.");
      return false;
    }
  };

  const submit = async (msg) => {
    const t = msg.trim();
    if (!t) return;
    if (connected) return conversation.sendUserMessage(t);
    setPending(t);
    if (!connecting) await start();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    submit(text);
    setText("");
  };

  const helper = connecting
    ? "Connecting…"
    : !connected
    ? "Tap to start talking"
    : speaking
    ? "RailBot is speaking"
    : "Listening... Speak now";

  return (
    <div className="h-full bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      <header className="w-full border-b border-slate-800 bg-slate-900/50 backdrop-blur py-4 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center font-bold text-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">
            RB
          </div>
          <h1 className="text-xl font-bold tracking-wider text-white">RailBot</h1>
        </div>
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${connected ? "bg-emerald-500" : "bg-slate-500"}`} />
          <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">
            {connected ? "In Call" : "System Online"}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col min-h-0">
        <div className="flex flex-col gap-3 py-2 shrink-0">
          <div
            className={`bg-slate-900 border-2 p-4 rounded-xl flex items-center justify-between relative overflow-hidden transition-all duration-300 ${
              connected
                ? "border-emerald-500/80 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.3)]"
                : "border-slate-800 shadow-[4px_4px_0px_0px_rgba(59,130,246,0.2)]"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative flex items-center justify-center">
                {connected && <div className="absolute inset-0 rounded-lg talk-pulse" />}
                <div
                  className={`w-10 h-10 rounded-lg border-2 border-slate-900 flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] transition-colors duration-300 z-10 ${
                    connected ? "bg-emerald-600" : "bg-blue-600"
                  }`}
                >
                  <Icon name="mic" className="text-xl" />
                </div>
              </div>
              <div>
                <h2 className="text-white font-bold text-sm tracking-wide">Voice Assistant</h2>
                <p className={`text-xs font-medium ${connected ? "text-emerald-400" : "text-slate-400"}`}>{helper}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {connected && (
                <div
                  className="flex items-center space-x-1 px-2 h-8 bg-slate-950/60 rounded border border-slate-800"
                  aria-hidden="true"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`w-1 rounded-full ${speaking ? `bg-emerald-400 wave-bar-${n}` : "bg-slate-600 h-1.5"}`}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={connected ? () => conversation.endSession() : start}
                disabled={connecting}
                className={`text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] transition-all active:scale-95 hover:scale-[1.02] duration-200 z-10 disabled:opacity-60 ${
                  connected ? "bg-emerald-600 hover:bg-emerald-500" : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {connecting ? "Connecting" : connected ? "Stop" : "Talk Now"}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
            {CHIPS.map((c) => (
              <button
                key={c.label}
                onClick={() => submit(c.label)}
                className="whitespace-nowrap bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center space-x-1.5 shadow-sm shrink-0"
              >
                <Icon name={c.icon} className={`text-sm ${c.color}`} />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4 pr-1">
          <Bubble role="agent" text={GREETING} />
          {messages.map((m, i) => (
            <Bubble key={i} {...m} />
          ))}
        </div>

        <div className="pt-2 pb-1 shrink-0 bg-slate-950">
          <form
            onSubmit={onSubmit}
            className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl shadow-lg"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message or ask in Bengali..."
              className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 text-sm md:text-base px-3 py-2 focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              aria-label="Send"
              className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-lg border border-slate-900 transition-all flex items-center justify-center shrink-0 shadow-sm active:scale-95"
            >
              <Icon name="send" className="text-xl" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

function Bubble({ role, text }) {
  const user = role === "user";
  return (
    <div className={`flex items-start max-w-[85%] md:max-w-[75%] animate-fadeIn ${user ? "ml-auto" : "mr-auto"}`}>
      {user ? (
        <div className="bg-blue-600 text-white p-3.5 rounded-xl rounded-tr-sm text-sm md:text-base leading-relaxed shadow-sm font-medium">
          {text}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 text-slate-200 p-3.5 rounded-xl rounded-tl-sm text-sm md:text-base leading-relaxed shadow-sm">
          <span className="inline-block text-xs font-mono text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded mb-1 border border-blue-900/40">
            [railbot]
          </span>
          <div>{text}</div>
        </div>
      )}
    </div>
  );
}
