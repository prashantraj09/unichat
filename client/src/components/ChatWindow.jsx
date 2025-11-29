import { useState, useRef, useEffect } from "react";

function ChatWindow({ messages, loading, currentUserId, onSendMessage }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText("");
  }

  return (
    <div className="chat-window">
      <div className="messages">
        {loading && <p>Loading messages...</p>}
        {messages.map((m) => (
          <div
            key={m._id || m.timestamp}
            className={
              "message-bubble " +
              (m.senderId === currentUserId ? "me" : "them")
            }
          >
            <div className="message-text">{m.plaintext || "[Decryption failed]"}</div>
            <div className="message-meta">
              {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ""}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="message-input" onSubmit={handleSubmit}>
        <input
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default ChatWindow;