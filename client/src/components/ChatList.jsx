// client/src/components/ChatList.jsx
function ChatList({
  auth,
  users,
  conversations,
  selectedConversation,
  onSelectUser,
}) {
  // Helper: get conversation with this user (if exists)
  const findConversationByUser = (userId) =>
    conversations.find((c) =>
      c.participants.some((p) => p._id === userId)
    );

  return (
    <div>
      {users
        .filter((u) => u._id !== auth.user.id)
        .map((user) => {
          const convo = findConversationByUser(user._id);
          const isActive =
            selectedConversation &&
            convo &&
            selectedConversation._id === convo._id;

          const firstLetter =
            user.email?.charAt(0)?.toUpperCase() || "?";

          return (
            <div
              key={user._id}
              className={`user-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectUser(user._id)}
            >
              <div className="user-avatar">{firstLetter}</div>
              <div className="user-info">
                <div style={{ fontSize: "0.8rem" }}>
                  {user.email}
                </div>
                {convo?.lastMessageAt && (
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "#9ca3af",
                    }}
                  >
                    Last active:{" "}
                    {new Date(
                      convo.lastMessageAt
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default ChatList;
