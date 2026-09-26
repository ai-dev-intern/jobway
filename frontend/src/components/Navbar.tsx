import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Code2, LogOut, Palette, User as UserIcon } from "lucide-react";
import "./Navbar.css";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "sunset" | "dark">(
    () =>
      (localStorage.getItem("jobway-theme") as "light" | "sunset" | "dark") ||
      "light",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("jobway-theme", theme);
  }, [theme]);

  const handleLogout = async () => {
    const apiBase =
      import.meta.env.VITE_API_BASE ||
      (import.meta.env.DEV ? "http://127.0.0.1:3000" : "");
    try {
      await fetch(`${apiBase}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* Local state must still be cleared if the API is unavailable. */
    }
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar glass-header">
      <div className="container flex-between">
        <Link to="/" className="nav-brand flex-center">
          <Code2 size={28} className="brand-icon text-gradient" />
          <span className="brand-text">
            Job Way <small>CAREER LAUNCHPAD</small>
          </span>
        </Link>

        <div className="nav-links flex-center">
          <NavLink
            to="/prepare"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Start Here
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Learn
          </NavLink>
          <NavLink
            to="/workflow"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Roadmap
          </NavLink>
          <NavLink
            to="/practice"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Practice
          </NavLink>
          <NavLink
            to="/companies/chances"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Companies
          </NavLink>
          <label className="theme-picker">
            <Palette size={16} />
            <span className="sr-only">Choose color theme</span>
            <select
              value={theme}
              onChange={(event) =>
                setTheme(event.target.value as "light" | "sunset" | "dark")
              }
              aria-label="Color theme"
            >
              <option value="light">Fresh</option>
              <option value="sunset">Sunset</option>
              <option value="dark">Midnight</option>
            </select>
          </label>

          {isAuthenticated ? (
            <div className="auth-group flex-center">
              <Link to="/profile" className="nav-user flex-center">
                <UserIcon size={18} />
                <span>{user?.username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="btn-icon"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="auth-group flex-center">
              <Link to="/login" className="nav-link">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
