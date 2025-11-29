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
  return (
    <div className="chat-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>UNICHAT</h2>
          <p>{auth.user.email}</p>
          <button onClick={onLogout}>Logout</button>
        </div>

        <ChatList
          users={users}
          conversations={conversations}
          currentUserId={auth.user.id}
          onSelectUser={onSelectUser}
          selectedConversation={selectedConversation}
        />
      </aside>

      <main className="chat-main">
        {selectedConversation ? (
          <ChatWindow
            messages={messages}
            loading={loadingMessages}
            currentUserId={auth.user.id}
            onSendMessage={onSendMessage}
          />
        ) : (
          <div className="empty-state">
            <h3>Select a user to start chatting</h3>
          </div>
        )}
      </main>
    </div>
  );
}

export default ChatLayout;