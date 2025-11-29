import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { decryptPrivateIdentityKey } from "../crypto/cryptoUtils";

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/login", { email, password });
      const { token, user } = res.data;

      // Derive private identity key in memory
      const privateIdentityKey = await decryptPrivateIdentityKey(
        password,
        user.encryptedPrivateKeyBlob
      );

      const authData = {
        token,
        user: {
          id: user.id,
          email: user.email,
          publicIdentityKeyJwk: user.publicIdentityKeyJwk,
        },
        // we can't store CryptoKey in localStorage, just keep in state
      };

      onLogin({ ...authData, privateIdentityKey });
      navigate("/");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h1>UNICHAT – Login</h1>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
      </form>
      <p>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

export default LoginPage;
