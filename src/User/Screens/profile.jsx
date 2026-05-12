import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Globe,
  Bell,
  Shield,
  Camera,
  Loader2,
  X,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react";
import ProfileService from "../../services/profile.service";
import { toast } from "react-hot-toast";

const ProfileSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Toggles for showing/hiding password text
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "United States",
    language: "English",
    currency: "USD",
    profileImage: "/api/placeholder/100/100",
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
    },
    emailNotifications: true,
    donationReceipts: true,
    monthlyNewsletter: true,
    impactUpdates: true,
    twoFactorEnabled: false,
    passwordLastChanged: new Date().toISOString(),
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profile = await ProfileService.getProfile();
      console.log("Received profile data from backend:", profile);
      console.log("Address data:", profile.address);

      setFormData((prevData) => ({
        ...prevData,
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        country: profile.country || "",
        language: profile.language || "English",
        currency: profile.currency || "USD",
        profileImage: profile.profileImage || "/api/placeholder/100/100",
        address: {
          street: profile.address?.street || "",
          city: profile.address?.city || "",
          state: profile.address?.state || "",
          postalCode: profile.address?.postalCode || "",
        },
        emailNotifications: profile.notifications?.emailNotifications ?? true,
        donationReceipts: profile.notifications?.donationReceipts ?? true,
        monthlyNewsletter: profile.notifications?.monthlyNewsletter ?? true,
        impactUpdates: profile.notifications?.impactUpdates ?? true,
        twoFactorEnabled: profile.twoFactorEnabled || false,
      }));
    } catch (error) {
      console.error("Profile fetch error:", error);
      toast.error(error.message || "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Form data updated:", formData);
  }, [formData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      // Ensure we have a complete address object
      const updatedAddress = {
        street: prev.address?.street || '',
        city: prev.address?.city || '',
        state: prev.address?.state || '',
        postalCode: prev.address?.postalCode || '',
        // Update the specific field that changed
        [name]: value,
      };
      
      console.log('Updated address in form:', updatedAddress);
      
      return {
        ...prev,
        address: updatedAddress,
      };
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNotificationChange = (key) => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const response = await ProfileService.uploadProfileImage(file);
      setFormData((prev) => ({
        ...prev,
        profileImage: response.imageUrl,
      }));
      toast.success("Profile image updated successfully");
    } catch (error) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setSaving(false);
    }
  };

  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // Ensure we're sending a complete address object
      const addressToSend = {
        street: formData.address?.street || '',
        city: formData.address?.city || '',
        state: formData.address?.state || '',
        postalCode: formData.address?.postalCode || '',
      };
      
      console.log('Sending profile update with address:', addressToSend);
      
      await ProfileService.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        country: formData.country,
        language: formData.language,
        currency: formData.currency,
        address: addressToSend,
      });
      
      toast.success("Profile updated successfully");
      
      // Refresh profile data to ensure we have the latest data
      await fetchProfile();
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await ProfileService.updateNotifications({
        emailNotifications: formData.emailNotifications,
        donationReceipts: formData.donationReceipts,
        monthlyNewsletter: formData.monthlyNewsletter,
        impactUpdates: formData.impactUpdates,
      });
      toast.success("Notification preferences updated");
    } catch (error) {
      console.error("Notification update error:", error);
      toast.error(error.message || "Failed to update notifications");
    } finally {
      setSaving(false);
    }
  };

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
      const errorMessage =
        error.message || "Failed to update password";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };
  

  const handleTwoFactorToggle = async () => {
    try {
      setSaving(true);
      await ProfileService.updateTwoFactor(!formData.twoFactorEnabled);
      setFormData((prev) => ({
        ...prev,
        twoFactorEnabled: !prev.twoFactorEnabled,
      }));
      toast.success("2FA settings updated");
    } catch (error) {
      toast.error(error.message || "Failed to update 2FA settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      setSaving(true);
      await ProfileService.signOutAllDevices();
      toast.success("Signed out of all other devices");
    } catch (error) {
      toast.error(error.message || "Failed to sign out all devices");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

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
        {/* Tabs */}
        <div className="lg:w-64 bg-white rounded-xl shadow-sm border border-[#C9A84C]/10 overflow-hidden">
          <nav className="flex flex-col p-2">
            {[
              { id: "general", label: "General", icon: User },
              { id: "address", label: "Address", icon: MapPin },
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

        {/* Right Content */}
        <div className="flex-1">
          {/* General Tab */}
          {activeTab === "general" && (
            <form
              onSubmit={handleGeneralSubmit}
              className="bg-white rounded-xl shadow-sm border border-[#C9A84C]/10 p-6"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                      required
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    {loading ? (
                      <div className="flex items-center space-x-2 h-10 px-4 py-2 border border-gray-200 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-[#C9A84C]" />
                        <span className="text-gray-500">Loading...</span>
                      </div>
                    ) : (
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                      >
                        <option disabled value="">
                          Select Country
                        </option>
                        <option value="AU">Australia</option>
                        <option value="BB">Barbados</option>
                        <option value="CA">Canada</option>
                        <option value="IN">India</option>
                        <option value="PK">Pakistan</option>
                        <option value="GB">United Kingdom</option>
                        <option value="US">United States</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center px-6 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B8952F] transition-colors disabled:bg-teal-300"
                  >
                    {saving && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Address Tab */}
          {activeTab === "address" && (
            <form
              onSubmit={handleGeneralSubmit}
              className="bg-white rounded-xl shadow-sm border border-[#C9A84C]/10 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Address Information
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={formData.address.street}
                      onChange={handleAddressChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.address.city}
                        onChange={handleAddressChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/Province
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.address.state}
                        onChange={handleAddressChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.address.postalCode}
                      onChange={handleAddressChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center px-6 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B8952F] transition-colors disabled:bg-teal-300"
                  >
                    {saving && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Save Address
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Notifications Tab (if you have a 'notifications' tab somewhere) */}
          {activeTab === "notifications" && (
            <form
              onSubmit={handleNotificationSubmit}
              className="bg-white rounded-xl shadow-sm border border-[#C9A84C]/10 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Notification Preferences
              </h2>
              {/* ... your notifications form ... */}
            </form>
          )}

          {/* Password Tab */}
          {activeTab === "password" && (
            <form
              onSubmit={handlePasswordSubmit}
              className="bg-white rounded-xl shadow-sm border border-[#C9A84C]/10 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Change Password
              </h2>

              <div className="space-y-4">
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
                    onClick={() =>
                      setShowCurrentPassword((prev) => !prev)
                    }
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
                    onClick={() =>
                      setShowNewPassword((prev) => !prev)
                    }
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
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/6 text-gray-500"
                  >
                    {showConfirmPassword ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab("general")}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
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
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
