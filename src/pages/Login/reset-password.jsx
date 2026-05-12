// ResetPassword.js
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import axiosInstance from "../../services/axios";
const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.password || !formData.confirmPassword) {
        toast.error("Please fill in all fields");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      const response = await axiosInstance.post(`/users/reset-password/${token}`, {
        password: formData.password,
      });

      if (response.data.status === "Success") {
        toast.success("Password reset successful!");
        navigate("/login");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
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
          <h2 className="text-3xl font-bold text-center">Reset Password</h2>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-[#2C2418] py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold hover:scale-[1.01]"
              style={{
                background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)",
                boxShadow: "0 2px 12px rgba(201,168,76,0.3)",
              }}
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ResetPassword;
