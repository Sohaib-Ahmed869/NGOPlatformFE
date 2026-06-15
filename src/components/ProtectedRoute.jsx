import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios, { getStoragePrefix } from '../services/axios';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  // Temporary-password check runs in the background — it does NOT block render,
  // so there's no "Loading…" flash when entering a protected page. If a change
  // is required we redirect once the check resolves.
  useEffect(() => {
    const checkPasswordStatus = async () => {
      try {
        if (location.pathname === '/change-password') return;
        const token = localStorage.getItem(getStoragePrefix() + 'token');
        if (!token) return;
        const response = await axios.get('/users/check-password-status');
        if (response.data?.passwordChangeRequired) setPasswordChangeRequired(true);
      } catch (error) {
        console.error('Error checking password status:', error);
      }
    };
    checkPasswordStatus();
  }, [location.pathname]);

  if (passwordChangeRequired) {
    return <Navigate to="/change-password" state={{ mandatory: true }} replace />;
  }

  if (!user && location.pathname.startsWith('/user')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
