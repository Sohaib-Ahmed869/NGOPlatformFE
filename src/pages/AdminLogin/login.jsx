import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import { toast } from "react-hot-toast";
import { Shield, Eye, EyeOff, ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import OtpInput from "../../components/OtpInput";
import { AuthCanvas, BrandLockup, GlassCard, NudgeIcon, ShimmerButton, GlassField, ACCENT } from "./PlatformAuthChrome";

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

const AdminLogin = () => {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const { branding, tenantMode, platform } = useTenant();
  // Any host that isn't a real NGO tenant (the public marketing site, or the
  // "admin." SuperAdmin console) has no tenant to brand against — it wears the
  // platform's own Donexus identity instead of the generic "Admin Portal" copy
  // this page used to show everywhere (including to platform operators).
  const isPlatform = tenantMode !== "tenant";
  const [formData, setFormData] = useState({ email: "", password: "", code: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);

  const primary = branding?.primaryColor || "#102A23";
  const accent = branding?.accentColor || "#047857";
  const bg = branding?.backgroundColor || "#F3F8F5";
  const brandName = platform?.name || "Donexus";

  const handleSubmit = async (e, codeOverride) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      if (!formData.email || !formData.password) {
        toast.error("Please fill in all fields");
        return;
      }
      const code = codeOverride != null ? codeOverride : formData.code;
      if (mfaRequired && (!code || code.length !== 6)) {
        toast.error("Enter your 6-digit authentication code");
        return;
      }
      const response = await loginAdmin({ ...formData, code });
      if (response.mfaRequired) {
        setMfaRequired(true);
        toast("Enter the 6-digit code from your authenticator app");
        return;
      }
      if (response.token) {
        toast.success("Login successful!");
        navigate(isPlatform ? "/dashboard" : "/admin/dashboard");
      }
    } catch (error) {
      toast.error(error.message || "Invalid admin credentials");
      if (mfaRequired) setFormData((f) => ({ ...f, code: "" }));
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Tenant NGO admin (mytenant.localhost/admin/login) — untouched, still the
  // tenant-branded split layout. Kept as an early return rather than threaded
  // through the platform branch below, since the two no longer share a
  // structure worth reusing.
  // ─────────────────────────────────────────────────────────────────────────
  if (!isPlatform) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: bg }}>
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: `linear-gradient(165deg, ${primary} 0%, ${darken(primary, 0.15)} 50%, ${darken(primary, 0.25)} 100%)` }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 30% 30%, ${accent}18 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 70% 70%, ${accent}0D 0%, transparent 55%)` }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, transparent 40%, ${accent}0F 49%, ${accent}1A 50%, ${accent}0F 51%, transparent 60%)` }} />
          <div className="relative z-10 flex flex-col justify-center px-16 text-white">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8" style={{ backgroundColor: `${accent}25` }}>
              <Shield className="w-8 h-8" style={{ color: accent }} />
            </div>
            <h1 className="font-heading text-5xl xl:text-6xl font-bold leading-tight mb-6">
              Admin<br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${accent}, ${lighten(accent, 0.3)}, ${accent})` }}>
                Portal
              </span>
            </h1>
            <p className="font-body text-white/50 text-lg max-w-md leading-relaxed">
              Secure access to manage donations, events, subscribers, and platform operations.
            </p>
            <div className="mt-12 flex items-center gap-3 text-white/30 text-sm font-body">
              <Lock className="w-4 h-4" />
              <span>256-bit encrypted connection</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors font-body mb-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to home
            </Link>
            <div className="lg:hidden w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: `${accent}15` }}>
              <Shield className="w-6 h-6" style={{ color: accent }} />
            </div>

            <h2 className="font-heading text-3xl font-bold text-primary mb-2">Admin Sign In</h2>
            <p className="font-body text-text-muted text-sm mb-8">
              Authorised personnel only.{" "}<Link to="/login" className="font-medium hover:underline" style={{ color: accent }}>User login</Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-primary font-body mb-1.5">Admin Email</label>
                <input
                  type="email"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-primary font-body outline-none transition-all"
                  onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}20`; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.org"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary font-body mb-1.5">Password</label>
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

              {mfaRequired && (
                <div>
                  <label className="block text-sm font-medium text-primary font-body mb-2">Authentication Code</label>
                  <OtpInput
                    value={formData.code}
                    onChange={(v) => setFormData((f) => ({ ...f, code: v }))}
                    disabled={loading}
                    autoFocus
                    accent={accent}
                    onComplete={(c) => handleSubmit(null, c)}
                  />
                  <p className="mt-2 text-xs text-text-muted font-body">Enter the current 6-digit code from your authenticator app.</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold font-body text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(180deg, ${lighten(accent, 0.1)}, ${accent})`, boxShadow: `0 2px 12px ${accent}40` }}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span>{mfaRequired ? "Verifying..." : "Authenticating..."}</span></>
                ) : (
                  <><span>{mfaRequired ? "Verify & Sign In" : "Sign in to Admin Panel"}</span><ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-text-muted font-body">
              This is a restricted area. Unauthorised access attempts are logged.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SuperAdmin console (admin.localhost/login) — flat ground, one centred
  // panel. Deliberately NOT the split-panel pattern above: this is the
  // platform's own front door, not a tenant's, so it gets its own visual
  // language rather than a re-skinned copy of theirs. Sign-in is a form you
  // are in for eight seconds; it earns no scenery.
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen" data-admin-theme="light">
      <AuthCanvas />

      <div className="relative z-10 px-6 pt-8 sm:px-10 lg:px-14 lg:pt-10">
        <BrandLockup name={brandName} />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <h1 className="text-[28px] font-semibold leading-[1.16] tracking-[-0.02em] text-white">
              Sign in to {brandName}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-white/45">
              Sign in to manage every tenant, subscription and support conversation from one console.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.2, 0.7, 0.2, 1] }}
            className="mt-8"
          >
            <GlassCard>
              <form onSubmit={handleSubmit} className="space-y-4">
                <GlassField
                  label="Email"
                  icon={Mail}
                  accent={ACCENT}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  disabled={loading}
                />

                <GlassField
                  label="Password"
                  icon={Lock}
                  accent={ACCENT}
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                  trailing={
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
                <div className="-mt-2 text-right">
                  <Link to="/forgot-password" className="text-xs font-medium text-white/40 hover:text-white/70">Forgot password?</Link>
                </div>

                <AnimatePresence>
                  {mfaRequired && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">Authentication code</label>
                      <OtpInput
                        value={formData.code}
                        onChange={(v) => setFormData((f) => ({ ...f, code: v }))}
                        disabled={loading}
                        autoFocus
                        accent={ACCENT}
                        variant="glass"
                        onComplete={(c) => handleSubmit(null, c)}
                      />
                      <p className="mt-2 text-xs text-white/35">Enter the current 6-digit code from your authenticator app.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <ShimmerButton
                  type="submit"
                  accent={ACCENT}
                  disabled={loading}
                  className="mt-2 h-11 w-full rounded-lg text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /><span>{mfaRequired ? "Verifying…" : "Authenticating…"}</span></>
                  ) : (
                    <><span>{mfaRequired ? "Verify & sign in" : "Sign in to console"}</span><NudgeIcon><ArrowRight size={18} /></NudgeIcon></>
                  )}
                </ShimmerButton>
              </form>
            </GlassCard>
          </motion.div>

          <p className="mt-6 text-center text-xs text-white/25">
            Platform operators only · unauthorised access attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
