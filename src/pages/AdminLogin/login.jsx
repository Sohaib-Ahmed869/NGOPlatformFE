import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import { Shield, Eye, EyeOff, ArrowRight, Loader2, Lock } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.email || !formData.password) {
        toast.error("Please fill in all fields");
        return;
      }
      const response = await loginAdmin(formData);
      if (response.token) {
        toast.success("Admin login successful!");
        navigate("/admin/dashboard");
      }
    } catch (error) {
      toast.error(error.message || "Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(165deg, #4A3F30 0%, #3D3226 50%, #2C2418 100%)" }}
        />
        {/* Subtle golden aurora */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              "radial-gradient(ellipse 70% 50% at 30% 30%, rgba(201,168,76,0.1) 0%, transparent 60%)",
              "radial-gradient(ellipse 50% 40% at 70% 70%, rgba(201,168,76,0.06) 0%, transparent 55%)",
            ].join(", "),
          }}
        />
        {/* Diagonal line */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, transparent 40%, rgba(201,168,76,0.06) 49%, rgba(201,168,76,0.1) 50%, rgba(201,168,76,0.06) 51%, transparent 60%)" }}
        />

        <div className="relative z-10 flex flex-col justify-center px-16 text-[#F5EDE0]">
          <div className="w-16 h-16 rounded-2xl bg-[#C9A84C]/15 flex items-center justify-center mb-8">
            <Shield className="w-8 h-8 text-[#C9A84C]" />
          </div>
          <h1 className="font-heading text-5xl xl:text-6xl font-bold leading-tight mb-6">
            Admin<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #C9A84C, #E8D5A0, #C9A84C)" }}>
              Portal
            </span>
          </h1>
          <p className="font-body text-[#F5EDE0]/50 text-lg max-w-md leading-relaxed">
            Secure access to manage donations, events, subscribers, and platform operations.
          </p>

          <div className="mt-12 flex items-center gap-3 text-[#F5EDE0]/30 text-sm font-body">
            <Lock className="w-4 h-4" />
            <span>256-bit encrypted connection</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Back link */}
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors font-body mb-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to home
          </Link>

          {/* Mobile shield icon */}
          <div className="lg:hidden w-12 h-12 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center mb-6">
            <Shield className="w-6 h-6 text-[#C9A84C]" />
          </div>

          <h2 className="font-heading text-3xl font-bold text-text-dark mb-2">Admin Sign In</h2>
          <p className="font-body text-text-muted text-sm mb-8">
            Authorised personnel only.{" "}
            <Link to="/login" className="text-[#8B6914] font-medium hover:underline">User login</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-dark font-body mb-1.5">Admin Email</label>
              <input
                type="email"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-text-dark font-body focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@hopegive.org"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark font-body mb-1.5">Password</label>
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
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign in to Admin Panel</span>
                  <ArrowRight size={18} />
                </>
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
};

export default AdminLogin;
