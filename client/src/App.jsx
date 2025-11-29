import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";
import { setAuthToken } from "./api/axios";

function App() {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem("unichat_auth");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (auth?.token) {
      setAuthToken(auth.token);
    }
  }, [auth]);

  function handleLogin(authData) {
    setAuth(authData);
    localStorage.setItem("unichat_auth", JSON.stringify(authData));
    setAuthToken(authData.token);
  }

  function handleLogout() {
    setAuth(null);
    localStorage.removeItem("unichat_auth");
    setAuthToken(null);
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          auth ? (
            <ChatPage auth={auth} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
}

export default App;
