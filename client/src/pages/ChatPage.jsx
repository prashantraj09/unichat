// client/src/pages/ChatPage.jsx
import { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import ChatLayout from "../components/ChatLayout";
import {
  deriveConversationKey,
  encryptMessage,
  decryptMessage,
} from "../crypto/cryptoUtils";

// WebSocket base URL: uses env in production, localhost in dev
const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL || "ws://localhost:5000/ws";

function ChatPage({ auth, onLogout }) {
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [convKeys, setConvKeys] = useState({}); // convoId -> CryptoKey

  const wsRef = useRef(null);
  const counterRef = useRef({}); // convoId -> last used counter

  // Refs to always have latest state inside WebSocket handler
  const selectedConversationRef = useRef(null);
  const convKeysRef = useRef({});
  const conversationsRef = useRef([]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    convKeysRef.current = convKeys;
  }, [convKeys]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // 1) Open WebSocket ONCE (per login)
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}?token=${auth.token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "NEW_MESSAGE") {
        const m = msg.payload;
        const convId = m.conversationId;

        // Update conversations list (lastMessageAt + sort)
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c._id === convId ? { ...c, lastMessageAt: m.timestamp } : c
          );

          return updated
            .slice()
            .sort((a, b) => {
              const aTime = a.lastMessageAt || a.createdAt;
              const bTime = b.lastMessageAt || b.createdAt;
              return new Date(bTime) - new Date(aTime);
            });
        });

        // Only show message if this conversation is currently open
        const currentConv = selectedConversationRef.current;
        if (!currentConv || currentConv._id !== convId) return;

        const convKey = convKeysRef.current[convId];
        if (!convKey) return;

        const aad = {
          senderId: m.senderId,
          conversationId: convId,
          counter: m.counter,
        };

        try {
          const plaintext = await decryptMessage(
            convKey,
            m.ciphertext, // array from server
            m.iv,         // array from server
            aad
          );

          setMessages((prev) => [...prev, { ...m, plaintext }]);
        } catch (err) {
          console.error("Failed to decrypt incoming message:", err);
        }
      }
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    return () => {
      ws.close();
    };
  }, [auth.token]);

  // 2) Load users + conversations once on mount, auto-open most recent
  useEffect(() => {
    async function loadInitial() {
      try {
        const [usersRes, convRes] = await Promise.all([
          api.get("/users"),
          api.get("/conversations"),
        ]);

        const usersData = usersRes.data;
        const convosData = convRes.data;

        setUsers(usersData);

        // sort most recent conversation first
        convosData.sort((a, b) => {
          const aTime = a.lastMessageAt || a.createdAt;
          const bTime = b.lastMessageAt || b.createdAt;
          return new Date(bTime) - new Date(aTime);
        });

        setConversations(convosData);

        // auto-open the most recent conversation
        if (convosData.length > 0) {
          setSelectedConversation(convosData[0]);
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
      }
    }

    loadInitial();
  }, []);

  // 3) When selectedConversation changes → derive key + load & decrypt history
  useEffect(() => {
    if (!selectedConversation) return;

    let cancelled = false;

    async function loadConversationMessages() {
      setLoadingMessages(true);
      const convo = selectedConversation;
      const convId = convo._id;

      // a) ensure we have a conversation key
      let convKey = convKeysRef.current[convId];
      if (!convKey) {
        const other = convo.participants.find(
          (p) => p._id !== auth.user.id
        );

        const userRes = await api.get(
          `/users/${other._id}/public-key`
        );

        convKey = await deriveConversationKey(
          auth.privateIdentityKey,
          userRes.data.publicIdentityKeyJwk,
          convo.hkdfSalt,
          convId
        );

        if (cancelled) return;

        setConvKeys((prev) => ({
          ...prev,
          [convId]: convKey,
        }));
      }

      // b) load encrypted message history
      const res = await api.get(`/conversations/${convId}/messages`);
      if (cancelled) return;

      const decrypted = [];

      for (const m of res.data) {
        try {
          const ciphertextArr = JSON.parse(m.ciphertext);
          const ivArr = JSON.parse(m.iv);
          const aad = {
            senderId: m.senderId,
            conversationId: m.conversationId,
            counter: m.counter,
          };

          const plaintext = await decryptMessage(
            convKey,
            ciphertextArr,
            ivArr,
            aad
          );

          decrypted.push({ ...m, plaintext });
        } catch (err) {
          console.error("Decrypt history error:", err);
          decrypted.push({
            ...m,
            plaintext: "[Decryption failed]",
          });
        }
      }

      if (cancelled) return;
      setMessages(decrypted);
      setLoadingMessages(false);
    }

    loadConversationMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedConversation, auth.user.id, auth.privateIdentityKey]);

  // 4) When user clicks someone in the list → find/create convo → select it
  async function handleSelectUser(userId) {
    // check if conversation already exists
    let convo = conversationsRef.current.find((c) =>
      c.participants.some((p) => p._id === userId)
    );

    if (!convo) {
      // create new conversation
      const res = await api.post("/conversations", {
        participantId: userId,
      });

      const newConvo = res.data;

      // refetch conversations with populated participants
      const convRes = await api.get("/conversations");
      const convosData = convRes.data.sort((a, b) => {
        const aTime = a.lastMessageAt || a.createdAt;
        const bTime = b.lastMessageAt || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });

      setConversations(convosData);

      convo = convosData.find((c) => c._id === newConvo._id);
    }

    setSelectedConversation(convo);
  }

  // 5) Send a new message (encrypt + send over WebSocket)
  async function handleSendMessage(text) {
    if (!selectedConversation) return;

    const convId = selectedConversation._id;
    const convKey = convKeysRef.current[convId];
    if (!convKey) return;

    const other = selectedConversation.participants.find(
      (p) => p._id !== auth.user.id
    );

    const currentCounter = (counterRef.current[convId] || 0) + 1;
    counterRef.current[convId] = currentCounter;

    const aad = {
      senderId: auth.user.id,
      conversationId: convId,
      counter: currentCounter,
    };

    const encrypted = await encryptMessage(convKey, text, aad);

    const payload = {
      conversationId: convId,
      recipientId: other._id,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      counter: currentCounter,
      keyId: "convKey-v1",
      timestamp: Date.now(),
    };

    // Only send to server – do NOT append locally here.
    wsRef.current?.send(
      JSON.stringify({
        type: "SEND_MESSAGE",
        payload,
      })
    );

    // update conversations order locally (recent on top)
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c._id === convId
          ? { ...c, lastMessageAt: payload.timestamp }
          : c
      );
      return updated
        .slice()
        .sort((a, b) => {
          const aTime = a.lastMessageAt || a.createdAt;
          const bTime = b.lastMessageAt || b.createdAt;
          return new Date(bTime) - new Date(aTime);
        });
    });
  }

  return (
    <ChatLayout
      auth={auth}
      users={users}
      conversations={conversations}
      selectedConversation={selectedConversation}
      messages={messages}
      loadingMessages={loadingMessages}
      onLogout={onLogout}
      onSelectUser={handleSelectUser}
      onSendMessage={handleSendMessage}
    />
  );
}

export default ChatPage;
