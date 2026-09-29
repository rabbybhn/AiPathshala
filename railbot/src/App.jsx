import { useState, useRef, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";

const AGENT_ID = "agent_9201m3n9wwe9e9mtn64cwwdmk39k";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const logRef = useRef(null);

  const conversation = useConversation({
    onMessage: (m) =>
      setMessages((prev) => [...prev, { role: m.source === "user" ? "user" : "agent", text: m.message }]),
    onError: (e) => setError(typeof e === "string" ? e : e?.message || "Something went wrong"),
  });

  const connected = conversation.status === "connected";

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const start = async () => {
    setError("");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId: AGENT_ID, connectionType: "webrtc" });
    } catch (e) {
      setError(e?.name === "NotAllowedError" ? "Microphone access was denied." : e?.message || "Could not start.");
    }
  };

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !connected) return;
    conversation.sendUserMessage(text.trim());
    setText("");
  };

  const state = !connected ? "idle" : conversation.isSpeaking ? "speaking" : "listening";

  return (
    <main className="app">
      <h1>RailBot</h1>
      <button
        className={`orb ${state}`}
        onClick={connected ? () => conversation.endSession() : start}
        disabled={conversation.status === "connecting"}
        aria-label={connected ? "End conversation" : "Start conversation"}
      >
        {conversation.status === "connecting" ? "…" : connected ? "End" : "Talk"}
      </button>
      <p className="state">
        {state === "idle" ? "Tap to start talking" : state === "speaking" ? "RailBot is speaking" : "Listening…"}
      </p>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="log" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>{m.text}</div>
        ))}
      </div>

      <form className="composer" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={connected ? "Or type a message" : "Start a conversation to type"}
          disabled={!connected}
        />
        <button type="submit" disabled={!connected || !text.trim()}>Send</button>
      </form>
    </main>
  );
}
