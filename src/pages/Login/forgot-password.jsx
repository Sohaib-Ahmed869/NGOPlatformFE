// ForgotPassword.js
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import axiosInstance from "../../services/axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email) {
        toast.error("Please enter your email address");
        return;
      }

      const response = await axiosInstance.post("/users/forgot-password", {
        email,
      });

      if (response.data.status === "Success") {
        toast.success("Password reset link sent to your email!");
        setEmail("");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reset link");
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
          <h2 className="text-3xl font-bold text-center">Forgot Password</h2>
          <p className="text-center text-gray-600">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                className="w-full rounded-xl p-2 border border-gray-300 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fullname@email.com"
                disabled={loading}
              />
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
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="text-center">
              <a
                href="/login"
                className="text-sm text-[#8B6914] hover:underline"
              >
                Back to Login
              </a>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ForgotPassword;