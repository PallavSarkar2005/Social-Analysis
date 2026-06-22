import { createContext, useContext, useState, useEffect } from "react";
import client from "../api/client";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Initialize Auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (storedToken) {
        setToken(storedToken);
      }
      try {
        // Verify/refresh user data from backend using token or cookies
        const res = await client.get("/api/auth/me");
        if (res.data && res.data.success) {
          setUser(res.data.data);
          const currentToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
          setToken(currentToken);
        } else {
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
          }
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.log("No active session or session expired.");
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for custom logout events dispatched by Axios interceptor
    const handleAuthLogout = () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      setUser(null);
      setToken(null);
    };

    window.addEventListener("auth-logout", handleAuthLogout);
    return () => {
      window.removeEventListener("auth-logout", handleAuthLogout);
    };
  }, []);

  // Register user
  const register = async (name, email, password) => {
    try {
      const res = await client.post("/api/auth/register", { name, email, password });
      if (res.data && res.data.success) {
        const { token: userToken, ...userData } = res.data.data;
        if (typeof window !== "undefined") {
          localStorage.setItem("token", userToken);
        }
        setUser(userData);
        setToken(userToken);
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || "Registration failed";
      return { success: false, message: msg };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const res = await client.post("/api/auth/login", { email, password });
      if (res.data && res.data.success) {
        const { token: userToken, ...userData } = res.data.data;
        if (typeof window !== "undefined") {
          localStorage.setItem("token", userToken);
        }
        setUser(userData);
        setToken(userToken);
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || "Login failed";
      return { success: false, message: msg };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await client.post("/api/auth/logout");
    } catch (err) {
      console.warn("Server-side logout warning:", err);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setUser(null);
    setToken(null);
  };

  const updateUser = (newData) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...newData };
    });
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
