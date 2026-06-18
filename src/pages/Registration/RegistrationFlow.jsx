import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Check, Building2, User, FileCheck, Palette, ArrowRight, ArrowLeft,
  Loader2, SkipForward, Upload, X as XIcon, ChevronDown, Shield, Sparkles,
  Eye, EyeOff, CreditCard,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import tenantService from "../../services/tenant.service";
import themeCategories, { getThemeById } from "../../config/themePresets";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const STEPS = [
  { label: "Organisation", icon: Building2, hint: "Basic details" },
  { label: "Theme", icon: Palette, hint: "Pick your style" },
  { label: "Account", icon: User, hint: "Admin credentials" },
  { label: "Review", icon: FileCheck, hint: "Confirm details" },
  { label: "Payment", icon: CreditCard, hint: "Secure checkout" },
];

const REVENUE_OPTIONS = [
  { value: "0-500", label: "$0 – $500" },
  { value: "500-5000000", label: "$500 – $5,000,000" },
  { value: "5000000+", label: "$5,000,000+" },
];
const CHARITY_OPTIONS = [
  { value: "general", label: "General charity" },
  { value: "muslim", label: "Muslim charity" },
];

const PLANS = [
  { key: "basic", name: "Basic", monthly: 200, annual: 1920, blurb: "For small charities getting started" },
  { key: "professional", name: "Professional", monthly: 500, annual: 4800, blurb: "For growing charities", popular: true },
  { key: "enterprise", name: "Enterprise", monthly: 1000, annual: 9600, blurb: "For established charities at scale" },
];

/* Token-driven palette — /register is wrapped in data-public-site + the platform
   vars (App.jsx), so these resolve to the live brand colours (emerald is just the
   fallback before settings load). */
const V = {
  bg: "var(--tenant-bg, #F3F8F5)", surface: "#FFFFFF", surface2: "rgba(var(--tenant-accent-rgb, 4,120,87), .08)",
  line: "rgba(16,42,35,.10)",
  ink: "var(--tenant-primary, #102A23)", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "var(--tenant-accent, #047857)", primary2: "var(--pf-accent-2, #065F46)",
  glow: "var(--tenant-accent-light, #10B981)", accent: "var(--pf-gold, #F59E0B)", success: "#059669",
};
const font = "'Outfit', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const mono = "'JetBrains Mono', monospace";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
.reg-page h1,.reg-page h2,.reg-page h3{font-family:'Fraunces','Outfit',Georgia,serif!important;letter-spacing:-0.015em}
.reg-page button,.reg-page input,.reg-page textarea,.reg-page [class*="rounded"],.reg-page [class*="border"]{border-radius:0 !important}
.reg-uline{width:100%;background:transparent;border:0;border-bottom:1px solid rgba(16,42,35,.18);padding:10px 2px;font-size:14px;color:var(--tenant-primary,#102A23);outline:none;transition:border-color .3s,box-shadow .3s}
.reg-uline::placeholder{color:#9aada4}
.reg-uline:focus{border-bottom-color:var(--tenant-accent,#047857);box-shadow:0 1px 0 0 var(--tenant-accent,#047857)}
.reg-submit{position:relative;overflow:hidden;transition:transform .3s}
.reg-submit:hover{transform:translateY(-1px)}
.reg-submit::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.5) 50%,transparent 65%);transform:translateX(-120%);transition:transform 1s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.reg-submit:hover::before{transform:translateX(120%)}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

/* ── Custom animated dropdown (replaces the native <select>) ── */
function Dropdown({ value, onChange, options, id }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative" id={id}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center justify-between border-b py-2.5 text-left text-sm transition-colors"
        style={{ borderColor: open ? V.primary : "rgba(16,42,35,.18)", color: V.ink, boxShadow: open ? `0 1px 0 0 ${V.primary}` : "none" }}>
        <span>{selected?.label}</span>
        <ChevronDown className="h-4 w-4 transition-transform duration-300" style={{ color: V.inkFaint, transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute left-0 right-0 z-30 mt-1 overflow-hidden border bg-white shadow-xl" style={{ borderColor: V.line }}>
            {options.map((o) => {
              const on = o.value === value;
              return (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-black/[0.03]"
                  style={on ? { background: V.surface2, color: V.primary, fontWeight: 600 } : { color: V.inkSoft }}>
                  {o.label}
                  {on && <Check className="h-4 w-4" style={{ color: V.primary }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Label = ({ children }) => (
  <label className="mb-1 block text-[13px] font-semibold" style={{ color: V.ink }}>{children}</label>
);
const Err = ({ children }) => children ? <p className="mt-1.5 text-xs text-red-500">{children}</p> : null;

/* Password strength → 0-4 score + label/colour. */
const STRENGTH = [
  { label: "Too short", color: "#EF4444" },
  { label: "Weak", color: "#F59E0B" },
  { label: "Fair", color: "#EAB308" },
  { label: "Good", color: "#10B981" },
  { label: "Strong", color: "#059669" },
];
function pwScore(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

/* Underline password input with a show/hide eye toggle. */
function PwInput({ value, onChange, show, onToggle, placeholder }) {
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} className="reg-uline" style={{ paddingRight: 32 }} value={value} onChange={onChange} placeholder={placeholder} />
      <button type="button" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-0 top-1.5 p-1 transition-opacity hover:opacity-70" style={{ color: V.inkFaint }}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/* ── In-house Stripe checkout (mirrors the donation/event PaymentElement flow).
   Mounts <Elements> with the subscription invoice's clientSecret and confirms
   the card here; the SaaS webhook activates the org on invoice.paid. ── */
function PaymentInner({ slug, onBack, priceLabel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState("");

  const pay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setErr("");
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) { setErr(error.message || "Payment failed — please check your card details."); setPaying(false); return; }
    if (paymentIntent && ["succeeded", "processing"].includes(paymentIntent.status)) {
      window.location.href = `/register/success?slug=${encodeURIComponent(slug)}`;
    } else { setErr("Payment was not completed."); setPaying(false); }
  };

  return (
    <div>
      <PaymentElement options={{ layout: "tabs" }} />
      {err && <p className="mt-3 text-xs text-red-500">{err}</p>}
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onBack} disabled={paying} className="flex flex-1 items-center justify-center gap-2 border py-3.5 text-[14px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ borderColor: V.line, color: V.ink }}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button type="button" onClick={pay} disabled={paying || !stripe} className="reg-submit group flex flex-[1.4] items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white disabled:opacity-60" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>
          {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>Pay {priceLabel} &amp; launch <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></>}
        </button>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px]" style={{ color: V.inkFaint }}>
        <Shield className="h-3 w-3" style={{ color: V.success }} /> Secured by Stripe · 256-bit encryption
      </p>
    </div>
  );
}

function PaymentStep({ clientSecret, slug, summary, onBack }) {
  return (
    <div>
      <h2 className="text-[clamp(24px,3vw,32px)] font-semibold" style={{ color: V.ink }}>Payment details</h2>
      <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>Enter your card to start your subscription. Cancel anytime.</p>

      <div className="mt-5 flex items-center justify-between border p-4 text-[13.5px]" style={{ borderColor: V.line, background: V.surface2 }}>
        <span style={{ color: V.inkSoft }}>{summary.label}</span>
        <span className="text-[15px] font-bold" style={{ color: V.ink }}>{summary.price}</span>
      </div>

      <div className="mt-6">
        {!stripePromise ? (
          <p className="text-sm text-red-500">Card payments aren't configured (missing VITE_STRIPE_PUBLISHABLE_KEY).</p>
        ) : !clientSecret ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: V.inkFaint }}><Loader2 className="h-4 w-4 animate-spin" /> Preparing secure checkout…</div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { borderRadius: "0px", fontFamily: "Outfit, sans-serif", colorPrimary: "#047857" } } }}>
            <PaymentInner slug={slug} onBack={onBack} priceLabel={summary.price} />
          </Elements>
        )}
      </div>
    </div>
  );
}

export default function RegistrationFlow() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [slugStatus, setSlugStatus] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [activeCat, setActiveCat] = useState("warm");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [plans, setPlans] = useState(PLANS);
  const [coupon, setCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const [form, setForm] = useState({
    orgName: "", slug: "", revenueRange: "0-500",
    plan: searchParams.get("plan") || "basic",
    billingCycle: searchParams.get("billing") || "monthly",
    adminName: "", adminEmail: "", adminPassword: "", confirmPassword: "",
    theme: "default",
    isMuslimCharity: false,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const theme = getThemeById(form.theme);
  const up = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // ── Dynamic plans (SuperAdmin-managed); falls back to the static PLANS ──
  useEffect(() => {
    tenantService.getPublicPlans()
      .then((r) => {
        const list = (Array.isArray(r.data) ? r.data : [])
          .map((p) => ({ key: p.code, name: p.name, monthly: p.price?.monthly || 0, annual: p.price?.annual || 0, blurb: p.description || "" }));
        if (list.length) {
          // Mark the middle plan as the highlighted/popular one.
          const mid = Math.floor((list.length - 1) / 2);
          list.forEach((p, i) => { p.popular = i === mid; });
          setPlans(list);
          // If the pre-selected plan isn't in the dynamic list, default to the popular one.
          setForm((f) => (list.some((p) => p.key === f.plan) ? f : { ...f, plan: list[mid].key }));
        }
      })
      .catch(() => {});
  }, []);

  // ── Coupon ──
  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponMsg(null);
    try {
      const r = await tenantService.validateCoupon(code, form.plan);
      if (r.data?.valid) {
        setCoupon(r.data);
        const off = r.data.type === "percent" ? `${r.data.value}% off` : `$${r.data.value} off`;
        setCouponMsg({ ok: true, text: `${r.data.code} applied — ${off}` });
      } else {
        setCoupon(null);
        setCouponMsg({ ok: false, text: r.data?.error || "Invalid coupon" });
      }
    } catch (err) {
      setCoupon(null);
      setCouponMsg({ ok: false, text: err.response?.data?.error || "Invalid coupon" });
    } finally {
      setCouponBusy(false);
    }
  };
  const clearCoupon = () => { setCoupon(null); setCouponMsg(null); setCouponInput(""); };

  // ── GSAP: progress bar fills as you advance the steps ──
  const progressRef = useRef(null);
  useEffect(() => {
    if (!progressRef.current) return;
    const pct = ((step + 1) / STEPS.length) * 100;
    const tween = gsap.to(progressRef.current, { width: `${pct}%`, duration: 0.6, ease: "power2.out" });
    return () => tween.kill();
  }, [step]);

  // ── Logo ──
  const handleLogoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logo: "Logo must be under 2MB" }));
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setErrors((prev) => { const { logo, ...rest } = prev; return rest; });
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await tenantService.uploadRegistrationLogo(fd);
      setLogoUrl(res.data.logoUrl);
    } catch (err) {
      setErrors((prev) => ({ ...prev, logo: "Upload failed, try again" }));
      setLogoFile(null);
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  };
  const removeLogo = () => { setLogoFile(null); setLogoPreview(null); setLogoUrl(""); };

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

  // ── Email availability (debounced, only once the format is valid) ──
  useEffect(() => {
    const email = form.adminEmail.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailStatus(null); return; }
    setEmailStatus("checking");
    const t = setTimeout(async () => {
      try { const r = await tenantService.checkEmail(email); setEmailStatus(r.data.available ? "ok" : "taken"); }
      catch { setEmailStatus(null); }
    }, 400);
    return () => clearTimeout(t);
  }, [form.adminEmail]);

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
      else if (!/\S+@\S+\.\S+/.test(form.adminEmail)) e.adminEmail = "Invalid";
      else if (emailStatus === "taken") e.adminEmail = "An account with this email already exists";
      if (form.adminPassword.length < 6) e.adminPassword = "Min 6 characters";
      if (form.adminPassword !== form.confirmPassword) e.confirmPassword = "Mismatch";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  const next = () => { if (validate()) { setDir(1); setStep((s) => s + 1); } };
  const prev = () => { setDir(-1); setStep((s) => s - 1); };

  // Review → "Proceed to payment": creates the org + subscription (returns the
  // PaymentIntent clientSecret) and advances to the in-house payment step. If the
  // subscription already exists (came back to edit), just re-open the payment step.
  const submit = async () => {
    if (clientSecret) { setDir(1); setStep(4); return; }
    setSubmitting(true);
    setErrors((p) => ({ ...p, submit: undefined }));
    try {
      const r = await tenantService.register({
        orgName: form.orgName, slug: form.slug, adminName: form.adminName,
        adminEmail: form.adminEmail, adminPassword: form.adminPassword,
        plan: form.plan, billingCycle: form.billingCycle,
        revenueRange: form.revenueRange, theme: form.theme,
        isMuslimCharity: form.isMuslimCharity,
        logoUrl: logoUrl || undefined,
        couponCode: coupon?.code || undefined,
      });
      setClientSecret(r.data.clientSecret);
      setDir(1);
      setStep(4);
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || "Registration failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || "yourplatform.org";
  const slide = {
    initial: { opacity: 0, x: dir > 0 ? 40 : -40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: dir > 0 ? -40 : 40 },
    transition: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] },
  };

  return (
    <div className="reg-page relative min-h-screen" style={{ fontFamily: font, background: V.bg, color: V.ink }}>
      <style>{css}</style>

      {/* Ambient grid */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(15,23,42,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)" }} />

      <div className={`relative z-[1] mx-auto px-4 py-6 transition-[max-width] duration-500 ease-out sm:px-6 lg:py-12 ${step === 1 ? "max-w-6xl" : "max-w-5xl"}`}>
        <div className="grid grid-cols-1 overflow-hidden border lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1fr)]"
          style={{ borderColor: V.line, boxShadow: "0 30px 70px -36px rgba(6,40,30,.4)" }}>

          {/* ═══ LEFT — dark brand panel + stepper ═══ */}
          <div className="relative overflow-hidden p-8 text-white sm:p-10"
            style={{ background: "linear-gradient(155deg, var(--tenant-primary, #102A23) 0%, #0A1A14 100%)" }}>
            {/* geometric shapes */}
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 border-2" style={{ borderColor: "rgba(255,255,255,.10)" }} />
            <div aria-hidden className="pointer-events-none absolute bottom-24 right-7 h-14 w-24 opacity-[.16]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.9) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
            <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-2 w-16" style={{ background: V.glow }} />

            <div className="relative flex h-full flex-col">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center text-[15px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${V.primary2}, ${V.primary})` }}>N</span>
                <span className="text-[17px] font-bold tracking-tight text-white">NGO Platform</span>
              </Link>

              <span className="mt-9 inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/55" style={{ fontFamily: mono }}>
                <span className="h-1.5 w-1.5" style={{ background: V.glow }} /> Start your portal
              </span>
              <h1 className="mt-4 text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.05] text-white">
                Set up your charity in minutes.
              </h1>
              <p className="mt-3 max-w-[34ch] text-[14px] leading-relaxed text-white/70">
                Four quick steps and your branded donation portal is ready to share. No setup fee, cancel anytime.
              </p>

              {/* Vertical stepper */}
              <nav className="mt-9 space-y-0.5">
                {STEPS.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <div key={s.label} className="flex items-start gap-3.5">
                      <div className="flex flex-col items-center">
                        <motion.div className="grid h-9 w-9 shrink-0 place-items-center text-[13px] font-bold"
                          animate={active ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.4 }}
                          style={done
                            ? { background: "#fff", color: V.primary }
                            : active
                              ? { background: V.glow, color: "#06231b" }
                              : { background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.5)", border: "1px solid rgba(255,255,255,.18)" }}>
                          {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                        </motion.div>
                        {i < STEPS.length - 1 && (
                          <div className="my-1 h-7 w-[2px] overflow-hidden" style={{ background: "rgba(255,255,255,.14)" }}>
                            <motion.div className="w-full" style={{ background: V.glow }} initial={{ height: 0 }} animate={{ height: done ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
                          </div>
                        )}
                      </div>
                      <div className="pt-1.5">
                        <p className="text-[14px] font-semibold transition-colors" style={{ color: active || done ? "#fff" : "rgba(255,255,255,.55)" }}>{s.label}</p>
                        <p className="text-[11.5px]" style={{ color: "rgba(255,255,255,.42)" }}>{s.hint}</p>
                      </div>
                    </div>
                  );
                })}
              </nav>

              {/* Progress bar (GSAP) + trust */}
              <div className="mt-auto pt-9">
                <div className="mb-2 flex items-center justify-between text-[11px] text-white/45">
                  <span style={{ fontFamily: mono }}>Step {step + 1} of {STEPS.length}</span>
                  <Link to="/plans" className="transition-colors hover:text-white">View pricing →</Link>
                </div>
                <div className="h-[3px] w-full overflow-hidden" style={{ background: "rgba(255,255,255,.12)" }}>
                  <div ref={progressRef} className="h-full" style={{ width: "25%", background: `linear-gradient(90deg, ${V.glow}, #fff)` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT — white form ═══ */}
          <div className="relative bg-white p-7 pt-16 sm:p-10 sm:pt-16">
            <Link to="/" className="absolute right-6 top-6 z-10 inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-opacity hover:opacity-70" style={{ color: V.inkFaint }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} {...slide} className={`mx-auto w-full ${step === 1 ? "max-w-none" : "max-w-[480px]"}`}>

                {/* ── STEP 0: Organisation ── */}
                {step === 0 && (
                  <div>
                    <h2 className="text-[clamp(24px,3vw,32px)] font-semibold" style={{ color: V.ink }}>Tell us about your organisation</h2>
                    <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>We'll use this to create your branded portal.</p>

                    <div className="mt-8 space-y-6">
                      <div>
                        <Label>Organisation name</Label>
                        <input type="text" className="reg-uline" value={form.orgName} onChange={(e) => onOrgName(e.target.value)} placeholder="Hope Give Foundation" />
                        <Err>{errors.orgName}</Err>
                      </div>

                      <div>
                        <Label>Web address</Label>
                        <div className="flex items-end">
                          <input type="text" className="reg-uline flex-1" value={form.slug} onChange={(e) => up("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="hopegive" />
                          <span className="ml-1 pb-2.5 text-[13px]" style={{ fontFamily: mono, color: V.inkFaint }}>.{rootDomain}</span>
                        </div>
                        <div className="mt-1.5 h-4 text-xs">
                          {slugStatus === "checking" && <span className="inline-flex items-center gap-1" style={{ color: V.inkFaint }}><Loader2 className="h-3 w-3 animate-spin" /> Checking…</span>}
                          {slugStatus === "ok" && <span className="inline-flex items-center gap-1 font-medium" style={{ color: V.success }}><Check className="h-3 w-3" /> Available</span>}
                          {slugStatus === "taken" && <span className="text-red-500">Already taken</span>}
                          {errors.slug && !slugStatus && <span className="text-red-500">{errors.slug}</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <Label>Annual revenue</Label>
                          <Dropdown value={form.revenueRange} onChange={(v) => up("revenueRange", v)} options={REVENUE_OPTIONS} />
                        </div>
                        <div>
                          <Label>Charity type</Label>
                          <Dropdown value={form.isMuslimCharity ? "muslim" : "general"} onChange={(v) => up("isMuslimCharity", v === "muslim")} options={CHARITY_OPTIONS} />
                        </div>
                      </div>
                      <p className="-mt-3 text-[12px] leading-relaxed" style={{ color: V.inkFaint }}>
                        Muslim charities get the Islamic giving pages (Zakat, Ramadan, Ways to Give) and donation types. You can change this later.
                      </p>

                      <div>
                        <Label>Organisation logo <span className="font-normal" style={{ color: V.inkFaint }}>(optional)</span></Label>
                        {!logoPreview ? (
                          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed py-6 transition-colors hover:bg-black/[0.015]" style={{ borderColor: "rgba(16,42,35,.16)" }}>
                            <span className="grid h-10 w-10 place-items-center" style={{ background: V.surface2, color: V.primary }}><Upload className="h-5 w-5" /></span>
                            <span className="text-[13.5px] font-medium" style={{ color: V.ink }}>Click to upload</span>
                            <span className="text-[11.5px]" style={{ color: V.inkFaint }}>PNG, JPG, SVG or WebP · max 2MB</span>
                            <input type="file" accept="image/jpeg,image/png,image/svg+xml,image/webp" onChange={handleLogoSelect} className="hidden" />
                          </label>
                        ) : (
                          <div className="flex items-center gap-4 border p-4" style={{ borderColor: V.line }}>
                            <img src={logoPreview} alt="Logo" className="h-14 w-14 border object-contain" style={{ borderColor: V.line, background: V.bg }} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13.5px] font-medium" style={{ color: V.ink }}>{logoFile?.name}</p>
                              <p className="text-[12px]">
                                {logoUploading ? <span className="inline-flex items-center gap-1" style={{ color: V.inkFaint }}><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</span>
                                  : logoUrl ? <span className="inline-flex items-center gap-1" style={{ color: V.success }}><Check className="h-3 w-3" /> Uploaded</span> : null}
                              </p>
                            </div>
                            <button type="button" onClick={removeLogo} className="p-1.5 transition-colors hover:bg-black/5"><XIcon className="h-4 w-4" style={{ color: V.inkFaint }} /></button>
                          </div>
                        )}
                        <Err>{errors.logo}</Err>
                      </div>

                      <button onClick={next} className="reg-submit group flex w-full items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white"
                        style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 14px 30px -14px ${V.primary}` }}>
                        Continue <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 1: Theme ── */}
                {step === 1 && (
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-[clamp(24px,3vw,32px)] font-semibold" style={{ color: V.ink }}>Choose your theme</h2>
                        <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>Pick a style — fully customisable later.</p>
                      </div>
                      <button onClick={next} className="inline-flex shrink-0 items-center gap-1.5 border px-3 py-2 text-xs font-medium transition-colors hover:bg-black/[0.03]" style={{ borderColor: V.line, color: V.inkSoft }}>
                        <SkipForward className="h-3 w-3" /> Skip
                      </button>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {themeCategories.map((cat) => (
                        <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                          className="whitespace-nowrap px-3.5 py-2 text-xs font-semibold transition-colors"
                          style={activeCat === cat.id ? { background: V.ink, color: "#fff" } : { background: V.surface2, color: V.inkSoft, border: `1px solid ${V.line}` }}>
                          {cat.name}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {themeCategories.find((c) => c.id === activeCat)?.themes.map((t) => {
                        const sel = form.theme === t.id;
                        return (
                          <motion.button key={t.id} onClick={() => up("theme", t.id)} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                            className="relative overflow-hidden text-left transition-shadow"
                            style={{ border: sel ? `2px solid ${V.primary}` : `1px solid ${V.line}`, boxShadow: sel ? `0 12px 26px -14px ${V.primary}` : "none" }}>
                            {sel && <span className="absolute right-1.5 top-1.5 z-10 grid h-5 w-5 place-items-center text-white" style={{ background: V.primary }}><Check className="h-3 w-3" /></span>}
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: t.primary }}>
                              <div className="flex items-center gap-1.5"><div className="h-3.5 w-3.5" style={{ background: t.accent }} /><div className="h-1 w-8 bg-white/25" /></div>
                              <div className="flex gap-1"><div className="h-1 w-4 bg-white/15" /><div className="h-1 w-4 bg-white/15" /></div>
                            </div>
                            <div className="space-y-2 px-3 py-4" style={{ background: t.bg }}>
                              <div className="mx-auto h-2 w-3/4" style={{ background: t.primary + "18" }} />
                              <div className="mx-auto h-1.5 w-1/2" style={{ background: t.primary + "0D" }} />
                              <div className="mt-3 flex justify-center gap-1.5">
                                <div className="h-4 w-12" style={{ background: t.accent }} />
                                <div className="h-4 w-12 border" style={{ borderColor: t.primary + "20" }} />
                              </div>
                            </div>
                            <div className="border-t bg-white px-3.5 py-3" style={{ borderColor: V.line }}>
                              <div className="mb-1 flex items-center gap-1.5">
                                <div className="h-3 w-3" style={{ background: t.primary }} />
                                <div className="h-3 w-3" style={{ background: t.accent }} />
                                <div className="h-3 w-3 border" style={{ background: t.bg, borderColor: V.line }} />
                              </div>
                              <p className="truncate text-[12px] font-semibold" style={{ color: V.ink }}>{t.name}</p>
                              <p className="truncate text-[10px]" style={{ color: V.inkFaint }}>{t.desc}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="mt-7 flex gap-3">
                      <button onClick={prev} className="flex flex-1 items-center justify-center gap-2 border py-3.5 text-[14px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ borderColor: V.line, color: V.ink }}>
                        <ArrowLeft className="h-4 w-4" /> Back
                      </button>
                      <button onClick={next} className="reg-submit group flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>
                        Continue <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Account ── */}
                {step === 2 && (
                  <div>
                    <h2 className="text-[clamp(24px,3vw,32px)] font-semibold" style={{ color: V.ink }}>Create your admin account</h2>
                    <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>You'll use these credentials to manage your portal.</p>

                    <div className="mt-8 space-y-6">
                      <div>
                        <Label>Full name</Label>
                        <input type="text" className="reg-uline" value={form.adminName} onChange={(e) => up("adminName", e.target.value)} placeholder="John Doe" />
                        <Err>{errors.adminName}</Err>
                      </div>
                      <div>
                        <Label>Email address</Label>
                        <input type="email" className="reg-uline" value={form.adminEmail} onChange={(e) => up("adminEmail", e.target.value)} placeholder="john@hopegive.org" />
                        <div className="mt-1.5 h-4 text-xs">
                          {emailStatus === "checking" && <span className="inline-flex items-center gap-1" style={{ color: V.inkFaint }}><Loader2 className="h-3 w-3 animate-spin" /> Checking…</span>}
                          {emailStatus === "ok" && <span className="inline-flex items-center gap-1 font-medium" style={{ color: V.success }}><Check className="h-3 w-3" /> Email available</span>}
                          {emailStatus === "taken" && <span className="text-red-500">An account with this email already exists</span>}
                          {errors.adminEmail && emailStatus !== "taken" && <span className="text-red-500">{errors.adminEmail}</span>}
                        </div>
                      </div>
                      <div>
                        <Label>Password</Label>
                        <PwInput value={form.adminPassword} onChange={(e) => up("adminPassword", e.target.value)} show={showPw} onToggle={() => setShowPw((v) => !v)} placeholder="Min 6 characters" />
                        {form.adminPassword && (() => {
                          const sc = pwScore(form.adminPassword);
                          const m = STRENGTH[sc];
                          return (
                            <div className="mt-2 flex items-center gap-3">
                              <div className="flex flex-1 gap-1">
                                {[0, 1, 2, 3].map((i) => (
                                  <div key={i} className="h-1 flex-1 transition-colors duration-300" style={{ background: i < sc ? m.color : "rgba(16,42,35,.12)" }} />
                                ))}
                              </div>
                              <span className="text-[11px] font-semibold" style={{ color: m.color }}>{m.label}</span>
                            </div>
                          );
                        })()}
                        <Err>{errors.adminPassword}</Err>
                      </div>
                      <div>
                        <Label>Confirm password</Label>
                        <PwInput value={form.confirmPassword} onChange={(e) => up("confirmPassword", e.target.value)} show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} placeholder="Repeat password" />
                        {form.confirmPassword && !errors.confirmPassword && (
                          <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px]" style={{ color: form.confirmPassword === form.adminPassword ? V.success : "#EF4444" }}>
                            {form.confirmPassword === form.adminPassword ? <><Check className="h-3.5 w-3.5" /> Passwords match</> : <><XIcon className="h-3.5 w-3.5" /> Passwords don't match</>}
                          </p>
                        )}
                        <Err>{errors.confirmPassword}</Err>
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button onClick={prev} className="flex flex-1 items-center justify-center gap-2 border py-3.5 text-[14px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ borderColor: V.line, color: V.ink }}>
                          <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <button onClick={next} className="reg-submit group flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>
                          Continue <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Review ── */}
                {step === 3 && (
                  <div>
                    <h2 className="text-[clamp(24px,3vw,32px)] font-semibold" style={{ color: V.ink }}>Review your details</h2>
                    <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>Confirm everything looks good before payment.</p>

                    <div className="mt-7 space-y-4">
                      {[
                        { h: "Organisation", rows: [["Name", form.orgName], ["Portal", `${form.slug}.${rootDomain}`]] },
                        { h: "Admin account", rows: [["Name", form.adminName], ["Email", form.adminEmail]] },
                      ].map((sec) => (
                        <div key={sec.h} className="border p-5" style={{ borderColor: V.line, background: V.surface }}>
                          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: V.primary, fontFamily: mono }}>{sec.h}</h3>
                          <div className="space-y-2.5 text-[13.5px]">
                            {sec.rows.map(([k, val]) => (
                              <div key={k} className="flex items-center justify-between gap-3">
                                <span style={{ color: V.inkFaint }}>{k}</span>
                                <span className="break-all text-right font-medium" style={{ color: V.ink }}>{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Plan & billing — selectable */}
                      <div className="border p-5" style={{ borderColor: V.line, background: V.surface }}>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: V.primary, fontFamily: mono }}>Choose your plan</h3>
                          {/* billing toggle */}
                          <div className="inline-flex border text-[12px] font-semibold" style={{ borderColor: V.line }}>
                            {["monthly", "annual"].map((b) => {
                              const on = form.billingCycle === b;
                              return (
                                <button key={b} type="button" disabled={!!clientSecret} onClick={() => { up("billingCycle", b); clearCoupon(); }} className="px-3 py-1.5 capitalize transition-colors disabled:cursor-not-allowed"
                                  style={on ? { background: V.primary, color: "#fff" } : { color: V.inkSoft }}>
                                  {b}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {plans.map((p) => {
                            const on = form.plan === p.key;
                            const annual = form.billingCycle === "annual";
                            return (
                              <button key={p.key} type="button" disabled={!!clientSecret} onClick={() => { up("plan", p.key); clearCoupon(); }}
                                className="flex w-full items-center justify-between gap-3 border p-3 text-left transition-colors disabled:cursor-not-allowed"
                                style={on ? { borderColor: V.primary, background: V.surface2 } : { borderColor: V.line }}>
                                <span className="flex items-center gap-3">
                                  <span className="grid h-5 w-5 shrink-0 place-items-center border" style={on ? { background: V.primary, borderColor: V.primary } : { borderColor: "rgba(16,42,35,.3)" }}>
                                    {on && <Check className="h-3 w-3 text-white" />}
                                  </span>
                                  <span>
                                    <span className="inline-flex items-center gap-2 text-[14px] font-semibold" style={{ color: V.ink }}>
                                      {p.name}
                                      {p.popular && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white" style={{ background: V.primary }}>Popular</span>}
                                    </span>
                                    {p.blurb && <span className="block text-[11.5px]" style={{ color: V.inkFaint }}>{p.blurb}</span>}
                                  </span>
                                </span>
                                <span className="shrink-0 text-[13px]" style={{ color: V.inkSoft }}>
                                  <span className="text-[16px] font-bold" style={{ color: V.ink }}>${(annual ? p.annual : p.monthly).toLocaleString()}</span>{annual ? "/yr" : "/mo"}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Coupon */}
                        <div className="mt-3 border-t pt-3" style={{ borderColor: V.line }}>
                          <div className="flex items-end gap-2">
                            <input className="reg-uline flex-1" placeholder="Discount code (optional)" value={couponInput} disabled={!!coupon}
                              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }} />
                            {coupon ? (
                              <button type="button" onClick={clearCoupon} className="shrink-0 px-3 py-2 text-[13px] font-semibold" style={{ color: V.inkSoft }}>Remove</button>
                            ) : (
                              <button type="button" onClick={applyCoupon} disabled={!couponInput.trim() || couponBusy} className="shrink-0 border px-4 py-2 text-[13px] font-semibold disabled:opacity-50" style={{ borderColor: V.line, color: V.primary }}>
                                {couponBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                              </button>
                            )}
                          </div>
                          {couponMsg && (
                            <p className="mt-1.5 inline-flex items-center gap-1 text-[12px]" style={{ color: couponMsg.ok ? V.success : "#EF4444" }}>
                              {couponMsg.ok ? <Check className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />} {couponMsg.text}
                            </p>
                          )}
                        </div>

                        {/* Total (with discount) */}
                        {(() => {
                          const p = plans.find((pl) => pl.key === form.plan) || plans[0];
                          const annual = form.billingCycle === "annual";
                          const base = (annual ? p?.annual : p?.monthly) || 0;
                          const discount = coupon ? (coupon.type === "percent" ? Math.round((base * coupon.value) / 100) : Math.min(base, coupon.value)) : 0;
                          const total = Math.max(0, base - discount);
                          const per = annual ? "/yr" : "/mo";
                          return (
                            <div className="mt-3 space-y-1.5 border-t pt-3 text-[13.5px]" style={{ borderColor: V.line }}>
                              {discount > 0 && (
                                <>
                                  <div className="flex items-center justify-between" style={{ color: V.inkFaint }}>
                                    <span>Subtotal</span><span>${base.toLocaleString()}{per}</span>
                                  </div>
                                  <div className="flex items-center justify-between" style={{ color: V.success }}>
                                    <span>Discount ({coupon.code})</span><span>−${discount.toLocaleString()}</span>
                                  </div>
                                </>
                              )}
                              <div className="flex items-center justify-between text-[15px] font-bold" style={{ color: V.ink }}>
                                <span>Total</span><span>${total.toLocaleString()}{per}</span>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="mt-3 flex items-center justify-between border-t pt-3 text-[13.5px]" style={{ borderColor: V.line }}>
                          <span style={{ color: V.inkFaint }}>Theme</span>
                          <span className="inline-flex items-center gap-2 font-medium" style={{ color: V.ink }}>
                            {[theme.primary, theme.accent, theme.bg].map((c, i) => <span key={i} className="h-4 w-4 border" style={{ background: c, borderColor: V.line }} />)}
                            {theme.name}
                          </span>
                        </div>
                      </div>

                      {errors.submit && <div className="border p-4 text-sm text-red-600" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>{errors.submit}</div>}

                      <div className="flex gap-3 pt-1">
                        <button onClick={prev} disabled={submitting} className="flex flex-1 items-center justify-center gap-2 border py-3.5 text-[14px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ borderColor: V.line, color: V.ink }}>
                          <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <button onClick={submit} disabled={submitting} className="reg-submit group flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white disabled:opacity-60" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>
                          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>Proceed to payment <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: Payment (in-house Stripe Elements) ── */}
                {step === 4 && (
                  <PaymentStep
                    clientSecret={clientSecret}
                    slug={form.slug}
                    summary={(() => {
                      const p = plans.find((pl) => pl.key === form.plan) || plans[0];
                      const annual = form.billingCycle === "annual";
                      const base = (annual ? p?.annual : p?.monthly) || 0;
                      const discount = coupon ? (coupon.type === "percent" ? Math.round((base * coupon.value) / 100) : Math.min(base, coupon.value)) : 0;
                      const total = Math.max(0, base - discount);
                      return {
                        label: `${p?.name} · ${annual ? "Annual" : "Monthly"}${coupon ? ` · ${coupon.code}` : ""}`,
                        price: `$${total.toLocaleString()}${annual ? "/yr" : "/mo"}`,
                      };
                    })()}
                    onBack={() => { setDir(-1); setStep(3); }}
                  />
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
