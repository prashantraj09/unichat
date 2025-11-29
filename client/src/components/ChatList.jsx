function ChatList({
  users,
  conversations,
  currentUserId,
  onSelectUser,
  selectedConversation,
}) {
  // We’ll show just list of users for now; you can later show conversation previews
  return (
    <div className="chat-list">
      <h3>Users</h3>
      {users.map((u) => (
        <div
          key={u._id}
          className="chat-list-item"
          onClick={() => onSelectUser(u._id)}
        >
          {u.email}
        </div>
      ))}
    </div>
  );
}

export default ChatList;
