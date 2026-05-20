// UserLayout.jsx
import React, { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import UserSidebar from "./sidebar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios, { getStoragePrefix } from "../services/axios";
import { toast } from "react-hot-toast";

const UserLayout = () => {
  const navigate = useNavigate();
  
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  // Check if user needs to change password
  useEffect(() => {
    const checkPasswordStatus = async () => {
      try {
        // Get the token from localStorage
        const token = localStorage.getItem(getStoragePrefix() + 'token');
        
        if (!token) {
          navigate('/login');
          return;
        }

        // Make a direct API call to check password status
        const response = await axios.get('/users/check-password-status');
        
        if (response.data && response.data.passwordChangeRequired) {
          setPasswordChangeRequired(true);
          navigate('/change-password?mandatory=true');
          toast.error('You must change your temporary password before accessing your account.');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking password status:', error);
        setLoading(false);
      }
    };

    checkPasswordStatus();
  }, [navigate]);


  // If loading, show loading indicator
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--tenant-bg,#FAF7F2)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C9A84C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If password change required, redirect to change password page
  if (passwordChangeRequired) {
    return <Navigate to="/change-password?mandatory=true" replace />;
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-[var(--tenant-bg,#FAF7F2)]">
      <UserSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="h-16 bg-white shadow-sm flex items-center justify-end lg:justify-between px-8">
          <h1 className="text-xl font-semibold text-gray-800 max-sm:hidden">Welcome Back</h1>
          
          <div className="flex items-center space-x-4">
            <button
              className="px-4 py-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--tenant-accent, #C9A84C)' }}
              onClick={() => navigate("/donate")}
            >
              Make a Donation
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default UserLayout;
