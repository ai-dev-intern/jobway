import { create } from "zustand";

interface User {
  id: string;
  username: string;
  email?: string;
}
interface AuthState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>((set) => {
  const raw = localStorage.getItem("jobway-user");
  let initialUser: User | null = null;
  if (raw) {
    try {
      const candidate = JSON.parse(raw);
      if (
        candidate &&
        typeof candidate.id === "string" &&
        typeof candidate.username === "string"
      )
        initialUser = candidate;
    } catch {
      localStorage.removeItem("jobway-user");
    }
  }
  // Remove tokens written by older builds. Authentication now uses an HttpOnly cookie.
  localStorage.removeItem("token");
  return {
    user: initialUser,
    isAuthenticated: !!initialUser,
    login: (user) => {
      localStorage.setItem("jobway-user", JSON.stringify(user));
      set({ user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem("jobway-user");
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      set({ user: null, isAuthenticated: false });
    },
  };
});
