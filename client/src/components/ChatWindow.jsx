// client/src/components/ChatWindow.jsx
import { useEffect, useRef, useState } from "react";

function ChatWindow({
  auth,
  selectedConversation,
  messages,
  loading,
  onSendMessage,
}) {
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText("");
  };

  if (!selectedConversation) {
    return (
      <div className="chat-empty-state">
        Select a user from the list to start chatting securely with
        UNICHAT.
      </div>
    );
  }

  const other =
    selectedConversation.participants?.find(
      (p) => p._id !== auth.user.id
    ) || null;

  return (
    <>
      {/* Inner chat header (hidden on small screens via CSS) */}
      <div className="chat-header">
        <div>
          <div className="chat-header-title">
            {other?.email || "Chat"}
          </div>
          <div className="chat-header-sub">
            Messages are end-to-end encrypted.
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {loading && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "#9ca3af",
              marginBottom: "0.5rem",
            }}
          >
            Loading messages...
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.senderId === auth.user.id;
          return (
            <div
              key={m._id || `${m.timestamp}-${m.counter}`}
              className={`message-row ${
                isMe ? "me" : "them"
              }`}
            >
              <div className="message-bubble">
                <div>{m.plaintext}</div>
                <div className="message-meta">
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="chat-input-bar"
        onSubmit={handleSubmit}
      >
        <input
          className="chat-input"
          placeholder="Type a secure message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="chat-send-btn" type="submit">
          Send
        </button>
      </form>
    </>
  );
}

export default ChatWindow;
