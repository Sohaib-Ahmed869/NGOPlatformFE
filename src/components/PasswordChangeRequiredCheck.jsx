import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PasswordChangeRequiredCheck = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  useEffect(() => {
    // Skip this check if we're already on the change-password page
    if (location.pathname === '/change-password') {
      return;
    }
    
    // Check if password change is required from localStorage
    const passwordChangeRequired = localStorage.getItem('passwordChangeRequired') === 'true';
    
    if (user && passwordChangeRequired) {
      // Redirect to change password page with mandatory flag
      navigate('/change-password', { state: { mandatory: true } });
    }
  }, [user, navigate, location.pathname]);
  
  // This component doesn't render anything
  return null;
};

export default PasswordChangeRequiredCheck;
