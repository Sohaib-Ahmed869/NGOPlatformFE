import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Loader2, User, MapPin } from "lucide-react";
import { toast } from "react-hot-toast";
import ProfileService from "../../services/profile.service";


const ProfileSettings = () => {
  // State for active tab; default to "password" tab
  const [activeTab, setActiveTab] = useState("password");
  
  // Loading state for "saving" the password
  const [saving, setSaving] = useState(false);

  // Toggles for showing/hiding password text
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Local state for password fields
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Handle changes to the password fields
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
  
    // Check if new passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
  
    try {
      setSaving(true);
      // Call the backend update password endpoint.
      // Note: ProfileService.updatePassword returns response.data already.
      const response = await ProfileService.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
  
      // Check the returned response object
      if (response && response.status === "Success") {
        toast.success(response.message);
        // Reset the password fields after a successful update
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        // Optionally switch back to the General tab
        setActiveTab("general");
      }
    } catch (error) {
      // Extract error message
      const errorMessage = error.message || "Failed to update password";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };
  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#C9A84C]/10">
        <h1 className="text-2xl font-bold text-gray-800">Profile Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account preferences and settings
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 bg-white rounded-xl shadow-sm border border-[#C9A84C]/10 overflow-hidden">
          <nav className="flex flex-col p-2">
            {[
              { id: "password", label: "Change Password", icon: Lock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-left ${
                  activeTab === tab.id
                    ? "bg-[#FAF7F2] text-[#C9A84C]"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Password Change Form */}
        {activeTab === "password" && (
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-[#C9A84C]/10 p-6 mt-8 flex-1">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Change Password
            </h2>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/6 text-gray-500"
                >
                  {showCurrentPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* New Password Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/6 text-gray-500"
                >
                  {showNewPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Confirm New Password Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/6 text-gray-500"
                >
                  {showConfirmPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B8952F] transition-colors disabled:bg-teal-300"
                >
                  {saving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;
