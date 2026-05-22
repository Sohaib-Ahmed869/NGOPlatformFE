import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Building2, User, FileCheck, Palette,
  ArrowRight, ArrowLeft, Loader2, SkipForward, ArrowUpRight,
  Sparkles, Shield, Zap, Globe, Users,
} from "lucide-react";
import tenantService from "../../services/tenant.service";
import themeCategories, { getThemeById } from "../../config/themePresets";
import ThemePreview from "./ThemePreview";

const STEPS = [
  { label: "Organisation", icon: Building2 },
  { label: "Theme", icon: Palette },
  { label: "Account", icon: User },
  { label: "Review", icon: FileCheck },
];

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.06 } }),
};

export default function RegistrationFlow() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [slugStatus, setSlugStatus] = useState(null);
  const [activeCat, setActiveCat] = useState("warm");

  const [form, setForm] = useState({
    orgName: "", slug: "", revenueRange: "0-500",
    plan: searchParams.get("plan") || "basic",
    billingCycle: searchParams.get("billing") || "monthly",
    adminName: "", adminEmail: "", adminPassword: "", confirmPassword: "",
    theme: "default",
  });

  const theme = getThemeById(form.theme);
  const up = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // ── Slug ──
  const onOrgName = (v) => {
    const s = v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setForm((p) => ({ ...p, orgName: v, slug: s }));
  };
  useEffect(() => {
    if (!form.slug || form.slug.length < 3) { setSlugStatus(null); return; }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try { const r = await tenantService.checkSlug(form.slug); setSlugStatus(r.data.available ? "ok" : "taken"); }
      catch { setSlugStatus(null); }
    }, 300);
    return () => clearTimeout(t);
  }, [form.slug]);

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.orgName.trim()) e.orgName = "Required";
      if (!form.slug.trim()) e.slug = "Required";
      if (slugStatus === "taken") e.slug = "Already taken";
      if (form.slug.length < 3) e.slug = "Min 3 characters";
    }
    if (step === 2) {
      if (!form.adminName.trim()) e.adminName = "Required";
      if (!form.adminEmail.trim()) e.adminEmail = "Required";
      if (!/\S+@\S+\.\S+/.test(form.adminEmail)) e.adminEmail = "Invalid";
      if (form.adminPassword.length < 6) e.adminPassword = "Min 6 characters";
      if (form.adminPassword !== form.confirmPassword) e.confirmPassword = "Mismatch";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => { if (validate()) { setDir(1); setStep((s) => s + 1); } };
  const prev = () => { setDir(-1); setStep((s) => s - 1); };

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await tenantService.register({
        orgName: form.orgName, slug: form.slug, adminName: form.adminName,
        adminEmail: form.adminEmail, adminPassword: form.adminPassword,
        plan: form.plan, billingCycle: form.billingCycle,
        revenueRange: form.revenueRange, theme: form.theme,
      });
      window.location.href = r.data.checkoutUrl;
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || "Registration failed." });
      setSubmitting(false);
    }
  };

  const inp = "w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm text-[#102A23] placeholder-gray-400 focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]/40 outline-none transition-all";

  return (
    <div className="saas-page min-h-screen flex bg-[#F3F8F5] relative" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      {/* Ambient grid */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(15,23,42,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)" }} />
      {/* Font override for headings */}
      <style>{`.saas-page h1,.saas-page h2,.saas-page h3,.saas-page h4,.saas-page h5,.saas-page h6{font-family:'Outfit',system-ui,sans-serif!important}`}</style>

      {/* ═══ LEFT RAIL — vertical stepper ═══ */}
 {}     <div className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-[#E0DAF0] bg-gradient-to-b from-[#F3F8F5] to-[#E7F2EC] px-6 py-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-12 group">
          <div className="w-9 h-9 bg-gradient-to-br from-[#065F46] to-[#047857] rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          <span className="text-[#102A23] font-medium font-bold text-lg">NGO Platform</span>
        </Link>

        {/* Steps */}
        <nav className="flex-1 space-y-1">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.label} className="flex items-start gap-3">
                {/* Line + dot */}
                <div className="flex flex-col items-center">
                  <motion.div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                      done ? "bg-green-500 text-white shadow-md shadow-green-500/20"
                      : active ? "bg-[#047857] text-white shadow-lg shadow-[#047857]/30"
                      : "bg-white/60 text-[#8AA89C] border border-[#DDD6EE]"
                    }`}
                    animate={active ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {done ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                  </motion.div>
                  {i < STEPS.length - 1 && (
                    <div className="w-[2px] h-8 my-1 rounded-full overflow-hidden bg-[#DDD6EE]">
                      <motion.div className="w-full bg-[#047857]" initial={{ height: 0 }} animate={{ height: done ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <p className={`text-sm font-semibold ${active ? "text-[#102A23]" : done ? "text-[#102A23]" : "text-[#8AA89C]"}`}>{s.label}</p>
                  {active && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-[#8AA89C] mt-0.5">
                      {i === 0 ? "Basic details" : i === 1 ? "Pick your style" : i === 2 ? "Admin credentials" : "Confirm & pay"}
                    </motion.p>
                  )}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="pt-6 border-t border-[#DDD6EE] space-y-2">
          <Link to="/plans" className="text-xs text-[#8AA89C] hover:text-[#102A23] flex items-center gap-1 transition-colors">
            View pricing <ArrowUpRight className="w-3 h-3" />
          </Link>
          <div className="flex items-center gap-4 text-[10px] text-[#8AA89C]">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-green-500" />Secure</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" />Fast setup</span>
          </div>
        </div>
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-[#DDD6EE]">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#065F46] to-[#047857] rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span className="font-medium font-bold text-[#102A23]">NGO Platform</span>
          </Link>
          {/* Mobile step pills */}
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= step ? "bg-[#047857]" : "bg-[#DDD6EE]"}`} />
            ))}
          </div>
        </div>

        <div className="min-h-[calc(100vh-60px)] lg:min-h-screen flex flex-col">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir > 0 ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir > 0 ? -60 : 60 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex-1 flex flex-col"
            >

              {/* ═══════════════════════════════════════════════
                  STEP 0: Organisation — split layout
              ═══════════════════════════════════════════════ */}
              {step === 0 && (
                <div className="flex-1 flex flex-col lg:flex-row">
                  {/* Left: Floating UI cards showcase */}
                  <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden items-center justify-center" style={{ background: "linear-gradient(165deg, #E7F2EC 0%, #E8E0F4 50%, #E8E0F4 100%)" }}>
                    {/* Gloss overlay */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 40%, transparent 70%)" }} />
                    {/* Radial glow */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 45%, rgba(4,120,87,0.08) 0%, transparent 60%)" }} />

                    {/* Floating orbs */}
                    <motion.div className="absolute rounded-full pointer-events-none" style={{ top: "8%", right: "5%", width: 250, height: 250, background: "radial-gradient(circle, rgba(4,120,87,0.1) 0%, transparent 60%)" }} animate={{ x: [0, 15, 0], y: [0, -10, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
                    <motion.div className="absolute rounded-full pointer-events-none" style={{ bottom: "10%", left: "0%", width: 200, height: 200, background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)" }} animate={{ x: [0, -10, 0], y: [0, 12, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />

                    <div className="relative z-10 w-full max-w-lg px-8 py-10">
                      {/* Headline */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(4,120,87,0.2)", backdropFilter: "blur(8px)" }}>
                          <Sparkles className="w-3 h-3 text-[#047857]" />
                          <span className="text-[10px] text-[#065F46] font-bold tracking-[0.15em] uppercase">Your future platform</span>
                        </div>
                        <h3 className="text-xl font-medium font-bold text-[#102A23]">Everything you need, in one place</h3>
                      </motion.div>

                      {/* ── Floating cards composition ── */}
                      <div className="relative" style={{ height: 380 }}>

                        {/* Card 1: Stats — top-left */}
                        <motion.div
                          className="absolute top-0 left-0 w-[200px]"
                          initial={{ opacity: 0, y: 30, rotate: -2 }}
                          animate={{ opacity: 1, y: 0, rotate: -2 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                        >
                          <div className="bg-white rounded-2xl p-4 shadow-xl shadow-black/[0.06] border border-white/60" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)", backdropFilter: "blur(12px)" }}>
                            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%)" }} />
                            <p className="text-[9px] text-[#8AA89C] font-semibold uppercase tracking-wider mb-2 relative">Total Raised</p>
                            <p className="text-2xl font-bold text-[#102A23] mb-1 relative">$52,480</p>
                            <div className="flex items-center gap-1 relative">
                              <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded-full">+23%</span>
                              <span className="text-[9px] text-[#8AA89C]">this month</span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Card 2: Donors — top-right, overlapping */}
                        <motion.div
                          className="absolute top-4 right-0 w-[170px]"
                          initial={{ opacity: 0, y: 30, rotate: 3 }}
                          animate={{ opacity: 1, y: 0, rotate: 3 }}
                          transition={{ delay: 0.45, duration: 0.5 }}
                        >
                          <div className="bg-[#102A23] rounded-2xl p-4 shadow-xl shadow-black/[0.1]">
                            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)" }} />
                            <div className="flex items-center gap-2 mb-2 relative">
                              <div className="w-7 h-7 bg-[#047857] rounded-lg flex items-center justify-center">
                                <Users className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="text-[9px] text-white/50 font-semibold uppercase tracking-wider">Donors</span>
                            </div>
                            <p className="text-xl font-bold text-white mb-0.5 relative">1,247</p>
                            <p className="text-[9px] text-white/40 relative">Active this quarter</p>
                          </div>
                        </motion.div>

                        {/* Card 3: Campaign progress — middle */}
                        <motion.div
                          className="absolute top-[130px] left-[30px] right-[20px]"
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6, duration: 0.5 }}
                        >
                          <div className="bg-white rounded-2xl p-4 shadow-xl shadow-black/[0.06] border border-white/60" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)", backdropFilter: "blur(12px)" }}>
                            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%)" }} />
                            <div className="flex items-center justify-between mb-3 relative">
                              <p className="text-[10px] font-bold text-[#102A23]">Clean Water Initiative</p>
                              <span className="text-[9px] text-[#047857] font-bold">78%</span>
                            </div>
                            <div className="h-2 bg-[#EDE8F5] rounded-full overflow-hidden mb-2 relative">
                              <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #065F46, #047857)" }} initial={{ width: 0 }} animate={{ width: "78%" }} transition={{ delay: 0.9, duration: 1, ease: "easeOut" }} />
                            </div>
                            <div className="flex justify-between text-[9px] text-[#8AA89C] relative">
                              <span>$39,000 raised</span>
                              <span>$50,000 goal</span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Card 4: Earnings pill — bottom-left */}
                        <motion.div
                          className="absolute bottom-[40px] left-0 w-[180px]"
                          initial={{ opacity: 0, y: 30, rotate: -1 }}
                          animate={{ opacity: 1, y: 0, rotate: -1 }}
                          transition={{ delay: 0.75, duration: 0.5 }}
                        >
                          <div className="bg-white rounded-2xl p-4 shadow-xl shadow-black/[0.06] border border-white/60" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)", backdropFilter: "blur(12px)" }}>
                            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%)" }} />
                            <p className="text-[9px] text-[#8AA89C] font-semibold uppercase tracking-wider mb-1 relative">Monthly Recurring</p>
                            <p className="text-lg font-bold text-[#102A23] relative">$8,340</p>
                            <div className="flex items-end gap-[2px] h-6 mt-2 relative">
                              {[30, 45, 35, 55, 48, 62, 50, 70, 58, 75, 68, 82].map((h, i) => (
                                <motion.div key={i} className="flex-1 rounded-t" style={{ backgroundColor: i >= 10 ? "#047857" : "#E8E0F4" }} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 1 + i * 0.04, duration: 0.3 }} />
                              ))}
                            </div>
                          </div>
                        </motion.div>

                        {/* Card 5: Receipt badge — bottom-right */}
                        <motion.div
                          className="absolute bottom-[20px] right-[10px] w-[150px]"
                          initial={{ opacity: 0, y: 20, rotate: 2 }}
                          animate={{ opacity: 1, y: 0, rotate: 2 }}
                          transition={{ delay: 0.9, duration: 0.5 }}
                        >
                          <div className="bg-gradient-to-br from-[#047857] to-[#065F46] rounded-2xl p-4 shadow-xl shadow-[#047857]/20">
                            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)" }} />
                            <div className="flex items-center gap-2 mb-2 relative">
                              <Shield className="w-4 h-4 text-white" />
                              <span className="text-[9px] text-white/80 font-semibold uppercase tracking-wider">Secure</span>
                            </div>
                            <p className="text-white text-[11px] font-semibold leading-tight relative">Stripe-powered payments & auto receipts</p>
                          </div>
                        </motion.div>

                        {/* Decorative connector arrows */}
                        <motion.svg className="absolute top-[95px] left-[85px] w-16 h-10 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ delay: 1.1 }}>
                          <path d="M5 5 Q 30 5, 55 35" stroke="#8AA89C" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
                        </motion.svg>
                      </div>

                      {/* Bottom tagline */}
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="text-center text-[11px] text-[#8AA89C] mt-4">
                        Donation processing &middot; Campaign tracking &middot; Donor CRM
                      </motion.p>
                    </div>
                  </div>

                  {/* Right: Form */}
                  <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
                    <div className="w-full max-w-lg">
                      <motion.div {...fade} className="mb-8">
                        <h2 className="text-2xl sm:text-3xl font-medium font-bold text-[#102A23] mb-2">Tell us about your organisation</h2>
                        <p className="text-sm text-[#8AA89C]">We'll use this to create your portal</p>
                      </motion.div>

                      <motion.div {...fade} custom={1} className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-[#102A23] mb-2">Organisation Name</label>
                          <input type="text" value={form.orgName} onChange={(e) => onOrgName(e.target.value)} className={inp} placeholder="Hope Give Foundation" />
                          {errors.orgName && <p className="text-red-500 text-xs mt-1.5">{errors.orgName}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-[#102A23] mb-2">Portal Subdomain</label>
                          <div className="flex">
                            <input type="text" value={form.slug} onChange={(e) => up("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="flex-1 px-5 py-3.5 bg-white border border-gray-200 rounded-l-2xl text-sm text-[#102A23] placeholder-gray-400 focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]/40 outline-none transition-all" placeholder="hopegivefoundation" />
                            <span className="px-4 py-3.5 bg-gray-50 border border-l-0 border-gray-200 rounded-r-2xl text-xs text-[#8AA89C] font-mono">.charities.ltd</span>
                          </div>
                          <div className="h-5 mt-1">
                            {slugStatus === "checking" && <p className="text-[#8AA89C] text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Checking...</p>}
                            {slugStatus === "ok" && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-600 text-xs flex items-center gap-1 font-medium"><Check className="w-3 h-3" />Available!</motion.p>}
                            {slugStatus === "taken" && <p className="text-red-500 text-xs">Already taken</p>}
                            {errors.slug && !slugStatus && <p className="text-red-500 text-xs">{errors.slug}</p>}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-[#102A23] mb-2">Annual Revenue Range</label>
                          <select value={form.revenueRange} onChange={(e) => up("revenueRange", e.target.value)} className={inp}>
                            <option value="0-500">$0 - $500</option>
                            <option value="500-5000000">$500 - $5,000,000</option>
                            <option value="5000000+">$5,000,000+</option>
                          </select>
                        </div>

                        <button onClick={next} className="group w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-[#065F46] to-[#047857] text-white rounded-2xl font-semibold text-sm hover:shadow-xl hover:shadow-[#047857]/20 transition-all hover:scale-[1.01] mt-2">
                          Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="flex items-center justify-center gap-5 pt-2 text-[11px] text-[#8AA89C]">
                          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Secure</span>
                          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Cancel anytime</span>
                          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />No hidden fees</span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  STEP 1: Theme Selection — full width
              ═══════════════════════════════════════════════ */}
              {step === 1 && (
                <div className="flex-1 flex flex-col xl:flex-row">
                  {/* Left: Picker */}
                  <div className="xl:w-[50%] p-6 sm:p-8 xl:p-10 overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-medium font-bold text-[#102A23] mb-1">Choose your theme</h2>
                        <p className="text-sm text-[#8AA89C]">Pick a style — you can fully customise later</p>
                      </div>
                      <button onClick={next} className="flex items-center gap-1.5 px-4 py-2 text-xs text-[#8AA89C] hover:text-[#102A23] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium">
                        <SkipForward className="w-3 h-3" /> Skip
                      </button>
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
                      {themeCategories.map((cat) => (
                        <button key={cat.id} onClick={() => setActiveCat(cat.id)} className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeCat === cat.id ? "bg-[#102A23] text-white shadow-md" : "bg-white text-[#8AA89C] hover:bg-gray-50 border border-gray-200"}`}>
                          {cat.name}
                        </button>
                      ))}
                    </div>

                    {/* Theme grid — bigger cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      {themeCategories.find((c) => c.id === activeCat)?.themes.map((t) => {
                        const sel = form.theme === t.id;
                        return (
                          <motion.button key={t.id} onClick={() => up("theme", t.id)} whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.97 }} className={`relative rounded-2xl text-left transition-all overflow-hidden ${sel ? "ring-2 ring-[#047857] ring-offset-2 shadow-lg" : "ring-1 ring-gray-200 hover:ring-gray-300 hover:shadow-md"}`}>
                            {sel && <motion.div className="absolute top-2 right-2 z-10 w-5 h-5 bg-[#047857] rounded-full flex items-center justify-center shadow" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}><Check className="w-3 h-3 text-white" /></motion.div>}

                            {/* Mini preview */}
                            <div className="rounded-t-2xl overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: t.primary }}>
                                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: t.accent }} /><div className="h-1 w-8 rounded-full bg-white/25" /></div>
                                <div className="flex gap-1"><div className="h-1 w-4 rounded-full bg-white/15" /><div className="h-1 w-4 rounded-full bg-white/15" /></div>
                              </div>
                              <div className="px-3 py-4 space-y-2" style={{ backgroundColor: t.bg }}>
                                <div className="h-2 w-3/4 rounded-full mx-auto" style={{ backgroundColor: t.primary + "18" }} />
                                <div className="h-1.5 w-1/2 rounded-full mx-auto" style={{ backgroundColor: t.primary + "0D" }} />
                                <div className="flex gap-1.5 mt-3 justify-center">
                                  <div className="h-4 w-12 rounded-full" style={{ backgroundColor: t.accent }} />
                                  <div className="h-4 w-12 rounded-full border" style={{ borderColor: t.primary + "20" }} />
                                </div>
                                <div className="flex gap-1.5 mt-3">
                                  {[1, 2, 3].map((n) => (
                                    <div key={n} className="flex-1 bg-white rounded-lg p-1.5 border border-gray-100">
                                      <div className="h-4 rounded mb-1" style={{ backgroundColor: t.accent + "12" }} />
                                      <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: t.primary + "12" }} />
                                      <div className="h-1 mt-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ backgroundColor: t.accent, width: `${25 + n * 20}%` }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="px-3.5 py-3 bg-white border-t border-gray-100">
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.primary }} />
                                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.accent }} />
                                <div className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ backgroundColor: t.bg }} />
                              </div>
                              <p className="text-[12px] font-semibold text-[#102A23] truncate">{t.name}</p>
                              <p className="text-[10px] text-[#8AA89C] truncate">{t.desc}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Nav buttons */}
                    <div className="flex gap-3 mt-6 sticky bottom-0 pb-2 bg-gradient-to-t from-[#F3F8F5] pt-4">
                      <button onClick={prev} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-200 text-[#102A23] rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>
                      <button onClick={next} className="group flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#065F46] to-[#047857] text-white rounded-2xl font-semibold text-sm hover:shadow-lg hover:shadow-[#047857]/20 transition-all">
                        Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Right: Large preview */}
                  <div className="hidden xl:flex xl:w-[50%] bg-[#E7F2EC] items-center justify-center p-8 2xl:p-12 border-l border-[#DDD6EE]">
                    <div className="w-full max-w-[640px]">
                      <div className="flex items-center justify-center gap-2 mb-5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#047857] animate-pulse" />
                        <p className="text-xs text-[#8AA89C] font-semibold uppercase tracking-[0.2em]">Live Preview</p>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#047857] animate-pulse" />
                      </div>

                      <ThemePreview theme={theme} orgName={form.orgName || "Your Organisation"} />

                      <div className="mt-5 text-center">
                        <p className="text-sm text-[#8AA89C]">
                          Selected: <span className="font-bold text-[#102A23]">{theme.name}</span>
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          {[theme.primary, theme.accent, theme.bg].map((c, i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  STEP 2: Admin Account — split with illustration
              ═══════════════════════════════════════════════ */}
              {step === 2 && (
                <div className="flex-1 flex flex-col lg:flex-row">
                  {/* Left: Visual — light with theme preview */}
                  <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden items-center justify-center" style={{ background: "linear-gradient(165deg, #E7F2EC 0%, #E8E0F4 50%, #E8E0F4 100%)" }}>
                    {/* Gloss */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%)" }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${theme.accent}10 0%, transparent 60%)` }} />

                    <div className="relative z-10 px-10 py-10 max-w-md w-full">
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center mb-6">
                        <h3 className="text-xl font-medium font-bold text-[#102A23] mb-1">Almost there!</h3>
                        <p className="text-[11px] text-[#8AA89C]">Here's what your portal will look like</p>
                      </motion.div>

                      {/* Portal card with selected theme */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl shadow-xl shadow-black/[0.06] border border-white/60 overflow-hidden"
                        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)" }}
                      >
                        {/* Gloss */}
                        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 40%)" }} />
                        {/* Mini navbar with theme colors */}
                        <div className="flex items-center justify-between px-4 py-2.5 relative" style={{ backgroundColor: theme.primary }}>
                          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)" }} />
                          <div className="flex items-center gap-2 relative">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[7px] font-bold" style={{ backgroundColor: theme.accent }}>{(form.orgName || "Y").charAt(0)}</div>
                            <span className="text-[10px] font-bold text-white">{form.orgName || "Your Organisation"}</span>
                          </div>
                          <div className="flex gap-1.5 relative">
                            {["Home", "Programs", "Events"].map((l) => <span key={l} className="text-[7px] text-white/40">{l}</span>)}
                            <div className="px-2 py-0.5 rounded text-white text-[7px] font-bold" style={{ backgroundColor: theme.accent }}>Donate</div>
                          </div>
                        </div>
                        {/* Page body */}
                        <div className="p-4 space-y-3" style={{ backgroundColor: theme.bg }}>
                          <div className="text-center py-3">
                            <div className="h-2 w-2/3 rounded-full mx-auto mb-1.5" style={{ backgroundColor: theme.primary + "15" }} />
                            <div className="h-1.5 w-1/3 rounded-full mx-auto" style={{ backgroundColor: theme.primary + "0A" }} />
                            <div className="flex justify-center gap-1.5 mt-3">
                              <div className="h-5 w-14 rounded-full" style={{ backgroundColor: theme.accent }} />
                              <div className="h-5 w-14 rounded-full border" style={{ borderColor: theme.primary + "15" }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[65, 42, 88].map((pct, i) => (
                              <div key={i} className="bg-white rounded-xl p-2 border border-gray-100 shadow-sm">
                                <div className="h-5 rounded-lg mb-1.5" style={{ backgroundColor: theme.accent + "10" }} />
                                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ backgroundColor: theme.accent, width: `${pct}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>

                      {/* Portal info */}
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-5 flex items-center justify-center gap-3">
                        {[theme.primary, theme.accent, theme.bg].map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c }} />
                            <span className="text-[9px] text-[#8AA89C] font-mono">{c}</span>
                          </div>
                        ))}
                      </motion.div>
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center text-xs text-[#8AA89C] mt-3 font-medium">
                        Theme: <span className="text-[#102A23]">{theme.name}</span>
                      </motion.p>
                    </div>
                  </div>

                  {/* Right: Form */}
                  <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
                    <div className="w-full max-w-lg">
                      <motion.div {...fade} className="mb-8">
                        <h2 className="text-2xl sm:text-3xl font-medium font-bold text-[#102A23] mb-2">Create your admin account</h2>
                        <p className="text-sm text-[#8AA89C]">These credentials will be used to manage your portal</p>
                      </motion.div>

                      <motion.div {...fade} custom={1} className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-[#102A23] mb-2">Full Name</label>
                          <input type="text" value={form.adminName} onChange={(e) => up("adminName", e.target.value)} className={inp} placeholder="John Doe" />
                          {errors.adminName && <p className="text-red-500 text-xs mt-1.5">{errors.adminName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#102A23] mb-2">Email Address</label>
                          <input type="email" value={form.adminEmail} onChange={(e) => up("adminEmail", e.target.value)} className={inp} placeholder="john@hopegivefoundation.org" />
                          {errors.adminEmail && <p className="text-red-500 text-xs mt-1.5">{errors.adminEmail}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-[#102A23] mb-2">Password</label>
                            <input type="password" value={form.adminPassword} onChange={(e) => up("adminPassword", e.target.value)} className={inp} placeholder="Min 6 characters" />
                            {errors.adminPassword && <p className="text-red-500 text-xs mt-1.5">{errors.adminPassword}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#102A23] mb-2">Confirm</label>
                            <input type="password" value={form.confirmPassword} onChange={(e) => up("confirmPassword", e.target.value)} className={inp} />
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword}</p>}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button onClick={prev} className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-gray-200 text-[#102A23] rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-all">
                            <ArrowLeft className="w-4 h-4" /> Back
                          </button>
                          <button onClick={next} className="group flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#065F46] to-[#047857] text-white rounded-2xl font-semibold text-sm hover:shadow-xl hover:shadow-[#047857]/20 transition-all hover:scale-[1.01]">
                            Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  STEP 3: Review — centered with summary
              ═══════════════════════════════════════════════ */}
              {step === 3 && (
                <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
                  <div className="w-full max-w-xl">
                    <motion.div {...fade} className="text-center mb-8">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#065F46] to-[#047857] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#047857]/20">
                        <FileCheck className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-medium font-bold text-[#102A23] mb-2">Review your details</h2>
                      <p className="text-sm text-[#8AA89C]">Confirm everything looks good before payment</p>
                    </motion.div>

                    <motion.div {...fade} custom={1} className="space-y-4">
                      {/* Org */}
                      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                        <h3 className="text-[10px] font-bold text-[#047857] uppercase tracking-[0.15em] mb-3">Organisation</h3>
                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                          <span className="text-[#8AA89C]">Name</span><span className="text-[#102A23] font-medium text-right">{form.orgName}</span>
                          <span className="text-[#8AA89C]">Portal</span><span className="text-[#102A23] font-medium text-right font-mono text-xs">{form.slug}.charities.ltd</span>
                        </div>
                      </div>
                      {/* Admin */}
                      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                        <h3 className="text-[10px] font-bold text-[#047857] uppercase tracking-[0.15em] mb-3">Admin Account</h3>
                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                          <span className="text-[#8AA89C]">Name</span><span className="text-[#102A23] font-medium text-right">{form.adminName}</span>
                          <span className="text-[#8AA89C]">Email</span><span className="text-[#102A23] font-medium text-right">{form.adminEmail}</span>
                        </div>
                      </div>
                      {/* Plan & Theme */}
                      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                        <h3 className="text-[10px] font-bold text-[#047857] uppercase tracking-[0.15em] mb-3">Plan & Theme</h3>
                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                          <span className="text-[#8AA89C]">Plan</span><span className="text-[#102A23] font-medium capitalize text-right">{form.plan}</span>
                          <span className="text-[#8AA89C]">Billing</span><span className="text-[#102A23] font-medium capitalize text-right">{form.billingCycle}</span>
                          <span className="text-[#8AA89C]">Theme</span>
                          <span className="text-[#102A23] font-medium text-right flex items-center justify-end gap-2">
                            {[theme.primary, theme.accent, theme.bg].map((c, i) => <span key={i} className="w-4 h-4 rounded-full border border-gray-200 inline-block shadow-sm" style={{ backgroundColor: c }} />)}
                            <span>{theme.name}</span>
                          </span>
                        </div>
                      </div>

                      {errors.submit && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-600 text-sm rounded-2xl p-4 border border-red-100">{errors.submit}</motion.div>}

                      <div className="flex gap-3 pt-2">
                        <button onClick={prev} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-gray-200 text-[#102A23] rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-all">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button onClick={submit} disabled={submitting} className="group flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#065F46] to-[#047857] text-white rounded-2xl font-semibold text-sm hover:shadow-xl hover:shadow-[#047857]/20 transition-all disabled:opacity-60">
                          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Proceed to Payment <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                        </button>
                      </div>

                      <div className="flex items-center justify-center gap-5 pt-3 text-[11px] text-[#8AA89C]">
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-green-500" />256-bit encryption</span>
                        <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Cancel anytime</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function darken(hex, amt) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max((n >> 16) - amt * 2.55, 0);
  const g = Math.max(((n >> 8) & 0xff) - amt * 2.55, 0);
  const b = Math.max((n & 0xff) - amt * 2.55, 0);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
