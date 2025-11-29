// client/src/components/ChatLayout.jsx
import { useState, useEffect } from "react";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";

function ChatLayout({
  auth,
  users,
  conversations,
  selectedConversation,
  messages,
  loadingMessages,
  onLogout,
  onSelectUser,
  onSendMessage,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar when going desktop size
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute current chat partner label
  let currentChatTitle = "UNICHAT";
  if (selectedConversation) {
    const other =
      selectedConversation.participants?.find(
        (p) => p._id !== auth.user.id
      ) || null;
    if (other?.email) currentChatTitle = other.email;
  }

  const handleUserClick = (userId) => {
    onSelectUser(userId);
    // auto-close sidebar on mobile
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="app-root">
      {/* Top app bar */}
      <header className="app-header">
        <div className="app-header-left">
          {/* Hamburger only for small screens */}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setIsSidebarOpen((open) => !open)}
            aria-label="Toggle chat list"
          >
            <div className="hamburger">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>

          <div className="app-logo">U</div>
          <div>
            <div className="app-title">UNICHAT</div>
            <div className="app-subtitle">
              Secure E2EE chats • {currentChatTitle}
            </div>
          </div>
        </div>

        <div className="app-header-right">
          <span className="user-email" title={auth.user.email}>
            {auth.user.email}
          </span>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="app-body">
        <div className="app-shell">
          {/* Sidebar / user list */}
          <aside
            className={`sidebar ${
              isSidebarOpen ? "open" : ""
            }`}
          >
            <div className="sidebar-header">Chats</div>
            <div className="sidebar-scroll">
              <ChatList
                auth={auth}
                users={users}
                conversations={conversations}
                selectedConversation={selectedConversation}
                onSelectUser={handleUserClick}
              />
            </div>
          </aside>

          {/* Chat window */}
          <main className="chat-main">
            <ChatWindow
              auth={auth}
              selectedConversation={selectedConversation}
              messages={messages}
              loading={loadingMessages}
              onSendMessage={onSendMessage}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

export default ChatLayout;
