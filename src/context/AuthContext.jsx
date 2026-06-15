// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import AuthService from "../services/auth.service";
import axiosInstance, { getStoragePrefix } from "../services/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const prefix = getStoragePrefix();

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) setUser(user);
    setLoading(false);
  }, []);

  const value = {
    user,
    setUser,
    loading,
    login: async (credentials) => {
      const data = await AuthService.login(credentials);
      setUser(data);

      // If password change is required, redirect immediately
      if (data.passwordChangeRequired) {
        window.location.href = "/change-password?mandatory=true";
      }

      return data;
    },
    register: async (userData) => {
      const data = await AuthService.register(userData);
      setUser(data);
      return data;
    },
    loginAdmin: async (credentials) => {
      const data = await AuthService.adminLogin(credentials);
      setUser({ ...data, isAdmin: true });
      return data;
    },
    googleAuth: async (credential) => {
      const data = await AuthService.googleAuth(credential);
      setUser(data.user);
      return data;
    },
    logout: () => {
      AuthService.logout();
      setUser(null);
    },
    // Function to refresh user data
    refreshUserData: async () => {
      try {
        const token = localStorage.getItem(prefix + "token");
        if (!token) return;

        const response = await axiosInstance.get("/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.status === "Success") {
          const userData = {
            ...user,
            ...response.data.user,
            token,
          };

          setUser(userData);
          localStorage.setItem(prefix + "user", JSON.stringify(userData));
        }
      } catch (err) {
        console.error("Error refreshing user data:", err);
      }
    },
  };

  // Render nothing during the brief auth hydration — no bare "Loading…" flash
  // before the branded TenantLoader takes over.
  if (loading) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
