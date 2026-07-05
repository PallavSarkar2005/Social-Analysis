import { createContext, useContext, useState, useEffect } from "react";
import client, { restoreSession } from "../api/client";
import {
  setAccessToken,
  clearAccessToken,
  setTelemetryUserId,
  setAuthFailureHandler,
  clearLegacyAuthStorage,
} from "../api/authToken";
import { devWarn } from "../utils/devLog";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      clearLegacyAuthStorage();
      const restored = await restoreSession();
      if (!restored.success) {
        setLoading(false);
        return;
      }

      try {
        const res = await client.get("/api/auth/me");
        if (res.data?.success) {
          setUser(res.data.data);
          setTelemetryUserId(res.data.data._id);
        } else {
          clearAccessToken();
          setUser(null);
          setTelemetryUserId(null);
        }
      } catch {
        clearAccessToken();
        setUser(null);
        setTelemetryUserId(null);
      } finally {
        setLoading(false);
      }
    };

    setAuthFailureHandler(() => {
      clearAccessToken();
      setUser(null);
      setTelemetryUserId(null);
    });

    initializeAuth();

    return () => {
      setAuthFailureHandler(null);
    };
  }, []);

  const register = async (name, email, password) => {
    try {
      const res = await client.post("/api/auth/register", {
        name,
        email,
        password,
      });
      if (res.data?.success) {
        const { token: userToken, ...userData } = res.data.data;
        setAccessToken(userToken);
        setUser(userData);
        setTelemetryUserId(userData._id);
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
      const res = await client.post("/api/auth/login", {
        email,
        password,
        rememberMe,
      });
      if (res.data?.success) {
        const { token: userToken, ...userData } = res.data.data;
        setAccessToken(userToken);
        setUser(userData);
        setTelemetryUserId(userData._id);
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
        const { token: userToken, ...userData } = res.data.data;
        setAccessToken(userToken);
        setUser(userData);
        setTelemetryUserId(userData._id);
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
      const msg =
        err.response?.data?.message || "Linking Google account failed";
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
      const msg =
        err.response?.data?.message || "Unlinking Google account failed";
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await client.post("/api/auth/logout");
    } catch (err) {
      devWarn("Server-side logout warning:", err);
    }
    clearAccessToken();
    setUser(null);
    setTelemetryUserId(null);
  };

  const updateUser = (newData) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...newData };
      setTelemetryUserId(updated._id);
      return updated;
    });
  };

  const value = {
    user,
    loading,
    login,
    googleLogin,
    register,
    logout,
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
