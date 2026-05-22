import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar/sidebar";
import { useAuth } from "../context/AuthContext";

const AdminLayout = () => {
  const { user } = useAuth();

  if (!user || !user.role?.includes("admin")) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--tenant-bg, #FAF7F2)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
