import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import toast from "react-hot-toast";
import googlepng from "../../assets/googlepng.png";
import axiosInstance from "../../services/axios";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import Select from "react-select";
import countryList from "react-select-country-list";
import "./signup.css";

const SignUp = () => {
  const navigate = useNavigate();
  const { register, setUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    country: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [phoneValid, setPhoneValid] = useState(true);

  // Get countries for dropdown
  const countryOptions = countryList().getData();

  // Initialize Google Sign-In
  useEffect(() => {
    // Load the Google Sign-In API script
    const loadGoogleScript = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleLoaded(true);
      document.body.appendChild(script);
    };

    loadGoogleScript();

    return () => {
      // Cleanup function
      const googleScript = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (googleScript) {
        googleScript.remove();
      }
    };
  }, []);

  // Initialize Google Sign-In button when script is loaded
  useEffect(() => {
    if (googleLoaded && window.google) {
      window.google.accounts.id.initialize({
        client_id:
          "661189608609-9kagua1m0fipkj0duoslogob4csm1slr.apps.googleusercontent.com",
        callback: handleGoogleResponse,
        auto_select: false,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("google-signup-button"),
        {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signup_with",
          shape: "rectangular",
          width: 360,
        }
      );
    }
  }, [googleLoaded]);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    try {
      // Make API request to your backend
      const res = await axiosInstance.post(
        "/users/auth/google",
        { credential: response.credential },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // axios automatically parses JSON
      const data = res.data;

      if (data.status === "Success") {
        // Store user data and token
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);

        // Update auth context using the setUser from useAuth() at the component level
        setUser(data.user);

        toast.success("Google signup successful!");
        navigate("/");
      } else {
        toast.error(data.message || "Google signup failed");
      }
    } catch (error) {
      console.error("Google signup error:", error);
      toast.error("Failed to signup with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Form validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      toast.error("Please enter a valid email address");
      setLoading(false);
      return;
    }

    if (!phoneValid) {
      setError("Please enter a valid phone number");
      toast.error("Please enter a valid phone number");
      setLoading(false);
      return;
    }

    if (!formData.country) {
      setError("Please select your country");
      toast.error("Please select your country");
      setLoading(false);
      return;
    }

    try {
      // Send form data directly with firstName and lastName intact
      // The backend expects these fields based on the controller code
      await register(formData);

      navigate("/login");
    } catch (err) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle phone number change
  const handlePhoneChange = (value, data) => {
    setFormData((prev) => ({ ...prev, phone: value }));
    // Basic validation - must be at least 8 digits (not including country code)
    const phoneNumber = value.replace(/[^0-9]/g, "");
    setPhoneValid(phoneNumber.length >= 8);
  };

  // Handle country selection change
  const handleCountryChange = (selectedOption) => {
    setFormData((prev) => ({ ...prev, country: selectedOption.value }));
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Back to home */}
        <a href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#8B6914] transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to home
        </a>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Gold accent header */}
          <div className="h-2 bg-gradient-to-r from-[#C9A84C] to-[#D4B85A]"></div>

          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">
              Create Account
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Join our community today
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <PhoneInput
                    country={"au"}
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    inputClass="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                    containerClass="phone-input"
                    buttonClass="phone-button"
                    dropdownClass="phone-dropdown"
                    required
                  />

                  {!phoneValid && formData.phone && (
                    <p className="text-xs text-red-600 mt-1">
                      Please enter a valid phone number
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Country
                  </label>
                  <Select
                    options={countryOptions}
                    onChange={handleCountryChange}
                    className="country-select"
                    classNamePrefix="country-select"
                    placeholder="Select your country"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-[#2C2418] font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                style={{
                  background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)",
                  boxShadow: "0 2px 12px rgba(201,168,76,0.3)",
                }}
              >
                {loading ? "Signing up..." : "Sign Up"}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign-In Button Container */}
              <div
                id="google-signup-button"
                className="flex justify-center"
              ></div>

              {/* Fallback button in case the Google button doesn't load */}
              {!googleLoaded && (
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors duration-200 border border-gray-200"
                  disabled={loading}
                  onClick={() =>
                    toast.error("Google Sign-In is still loading. Please wait.")
                  }
                >
                  <img src={googlepng} alt="Google" className="w-12 h-5"   loading="lazy"/>
                  Sign up with Google
                </button>
              )}

              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="text-[#8B6914] hover:underline font-medium"
                >
                  Sign in
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;