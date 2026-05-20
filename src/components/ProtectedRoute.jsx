import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios, { getStoragePrefix } from '../services/axios';

const ProtectedRoute = ({ children }) => {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  useEffect(() => {
    const checkPasswordStatus = async () => {
      try {
        // Skip this check if we're already on the change-password page
        if (location.pathname === '/change-password') {
          setIsLoading(false);
          return;
        }

        // Get the token from localStorage
        const token = localStorage.getItem(getStoragePrefix() + 'token');
        
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Make a direct API call to check password status
        const response = await axios.get('/users/check-password-status');
        
        if (response.data && response.data.passwordChangeRequired) {
          setPasswordChangeRequired(true);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking password status:', error);
        setIsLoading(false);
      }
    };

    checkPasswordStatus();
  }, [location.pathname]);

  if (isLoading) {
    // You could show a loading spinner here
    return <div>Loading...</div>;
  }

  // If password change is required, redirect to change password page
  if (passwordChangeRequired) {
    return <Navigate to="/change-password" state={{ mandatory: true }} replace />;
  }

  // If user is not logged in, redirect to login page
  if (!user && location.pathname.startsWith('/user')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If all checks pass, render the protected content
  return children;
};

export default ProtectedRoute;
