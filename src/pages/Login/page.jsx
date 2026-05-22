import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import googlepng from "../../assets/googlepng.png";
import axiosInstance from "../../services/axios";
import { getStoragePrefix } from "../../services/axios";

const Login = () => {
  const navigate = useNavigate();
  const { login, setUser } = useAuth();
  const { branding, tenantMode } = useTenant();
  const isSaaS = tenantMode === "public" || tenantMode === "superadmin";
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  const primary = branding?.primaryColor || "#102A23";
  const accent = branding?.accentColor || "#047857";
  const bg = branding?.backgroundColor || "#F3F8F5";
  const accentDark = darken(accent, 0.3);
  const bgDark = darken(bg, 0.08);
  const bgMid = darken(bg, 0.04);

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
      const prefix = getStoragePrefix();
      const res = await axiosInstance.post("/users/auth/google", { credential: response.credential }, { headers: { "Content-Type": "application/json" } });
      const data = res.data;
      if (data.status === "Success") {
        localStorage.setItem(prefix + "user", JSON.stringify(data.user));
        localStorage.setItem(prefix + "token", data.token);
        setUser(data.user);
        toast.success("Login successful!");
        if (data.user.role === "admin") {
          navigate("/admin/dashboard");
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
        navigate("/user/dashboard");
      }
    } catch (error) {
      toast.error(error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex ${isSaaS ? "saas-page" : ""}`} style={{ backgroundColor: bg, ...(isSaaS ? { fontFamily: "'Outfit', system-ui, sans-serif" } : {}) }}>
      {isSaaS && (
        <>
          <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(15,23,42,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)" }} />
          <style>{`.saas-page h1,.saas-page h2,.saas-page h3{font-family:'Outfit',system-ui,sans-serif!important}`}</style>
        </>
      )}
      {/* Left panel — themed gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(165deg, ${bgDark} 0%, ${bgMid} 35%, ${bgDark} 65%, ${darken(bg, 0.12)} 100%)` }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, transparent 40%, ${accent}0F 49%, ${accent}1A 50%, ${accent}0F 51%, transparent 60%)` }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 50%)" }} />

        <div className="relative z-10 flex flex-col justify-center px-16" style={{ color: primary }}>
          <h1 className="font-heading text-5xl xl:text-6xl font-bold leading-tight mb-6">
            Welcome<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${accentDark}, ${accent})` }}>
              Back
            </span>
          </h1>
          <p className="font-body text-lg max-w-md leading-relaxed" style={{ color: `${primary}90` }}>
            Sign in to manage your donations, track your impact, and continue making a difference.
          </p>
          <div className="mt-12 flex gap-8">
            {[
              { val: "48K+", label: "Lives changed" },
              { val: "120+", label: "Projects" },
              { val: "30+", label: "Countries" },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-heading text-2xl font-bold" style={{ color: accentDark }}>{s.val}</div>
                <div className="font-body text-xs uppercase tracking-wider" style={{ color: `${primary}60` }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors font-body mb-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to home
          </Link>

          <h2 className="font-heading text-3xl font-bold text-primary mb-2">Sign in</h2>
          <p className="font-body text-text-muted text-sm mb-8">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-medium hover:underline" style={{ color: accent }}>Create one</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-primary font-body mb-1.5">Email</label>
              <input
                type="email"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-primary font-body outline-none transition-all"
                style={{ "--tw-ring-color": `${accent}33` }}
                onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}20`; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-primary font-body">Password</label>
                <Link to="/forgot-password" className="text-xs hover:underline font-body" style={{ color: accent }}>Forgot?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-primary font-body outline-none transition-all"
                  onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}20`; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-xl font-semibold font-body text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
              style={{ background: `linear-gradient(180deg, ${lighten(accent, 0.1)}, ${accent})`, boxShadow: `0 2px 12px ${accent}40` }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="px-3 text-xs text-text-muted font-body" style={{ backgroundColor: bg }}>or continue with</span></div>
          </div>

          <div id="google-signin-button" className="flex justify-center" />
          {!googleLoaded && (
            <button type="button" className="w-full h-12 flex items-center justify-center gap-2 border border-gray-200 rounded-xl hover:bg-white transition-colors font-body text-sm text-primary" disabled={loading} onClick={() => toast.error("Google Sign-In is still loading.")}>
              <img src={googlepng} alt="Google" className="w-5 h-5" loading="lazy" />
              Continue with Google
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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

export default Login;
