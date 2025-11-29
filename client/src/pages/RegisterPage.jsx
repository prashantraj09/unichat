import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { generateIdentityKeysAndBlob } from "../crypto/cryptoUtils";

function RegisterPage() {
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
      const {
        publicJwk,
        encryptedPrivateKeyBlob,
      } = await generateIdentityKeysAndBlob(password);

      await api.post("/register", {
        email,
        password,
        publicIdentityKeyJwk: publicJwk,
        encryptedPrivateKeyBlob,
      });

      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h1>UNICHAT – Register</h1>
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
        <button disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
