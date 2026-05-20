import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import { EyeIcon, EyeOffIcon, ArrowRight, Heart } from "lucide-react";
import toast from "react-hot-toast";
import googlepng from "../../assets/googlepng.png";
import axiosInstance from "../../services/axios";
import { getStoragePrefix } from "../../services/axios";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import Select from "react-select";
import countryList from "react-select-country-list";
import "./signup.css";

function darken(hex, ratio) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - ratio)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - ratio)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - ratio)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
function lighten(hex, ratio) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * ratio));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * ratio));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * ratio));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const SignUp = () => {
  const navigate = useNavigate();
  const { register, setUser } = useAuth();
  const { branding, organisation } = useTenant();
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", password: "", phone: "", country: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [phoneValid, setPhoneValid] = useState(true);

  const primary = branding?.primaryColor || "#2C2418";
  const accent = branding?.accentColor || "#C9A84C";
  const bg = branding?.backgroundColor || "#FAF7F2";
  const accentDark = darken(accent, 0.3);
  const bgDark = darken(bg, 0.08);
  const bgMid = darken(bg, 0.04);

  const countryOptions = countryList().getData();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleLoaded(true);
    document.body.appendChild(script);
    return () => {
      const s = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (s) s.remove();
    };
  }, []);

  useEffect(() => {
    if (googleLoaded && window.google) {
      window.google.accounts.id.initialize({
        client_id: "661189608609-9kagua1m0fipkj0duoslogob4csm1slr.apps.googleusercontent.com",
        callback: handleGoogleResponse,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signup-button"),
        { type: "standard", theme: "outline", size: "large", text: "signup_with", shape: "rectangular", width: 360 }
      );
    }
  }, [googleLoaded]);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    try {
      const prefix = getStoragePrefix();
      const res = await axiosInstance.post("/users/auth/google", { credential: response.credential }, { headers: { "Content-Type": "application/json" } });
      const data = res.data;
      if (data.status === "Success") {
        localStorage.setItem(prefix + "user", JSON.stringify(data.user));
        localStorage.setItem(prefix + "token", data.token);
        setUser(data.user);
        toast.success("Google signup successful!");
        navigate("/");
      }
    } catch {
      toast.error("Failed to signup with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      setLoading(false);
      return;
    }
    if (!phoneValid) {
      toast.error("Please enter a valid phone number");
      setLoading(false);
      return;
    }
    if (!formData.country) {
      toast.error("Please select your country");
      setLoading(false);
      return;
    }
    try {
      await register(formData);
      navigate("/login");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (value) => {
    setFormData((prev) => ({ ...prev, phone: value }));
    setPhoneValid(value.replace(/[^0-9]/g, "").length >= 8);
  };

  const focusStyle = (e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}20`; };
  const blurStyle = (e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: bg }}>
      {/* Left panel — themed gradient */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(165deg, ${bgDark} 0%, ${bgMid} 35%, ${bgDark} 65%, ${darken(bg, 0.12)} 100%)` }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, transparent 40%, ${accent}0F 49%, ${accent}1A 50%, ${accent}0F 51%, transparent 60%)` }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 50%)" }} />

        <div className="relative z-10 flex flex-col justify-center px-16" style={{ color: primary }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8" style={{ backgroundColor: `${accent}20` }}>
            <Heart className="w-7 h-7" style={{ color: accent }} />
          </div>
          <h1 className="font-heading text-4xl xl:text-5xl font-bold leading-tight mb-5">
            Join the<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${accentDark}, ${accent})` }}>
              Community
            </span>
          </h1>
          <p className="font-body text-lg max-w-sm leading-relaxed" style={{ color: `${primary}80` }}>
            Create your account to start donating, track your impact, and be part of something meaningful.
          </p>
          <div className="mt-10 flex gap-8">
            {[
              { val: "48K+", label: "Donors" },
              { val: "$2.4M+", label: "Raised" },
              { val: "30+", label: "Countries" },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-heading text-xl font-bold" style={{ color: accentDark }}>{s.val}</div>
                <div className="font-body text-[10px] uppercase tracking-wider" style={{ color: `${primary}50` }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors font-body mb-8">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to home
          </Link>

          <h2 className="font-heading text-3xl font-bold text-primary mb-2">Create Account</h2>
          <p className="font-body text-text-muted text-sm mb-7">
            Already have an account?{" "}
            <Link to="/login" className="font-medium hover:underline" style={{ color: accent }}>Sign in</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary font-body mb-1.5">First Name</label>
                <input type="text" className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-primary font-body outline-none transition-all text-sm" onFocus={focusStyle} onBlur={blurStyle} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="John" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary font-body mb-1.5">Last Name</label>
                <input type="text" className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-primary font-body outline-none transition-all text-sm" onFocus={focusStyle} onBlur={blurStyle} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Doe" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary font-body mb-1.5">Email Address</label>
              <input type="email" className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-primary font-body outline-none transition-all text-sm" onFocus={focusStyle} onBlur={blurStyle} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@example.com" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary font-body mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} className="w-full h-11 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-primary font-body outline-none transition-all text-sm" onFocus={focusStyle} onBlur={blurStyle} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="At least 8 characters" required minLength={8} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary font-body mb-1.5">Phone Number</label>
                <PhoneInput country={"au"} value={formData.phone} onChange={handlePhoneChange} inputClass="phone-input-themed" containerClass="phone-input" buttonClass="phone-button" dropdownClass="phone-dropdown" required />
                {!phoneValid && formData.phone && <p className="text-xs text-red-500 mt-1">Invalid phone number</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-primary font-body mb-1.5">Country</label>
                <Select options={countryOptions} onChange={(opt) => setFormData((prev) => ({ ...prev, country: opt.value }))} className="country-select" classNamePrefix="country-select" placeholder="Select..." required />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold font-body text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 mt-2"
              style={{ background: `linear-gradient(180deg, ${lighten(accent, 0.1)}, ${accent})`, boxShadow: `0 2px 12px ${accent}40` }}
            >
              {loading ? "Creating account..." : "Create Account"}
              {!loading && <ArrowRight size={18} />}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="px-3 text-xs text-text-muted font-body" style={{ backgroundColor: bg }}>or continue with</span></div>
            </div>

            <div id="google-signup-button" className="flex justify-center" />
            {!googleLoaded && (
              <button type="button" className="w-full h-11 flex items-center justify-center gap-2 border border-gray-200 rounded-xl hover:bg-white transition-colors font-body text-sm text-primary" disabled={loading} onClick={() => toast.error("Google Sign-In is still loading.")}>
                <img src={googlepng} alt="Google" className="w-5 h-5" loading="lazy" />
                Sign up with Google
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
