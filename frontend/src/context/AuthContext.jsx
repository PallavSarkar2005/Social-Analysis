import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import client, {
  fetchCsrfToken,
  setAccessToken,
  setCsrfToken,
  syncAuthFromResponse,
} from "../api/client";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const clearAuthState = useCallback(() => {
    setAccessToken(null);
    setCsrfToken(null);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const applyAuthResponse = useCallback((data) => {
    const result = syncAuthFromResponse(data);
    if (result?.token) {
      setToken(result.token);
      setUser(result.userData);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await fetchCsrfToken();
        const res = await client.post("/api/auth/refresh");
        if (res.data?.success) {
          applyAuthResponse(res.data.data);
        } else {
          clearAuthState();
        }
      } catch {
        clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const handleAuthLogout = () => {
      clearAuthState();
    };

    window.addEventListener("auth-logout", handleAuthLogout);
    return () => window.removeEventListener("auth-logout", handleAuthLogout);
  }, [applyAuthResponse, clearAuthState]);

  const register = async (name, email, password) => {
    try {
      const res = await client.post("/api/auth/register", { name, email, password });
      if (res.data?.success) {
        applyAuthResponse(res.data.data);
        queryClient.clear();
        return { success: true };
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        "Registration failed";
      return { success: false, message: msg };
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const res = await client.post("/api/auth/login", { email, password, rememberMe });
      if (res.data?.success) {
        applyAuthResponse(res.data.data);
        queryClient.clear();
        return { success: true };
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        "Login failed";
      return { success: false, message: msg };
    }
  };

  const googleLogin = async (idToken) => {
    try {
      const res = await client.post("/api/auth/google", { idToken });
      if (res.data?.success) {
        applyAuthResponse(res.data.data);
        queryClient.clear();
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Google login failed";
      return { success: false, message: msg };
    }
  };

  const connectGoogle = async (idToken) => {
    try {
      const res = await client.post("/api/auth/google/connect", { idToken });
      if (res.data?.success) {
        updateUser(res.data.data);
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Linking Google account failed";
      return { success: false, message: msg };
    }
  };

  const disconnectGoogle = async () => {
    try {
      const res = await client.post("/api/auth/google/disconnect");
      if (res.data?.success) {
        updateUser(res.data.data);
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Unlinking Google account failed";
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await client.post("/api/auth/logout");
    } catch (err) {
      console.warn("Server-side logout warning:", err);
    }
    clearAuthState();
    await fetchCsrfToken();
  };

  const refreshSession = async () => {
    try {
      const res = await client.post("/api/auth/refresh");
      if (res.data?.success) {
        applyAuthResponse(res.data.data);
        return { success: true };
      }
    } catch {
      return { success: false };
    }
  };

  const updateUser = (newData) => {
    setUser((prev) => (prev ? { ...prev, ...newData } : null));
  };

  const value = {
    user,
    token,
    loading,
    login,
    googleLogin,
    register,
    logout,
    refreshSession,
    updateUser,
    connectGoogle,
    disconnectGoogle,
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
