import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { AlertCircle, Lock, Mail, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import "./Auth.css";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? "http://127.0.0.1:3000" : "");

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/signup`,
        { username, email, password },
        { withCredentials: true, timeout: 8000 },
      );
      if (response.data?.success && response.data?.user) {
        login(response.data.user);
        navigate("/dashboard");
      } else
        setError("Account services are not configured for this deployment.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err))
        setError(err.response?.data?.error || "Unable to create the account.");
      else setError("Unable to create the account.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="auth-container container flex-center">
      <div className="auth-card glass-panel animate-fade-in">
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">
          Start a secure Job Way learning profile.
        </p>
        {error && (
          <div className="auth-error flex-center" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <div className="input-icon">
              <User size={18} />
            </div>
            <input
              type="text"
              className="input-field with-icon"
              placeholder="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              minLength={2}
              maxLength={40}
              required
            />
          </div>
          <div className="input-group">
            <div className="input-icon">
              <Mail size={18} />
            </div>
            <input
              type="email"
              className="input-field with-icon"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
            />
          </div>
          <div className="input-group">
            <div className="input-icon">
              <Lock size={18} />
            </div>
            <input
              type="password"
              className="input-field with-icon"
              placeholder="Password (12+ characters)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={isLoading}
          >
            {isLoading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
