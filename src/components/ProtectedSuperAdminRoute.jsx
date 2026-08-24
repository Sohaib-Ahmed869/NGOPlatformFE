import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedSuperAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (!user || user.role !== "superadmin") {
    return <Navigate to="/login" replace />;
  }

  // Owner/Admin operators without MFA enrolled yet must finish enrollment
  // before reaching anything else in the console (see loginAdmin's
  // mfaSetupRequired flag). The flag is cleared client-side by MfaSetupRequired
  // once enrollment succeeds.
  if (user.mfaSetupRequired && location.pathname !== "/mfa-setup") {
    return <Navigate to="/mfa-setup" replace />;
  }

  return children;
};

export default ProtectedSuperAdminRoute;
