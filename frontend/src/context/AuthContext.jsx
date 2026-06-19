import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    name: "Pallav Sarkar",
    email: "developer@socialiq.ai",
    company: "SocialIQ Lab",
    role: "Lead Analytics Architect",
    avatar: "P",
    tier: "Developer Pro",
    activeSince: "June 2026",
    limits: {
      used: 8402,
      total: 25000,
      nodesUsed: 2,
      nodesTotal: 50
    }
  });

  // Sync with local storage if modified
  useEffect(() => {
    const saved = localStorage.getItem("socialiq_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved user settings:", e);
      }
    }
  }, []);

  const updateUser = (newData) => {
    setUser((prev) => {
      const updated = { ...prev, ...newData, avatar: newData.name ? newData.name.charAt(0).toUpperCase() : prev.avatar };
      localStorage.setItem("socialiq_user", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
