import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import googlepng from "../../assets/googlepng.png";
import axiosInstance from "../../services/axios";

const Login = () => {
  const navigate = useNavigate();
  const { login, setUser } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

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
        document.getElementById("google-signin-button"),
        { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: 360 }
      );
    }
  }, [googleLoaded]);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post("/users/auth/google", { credential: response.credential }, { headers: { "Content-Type": "application/json" } });
      const data = res.data;
      if (data.status === "Success") {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        setUser(data.user);
        toast.success("Google login successful!");
        navigate("/user/dashboard");
      } else {
        toast.error(data.message || "Google login failed");
      }
    } catch {
      toast.error("Failed to login with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.email || !formData.password) {
        toast.error("Please fill in all fields");
        setLoading(false);
        return;
      }
      const response = await login(formData);
      if (response.token) {
        toast.success("Login successful!");
        if (response.passwordChangeRequired) {
          navigate("/change-password", { state: { mandatory: true } });
        } else {
          navigate("/user/dashboard");
        }
      }
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C4B5A0] via-[#D1C4B0] to-[#B8A993]" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent 40%, rgba(201,168,76,0.08) 50%, transparent 60%)" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" style={{ height: "50%" }} />
        <div className="relative z-10 flex flex-col justify-center px-16 text-[#2C2418]">
          <h1 className="font-heading text-5xl xl:text-6xl font-bold leading-tight mb-6">
            Welcome<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #8B6914, #A0884C)" }}>
              Back
            </span>
          </h1>
          <p className="font-body text-[#5C4A32]/60 text-lg max-w-md leading-relaxed">
            Sign in to manage your donations, track your impact, and continue making a difference.
          </p>
          <div className="mt-12 flex gap-8">
            {[
              { val: "48K+", label: "Lives changed" },
              { val: "120+", label: "Projects" },
              { val: "30+", label: "Countries" },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-heading text-2xl font-bold text-[#8B6914]">{s.val}</div>
                <div className="font-body text-xs text-[#5C4A32]/50 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Back to home */}
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors font-body mb-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to home
          </Link>

          <h2 className="font-heading text-3xl font-bold text-text-dark mb-2">Sign in</h2>
          <p className="font-body text-text-muted text-sm mb-8">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-[#8B6914] font-medium hover:underline">Create one</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-dark font-body mb-1.5">Email</label>
              <input
                type="email"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-text-dark font-body focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-text-dark font-body">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#8B6914] hover:underline font-body">Forgot?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-text-dark font-body focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-xl font-semibold font-body text-[#2C2418] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)",
                boxShadow: "0 2px 12px rgba(201,168,76,0.3)",
              }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="px-3 bg-[#FAF7F2] text-xs text-text-muted font-body">or continue with</span></div>
          </div>

          {/* Google */}
          <div id="google-signin-button" className="flex justify-center" />
          {!googleLoaded && (
            <button
              type="button"
              className="w-full h-12 flex items-center justify-center gap-2 border border-gray-200 rounded-xl hover:bg-white transition-colors font-body text-sm text-text-dark"
              disabled={loading}
              onClick={() => toast.error("Google Sign-In is still loading.")}
            >
              <img src={googlepng} alt="Google" className="w-5 h-5" loading="lazy" />
              Continue with Google
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
