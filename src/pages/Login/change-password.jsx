import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import ProfileService from "../../services/profile.service";
import { useAuth } from "../../context/AuthContext";
import { Eye as EyeIcon, EyeOff as EyeSlashIcon } from "lucide-react";

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Check if this is a mandatory password change (from URL params or location state)
  const queryParams = new URLSearchParams(location.search);
  const isMandatory = location.state?.mandatory || queryParams.get('mandatory') === 'true';

  // Toggles for showing/hiding password text
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Redirect to login if not logged in, or to home if trying to access this page directly without the mandatory flag
  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (!isMandatory && !location.state) {
      // If user is trying to access this page directly without being redirected from login with mandatory flag
      navigate("/");
    }
  }, [user, navigate, isMandatory, location.state]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Check if new passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      setLoading(false);
      return;
    }

    try {
      // Call the backend update password endpoint
      const response = await ProfileService.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.status === "Success") {
        // Clear the passwordChangeRequired flag from localStorage
        localStorage.removeItem("passwordChangeRequired");
        
        toast.success("Password updated successfully");
        
        // Reset the password fields
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        
        // Show appropriate message based on whether this was a mandatory change or not
        if (isMandatory) {
          toast.success("Your password has been updated. You can now access your account.");
        }
        
        // Redirect to home page after successful password change
        navigate("/");
      }
    } catch (error) {
      const errorMessage =
        error.message || "Failed to update password";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <a href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#8B6914] transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to home
        </a>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center">
            {isMandatory ? "Change Your Password" : "Update Password"}
          </h2>
          
          {isMandatory && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    For security reasons, you need to change your temporary password before continuing.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
            {/* Current Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon size={20} />
                  ) : (
                    <EyeIcon size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon size={20} />
                  ) : (
                    <EyeIcon size={20} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-[#2C2418] py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold hover:scale-[1.01]"
              style={{
                background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)",
                boxShadow: "0 2px 12px rgba(201,168,76,0.3)",
              }}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>

            {!isMandatory && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-sm text-[#8B6914] hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ChangePassword;
