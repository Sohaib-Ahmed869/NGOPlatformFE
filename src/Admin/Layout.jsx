import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar/sidebar";

// This is a basic auth check - replace with your actual auth logic
const useAuth = () => {
  // Replace this with your actual auth check
  const isAdmin = true; // Temporarily set to true for development
  return isAdmin;
};

const AdminLayout = () => {
  const isAuthenticated = useAuth();



  return (
    <div className="flex h-screen bg-[#FAF7F2]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
