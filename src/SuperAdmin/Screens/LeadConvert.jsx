import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  Check, Building2, User, ArrowRight, ArrowLeft, Loader2, ChevronDown,
  Link2, CreditCard, Mail, CheckCircle, AlertTriangle, Copy, ExternalLink, Shield,
  Clock, Target, Calendar, Upload, X as XIcon, Percent,
} from "lucide-react";
import { toast } from "react-hot-toast";
import tenantService from "../../services/tenant.service";
import superadminService from "../../services/superadmin.service";
import { getStripePromise } from "../../utils/stripeClient";
import { TabLoader } from "../../components/TabLoader";
import SAErrorState from "../components/SAErrorState";
import { timelineLabel } from "../../config/leadOptions";
import { useTenant } from "../../context/TenantContext";
import themeCategories from "../../config/themePresets";

/* Token-driven palette — inside SuperAdmin these CSS vars already resolve to
   the platform's own slate+emerald console palette (Layout.jsx PLATFORM_VARS),
   the same tokens RegistrationFlow reads for the public signup flow — so this
   page picks up the same look with zero new theming. */
const V = {
  bg: "var(--tenant-bg, #F3F8F5)", surface: "#FFFFFF", surface2: "rgba(var(--tenant-accent-rgb, 4,120,87), .08)",
  line: "rgba(16,42,35,.10)",
  ink: "var(--tenant-primary, #102A23)", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "var(--tenant-accent, #047857)", primary2: "var(--pf-accent-2, #065F46)",
  glow: "var(--tenant-accent-light, #10B981)", success: "#059669",
};
const font = "'Outfit', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const mono = "'JetBrains Mono', monospace";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&display=swap');
.lc-page h1,.lc-page h2,.lc-page h3{font-family:'Fraunces','Outfit',Georgia,serif!important;letter-spacing:-0.015em}
.lc-page h1,.lc-page h2{font-weight:500!important}
.lc-page button,.lc-page input,.lc-page textarea,.lc-page [class*="rounded"],.lc-page [class*="border"]{border-radius:0 !important}
.lc-uline{width:100%;background:transparent;border:0;border-bottom:1px solid rgba(16,42,35,.18);padding:10px 2px;font-size:14px;color:var(--tenant-primary,#102A23);outline:none;transition:border-color .3s,box-shadow .3s}
.lc-uline::placeholder{color:#9aada4}
.lc-uline:focus{border-bottom-color:var(--tenant-accent,#047857);box-shadow:0 1px 0 0 var(--tenant-accent,#047857)}
.lc-submit{position:relative;overflow:hidden;transition:transform .3s}
.lc-submit:hover{transform:translateY(-1px)}
.lc-submit::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.5) 50%,transparent 65%);transform:translateX(-120%);transition:transform 1s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.lc-submit:hover::before{transform:translateX(120%)}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

const Label = ({ children }) => <label className="mb-1 block text-[13px] font-semibold" style={{ color: V.ink }}>{children}</label>;
const Err = ({ children }) => (children ? <p className="mt-1.5 text-xs text-red-500">{children}</p> : null);

/* Same animated dropdown as RegistrationFlow.jsx, for a pixel-consistent feel. */
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
        <span>{selected?.label || "Select…"}</span>
        <ChevronDown className="h-4 w-4 transition-transform duration-300" style={{ color: V.inkFaint, transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto border bg-white shadow-xl" style={{ borderColor: V.line }}>
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

const BILLING_OPTIONS = [{ value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual" }];
const FALLBACK_PLANS = [{ key: "essentials", name: "Essentials" }, { key: "professional", name: "Professional" }, { key: "enterprise", name: "Enterprise" }];
const REVENUE_OPTIONS = [
  { value: "0-500", label: "$0 – $500" },
  { value: "500-5000000", label: "$500 – $5,000,000" },
  { value: "5000000+", label: "$5,000,000+" },
];
const CHARITY_OPTIONS = [{ value: "general", label: "General charity" }, { value: "muslim", label: "Muslim charity" }];
const slugify = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// Same mapping leadConversion.js's toRevenueRange() applies server-side — used
// here only to pick a sensible starting point from what the lead already told
// us; the operator's own choice always wins once they touch the dropdown.
function guessRevenueRange(annualBudgetRange) {
  if (annualBudgetRange === "5m_plus") return "5000000+";
  if (annualBudgetRange === "250k_1m" || annualBudgetRange === "1m_5m") return "500-5000000";
  return "0-500";
}

/* Large selectable card — used for both the conversion-mode and billing-method choices. */
function ChoiceCard({ active, onClick, icon: Icon, title, desc }) {
  return (
    <button type="button" onClick={onClick} className="flex-1 border p-4 text-left transition-all"
      style={active ? { borderColor: V.primary, background: V.surface2, boxShadow: `0 10px 24px -16px ${V.primary}` } : { borderColor: V.line }}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center" style={active ? { background: V.primary, color: "#fff" } : { background: V.surface2, color: V.primary }}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[14px] font-semibold" style={{ color: V.ink }}>{title}</span>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: V.inkFaint }}>{desc}</p>
    </button>
  );
}

/* Embedded card entry — mirrors RegistrationFlow.jsx's PaymentInner. */
function ChargeCardInner({ priceLabel, onPaid, onBack }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState("");

  const pay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setErr("");
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) { setErr(error.message || "Payment failed. Please check the card details."); setPaying(false); return; }
    if (paymentIntent && ["succeeded", "processing"].includes(paymentIntent.status)) await onPaid();
    else { setErr("Payment was not completed."); setPaying(false); }
  };

  return (
    <div>
      <PaymentElement options={{ layout: "tabs" }} />
      {err && <p className="mt-3 text-xs text-red-500">{err}</p>}
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onBack} disabled={paying} className="flex flex-1 items-center justify-center gap-2 border py-3.5 text-[14px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ borderColor: V.line, color: V.ink }}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button type="button" onClick={pay} disabled={paying || !stripe} className="lc-submit group flex flex-[1.4] items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white disabled:opacity-60" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>
          {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>Charge {priceLabel} &amp; activate <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></>}
        </button>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px]" style={{ color: V.inkFaint }}>
        <Shield className="h-3 w-3" style={{ color: V.success }} /> Secured by Stripe · card details never touch this server
      </p>
    </div>
  );
}

export default function LeadConvert() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(superadminService.getCachedLead(id));
  const [loading, setLoading] = useState(!lead);
  const [error, setError] = useState(null);

  useEffect(() => {
    superadminService
      .loadLead(id)
      .then((l) => { setLead(l); setError(null); })
      .catch((e) => setError(e?.response?.data?.error || "Couldn't load this lead."))
      .finally(() => setLoading(false));
  }, [id]);

  const [mode, setMode] = useState("activation_link");
  const [billingMode, setBillingMode] = useState("comp");
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState(null);
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [plan, setPlan] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [isMuslimCharity, setIsMuslimCharity] = useState(false);
  const [revenueRange, setRevenueRange] = useState("0-500");
  const [theme, setTheme] = useState("default");
  const [themeCat, setThemeCat] = useState(themeCategories[0]?.id || "warm");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [isComp, setIsComp] = useState(true);
  const [compReason, setCompReason] = useState("Converted from lead (manual provisioning)");

  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [chargeState, setChargeState] = useState(null);
  const [result, setResult] = useState(null);

  // Seed the form once the lead loads — every field Registration itself
  // collects, prefilled from what the lead already told us where we have it.
  useEffect(() => {
    if (!lead) return;
    setOrgName(lead.orgName || "");
    setSlug(slugify(lead.orgName));
    setAdminName(lead.contactName || "");
    setAdminEmail(lead.contactEmail || "");
    setPlan(lead.interestedPlan || "essentials");
    setBillingCycle(lead.interestedBillingCycle || "monthly");
    setIsMuslimCharity(lead.verticalType === "muslim");
    setRevenueRange(guessRevenueRange(lead.annualBudgetRange));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?._id]);

  useEffect(() => {
    tenantService.getPublicPlans().then((r) => {
      const list = (Array.isArray(r.data) ? r.data : []).map((p) => ({ key: p.code, name: p.name }));
      if (list.length) { setPlans(list); setPlan((cur) => (cur && list.some((p) => p.key === cur) ? cur : list[0].key)); }
    }).catch(() => {});
  }, []);

  useEffect(() => { if (!slugTouched) setSlug(slugify(orgName)); }, [orgName, slugTouched]);

  useEffect(() => {
    if (mode !== "manual_provision" || !slug || slug.length < 3) { setSlugStatus(null); return; }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try { const r = await tenantService.checkSlug(slug); setSlugStatus(r.data.available ? "ok" : "taken"); }
      catch { setSlugStatus(null); }
    }, 300);
    return () => clearTimeout(t);
  }, [slug, mode]);

  useEffect(() => {
    const email = adminEmail.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailStatus(null); return; }
    setEmailStatus("checking");
    const t = setTimeout(async () => {
      try { const r = await tenantService.checkEmail(email); setEmailStatus(r.data.available ? "ok" : "taken"); }
      catch { setEmailStatus(null); }
    }, 400);
    return () => clearTimeout(t);
  }, [adminEmail]);

  const progressRef = useRef(null);
  useEffect(() => {
    if (!progressRef.current) return;
    const pct = result ? 100 : chargeState ? 75 : 45;
    const tween = gsap.to(progressRef.current, { width: `${pct}%`, duration: 0.6, ease: "power2.out" });
    return () => tween.kill();
  }, [chargeState, result]);

  const { platform } = useTenant();
  const stripeKey = platform?.stripe?.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
  const stripePromise = useMemo(() => getStripePromise(stripeKey), [stripeKey]);
  const platformLoaded = !!platform;

  const handleLogoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await tenantService.uploadRegistrationLogo(fd);
      setLogoUrl(res.data.logoUrl);
    } catch {
      toast.error("Logo upload failed, try again");
      setLogoFile(null);
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  };
  const removeLogo = () => { setLogoFile(null); setLogoPreview(null); setLogoUrl(""); };

  const fieldsValid = orgName.trim() && adminName.trim() && /\S+@\S+\.\S+/.test(adminEmail) && emailStatus !== "taken";
  const buildBody = () => ({
    orgName: orgName.trim(), adminName: adminName.trim(), adminEmail: adminEmail.trim().toLowerCase(), slug, plan, billingCycle,
    isMuslimCharity, revenueRange, theme, logoUrl: logoUrl || undefined, couponCode: couponInput.trim() || undefined,
  });

  const runSubmit = async (fn) => {
    setSubmitting(true);
    try { await fn(); }
    catch (e) { toast.error(e?.response?.data?.error || "Failed to convert lead"); setConfirming(false); }
    finally { setSubmitting(false); }
  };

  // The server sends the email itself, best-effort — a failed relay doesn't
  // fail the conversion (the org/link is still created), so it can't surface
  // as a caught error. `emailStatus` is how the operator finds out instead of
  // assuming delivery from the "success" toast alone.
  const submitActivationLink = () => runSubmit(async () => {
    const res = await superadminService.convertLead(id, { mode: "activation_link", ...buildBody() });
    setResult({ link: res.data.link, resultKind: "activation_link", emailStatus: res.data.emailStatus });
    if (res.data.emailStatus === "failed") toast.error(`Link created, but the email to ${adminEmail} failed to send`);
    else toast.success("Activation link sent");
  });
  const submitComp = () => runSubmit(async () => {
    const res = await superadminService.convertLead(id, { mode: "manual_provision", billingMode: "comp", ...buildBody(), isComp: true, compReason });
    setResult({ organisation: res.data.organisation, resultKind: "comp", emailStatus: res.data.emailStatus });
    if (res.data.emailStatus === "failed") toast.error(`Organisation created, but the welcome email to ${adminEmail} failed to send`);
    else toast.success("Organisation created");
  });
  const submitChargeNow = () => runSubmit(async () => {
    const res = await superadminService.convertLead(id, { mode: "manual_provision", billingMode: "charge_now", ...buildBody() });
    setChargeState({ organisation: res.data.organisation, clientSecret: res.data.clientSecret });
  });
  const submitSendLink = () => runSubmit(async () => {
    const res = await superadminService.convertLead(id, { mode: "manual_provision", billingMode: "send_link", ...buildBody() });
    setResult({ link: res.data.link, resultKind: "send_link", emailStatus: res.data.emailStatus });
    if (res.data.emailStatus === "failed") toast.error(`Link created, but the email to ${adminEmail} failed to send`);
    else toast.success("Payment link sent");
  });
  const handlePaid = async () => {
    try { await tenantService.confirmRegistration(chargeState.organisation.slug); } catch { /* webhook is the safety net */ }
    setResult({ organisation: chargeState.organisation, resultKind: "charge_now" });
    toast.success("Payment received — organisation is live");
  };

  const handlePrimary = () => {
    if (!confirming) { setConfirming(true); return; }
    if (mode === "activation_link") return submitActivationLink();
    if (billingMode === "comp") return submitComp();
    if (billingMode === "charge_now") return submitChargeNow();
    return submitSendLink();
  };

  if (loading) return <div className="flex h-[70vh] items-center justify-center"><TabLoader label="Loading lead…" /></div>;
  if (error) return <SAErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!lead) return null;

  const planOptions = plans.map((p) => ({ value: p.key, label: p.name }));
  const selectedPlanName = plans.find((p) => p.key === plan)?.name || plan;

  return (
    <div className="lc-page relative min-h-screen" style={{ fontFamily: font, background: V.bg, color: V.ink }}>
      <style>{css}</style>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(15,23,42,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)" }} />

      <div className="relative z-[1]">
        <div className="grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-3">

          {/* ═══ LEFT — dark context panel ═══ */}
          <div className="relative overflow-hidden p-8 text-white sm:p-10" style={{ background: "linear-gradient(155deg, var(--tenant-primary, #102A23) 0%, #0A1A14 100%)" }}>
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 border-2" style={{ borderColor: "rgba(255,255,255,.10)" }} />
            <div aria-hidden className="pointer-events-none absolute bottom-24 right-7 h-14 w-24 opacity-[.16]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.9) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
            <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-2 w-16" style={{ background: V.glow }} />

            <div className="relative flex h-full flex-col">
              <button type="button" onClick={() => navigate(`/leads/${id}`)} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white/60 transition-colors hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to lead
              </button>

              <span className="mt-9 inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/55" style={{ fontFamily: mono }}>
                <span className="h-1.5 w-1.5" style={{ background: V.glow }} /> Convert lead
              </span>
              <h1 className="mt-4 text-[clamp(24px,2.8vw,33px)] font-semibold leading-[1.05] text-white">
                Turn {lead.orgName} into a tenant.
              </h1>
              <p className="mt-3 max-w-[34ch] text-[14px] leading-relaxed text-white/70">
                Same fields as self-serve Registration, pre-filled from what {lead.contactName?.split(" ")[0] || "they"} already told us — correct anything before converting.
              </p>

              {/* Lead recap */}
              <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                <div className="flex items-center gap-3 text-[13px] text-white/75">
                  <User className="h-3.5 w-3.5 shrink-0 text-white/40" /> {lead.contactName} · {lead.contactEmail}
                </div>
                {lead.interestedPlan ? (
                  <div className="flex items-center gap-3 text-[13px] text-white/75">
                    <Target className="h-3.5 w-3.5 shrink-0 text-white/40" /> Interested in {lead.interestedPlan}{lead.interestedBillingCycle ? ` · ${lead.interestedBillingCycle}` : ""}
                  </div>
                ) : null}
                {lead.timeline ? (
                  <div className="flex items-center gap-3 text-[13px] text-white/75">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-white/40" /> Timeline: {timelineLabel(lead.timeline)}
                  </div>
                ) : null}
                <div className="flex items-center gap-3 text-[13px] text-white/75">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-white/40" /> Submitted {new Date(lead.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>

              <div className="mt-auto pt-9">
                <div className="h-[3px] w-full overflow-hidden" style={{ background: "rgba(255,255,255,.12)" }}>
                  <div ref={progressRef} className="h-full" style={{ width: "45%", background: `linear-gradient(90deg, ${V.glow}, #fff)` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT — form / payment / success ═══ */}
          <div className="relative bg-white p-7 pt-10 sm:p-10 lg:col-span-2">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-[520px] flex-col items-center py-10 text-center">
                  <div className="mb-5 grid h-16 w-16 place-items-center" style={{ background: "rgba(5,150,105,.14)", border: "1px solid rgba(5,150,105,.3)" }}>
                    <CheckCircle className="h-8 w-8" style={{ color: V.success }} />
                  </div>
                  {result.link ? (
                    <>
                      <h2 className="text-[clamp(20px,2.2vw,25px)] font-semibold" style={{ color: V.ink }}>
                        {result.resultKind === "send_link" ? "Payment link sent" : "Activation link sent"}
                      </h2>
                      <p className="mt-2 max-w-[42ch] text-[14px] leading-relaxed" style={{ color: V.inkSoft }}>
                        {result.resultKind === "send_link"
                          ? `${adminEmail} received an email to complete payment — the org is already configured, so they'll land straight on the payment step.`
                          : `${adminEmail} received an email with a pre-filled link to finish setting up their portal.`}
                      </p>
                      {result.emailStatus === "failed" && (
                        <div className="mt-4 flex w-full items-start gap-2 border p-3 text-left text-[13px]" style={{ borderColor: "#FDE68A", background: "#FFFBEB", color: "#92400E" }}>
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>The email to {adminEmail} failed to send — copy the link below and share it with them directly.</span>
                        </div>
                      )}
                      <div className="mt-5 flex w-full items-center gap-2 border p-3 text-left text-[12.5px]" style={{ borderColor: V.line, color: V.inkSoft }}>
                        <span className="min-w-0 flex-1 truncate">{result.link}</span>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(result.link); toast.success("Copied"); }} className="shrink-0 transition-colors hover:opacity-70" style={{ color: V.primary }} title="Copy link">
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-[clamp(20px,2.2vw,25px)] font-semibold" style={{ color: V.ink }}>Organisation created</h2>
                      <p className="mt-2 max-w-[42ch] text-[14px] leading-relaxed" style={{ color: V.inkSoft }}>
                        <strong style={{ color: V.ink }}>{result.organisation?.name}</strong> is live.{" "}
                        {result.emailStatus === "failed"
                          ? `We couldn't send the "set your password" email automatically.`
                          : result.resultKind === "comp" ? `A "set your password" email was sent to ${adminEmail}.` : "Payment received — a welcome email with a set-password link was sent."}
                      </p>
                      {result.emailStatus === "failed" && (
                        <div className="mt-4 flex w-full items-start gap-2 border p-3 text-left text-[13px]" style={{ borderColor: "#FDE68A", background: "#FFFBEB", color: "#92400E" }}>
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Have {adminEmail} use &ldquo;Forgot password&rdquo; on the login page to set their password, or check the server mail logs.</span>
                        </div>
                      )}
                      <Link to={`/organisations/${result.organisation?._id}`} className="lc-submit group mt-6 inline-flex items-center gap-2 px-6 py-3 text-[14px] font-semibold text-white" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>
                        View organisation <ExternalLink className="h-4 w-4" />
                      </Link>
                    </>
                  )}
                  <button type="button" onClick={() => navigate(`/leads/${id}`)} className="mt-5 text-[13.5px] font-medium" style={{ color: V.inkFaint }}>
                    ← Back to lead
                  </button>
                </motion.div>
              ) : chargeState ? (
                <motion.div key="payment" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }} className="mx-auto w-full max-w-[520px]">
                  <h2 className="text-[clamp(21px,2.4vw,27px)] font-semibold" style={{ color: V.ink }}>Charge {chargeState.organisation.name}</h2>
                  <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>Enter the card to activate this organisation immediately.</p>

                  <div className="mt-5 flex items-center justify-between border p-4 text-[13.5px]" style={{ borderColor: V.line, background: V.surface2 }}>
                    <span style={{ color: V.inkSoft }}>{selectedPlanName} · {billingCycle === "annual" ? "Annual" : "Monthly"}</span>
                  </div>

                  <div className="mt-6">
                    {!stripePromise ? (
                      !platformLoaded ? (
                        <div className="flex items-center gap-2 text-sm" style={{ color: V.inkFaint }}><Loader2 className="h-4 w-4 animate-spin" /> Preparing secure checkout…</div>
                      ) : (
                        <p className="text-sm text-red-500">Card payments aren&apos;t set up yet — add the platform&apos;s Stripe keys under Platform&nbsp;&rarr;&nbsp;Stripe.</p>
                      )
                    ) : (
                      <Elements stripe={stripePromise} options={{ clientSecret: chargeState.clientSecret, appearance: { theme: "stripe", variables: { borderRadius: "0px", fontFamily: "Outfit, sans-serif", colorPrimary: "#047857" } } }}>
                        <ChargeCardInner priceLabel={`${selectedPlanName} · ${billingCycle}`} onPaid={handlePaid} onBack={() => setChargeState(null)} />
                      </Elements>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }} className="mx-auto w-full max-w-[560px]">
                  <h2 className="text-[clamp(21px,2.4vw,27px)] font-semibold" style={{ color: V.ink }}>How should this lead convert?</h2>
                  <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>Review the details below, then choose how to bring them on board.</p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <ChoiceCard active={mode === "activation_link"} onClick={() => { setMode("activation_link"); setConfirming(false); }} icon={Link2} title="Send activation link" desc="They complete Registration + payment themselves." />
                    <ChoiceCard active={mode === "manual_provision"} onClick={() => { setMode("manual_provision"); setConfirming(false); }} icon={Building2} title="Manually provision" desc="You set it up — comped, charged now, or a payment link." />
                  </div>

                  <div className="mt-8 space-y-6">
                    <div>
                      <Label>Organisation name</Label>
                      <input type="text" className="lc-uline" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                    </div>

                    {mode === "manual_provision" && (
                      <div>
                        <Label>Web address</Label>
                        <input type="text" className="lc-uline" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} />
                        <div className="mt-1.5 h-4 text-xs">
                          {slugStatus === "checking" && <span className="inline-flex items-center gap-1" style={{ color: V.inkFaint }}><Loader2 className="h-3 w-3 animate-spin" /> Checking…</span>}
                          {slugStatus === "ok" && <span className="inline-flex items-center gap-1 font-medium" style={{ color: V.success }}><Check className="h-3 w-3" /> Available</span>}
                          {slugStatus === "taken" && <span style={{ color: "#D97706" }}>Taken — we&apos;ll suffix it automatically</span>}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <Label>Annual revenue</Label>
                        <Dropdown value={revenueRange} onChange={setRevenueRange} options={REVENUE_OPTIONS} />
                      </div>
                      <div>
                        <Label>Charity type</Label>
                        <Dropdown value={isMuslimCharity ? "muslim" : "general"} onChange={(v) => setIsMuslimCharity(v === "muslim")} options={CHARITY_OPTIONS} />
                      </div>
                    </div>

                    <div>
                      <Label>Organisation logo <span className="font-normal" style={{ color: V.inkFaint }}>(optional)</span></Label>
                      {!logoPreview ? (
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed py-5 transition-colors hover:bg-black/[0.015]" style={{ borderColor: "rgba(16,42,35,.16)" }}>
                          <span className="grid h-9 w-9 place-items-center" style={{ background: V.surface2, color: V.primary }}><Upload className="h-4 w-4" /></span>
                          <span className="text-[13px] font-medium" style={{ color: V.ink }}>Click to upload</span>
                          <span className="text-[11px]" style={{ color: V.inkFaint }}>PNG, JPG, SVG or WebP · max 2MB</span>
                          <input type="file" accept="image/jpeg,image/png,image/svg+xml,image/webp" onChange={handleLogoSelect} className="hidden" />
                        </label>
                      ) : (
                        <div className="flex items-center gap-4 border p-3" style={{ borderColor: V.line }}>
                          <img src={logoPreview} alt="Logo" className="h-12 w-12 border object-contain" style={{ borderColor: V.line, background: V.bg }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium" style={{ color: V.ink }}>{logoFile?.name || "Logo"}</p>
                            <p className="text-[11px]">
                              {logoUploading ? <span className="inline-flex items-center gap-1" style={{ color: V.inkFaint }}><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</span>
                                : logoUrl ? <span className="inline-flex items-center gap-1" style={{ color: V.success }}><Check className="h-3 w-3" /> Uploaded</span> : null}
                            </p>
                          </div>
                          <button type="button" onClick={removeLogo} className="p-1.5 transition-colors hover:bg-black/5"><XIcon className="h-4 w-4" style={{ color: V.inkFaint }} /></button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <Label>Admin name</Label>
                        <input type="text" className="lc-uline" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Admin email</Label>
                        <input type="email" className="lc-uline" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                        <div className="mt-1.5 h-4 text-xs">
                          {emailStatus === "checking" && <span className="inline-flex items-center gap-1" style={{ color: V.inkFaint }}><Loader2 className="h-3 w-3 animate-spin" /> Checking…</span>}
                          {emailStatus === "ok" && <span className="inline-flex items-center gap-1 font-medium" style={{ color: V.success }}><Check className="h-3 w-3" /> Available</span>}
                          {emailStatus === "taken" && <span className="text-red-500">An account with this email already exists</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <Label>Plan</Label>
                        <Dropdown value={plan} onChange={setPlan} options={planOptions} />
                      </div>
                      <div>
                        <Label>Billing</Label>
                        <Dropdown value={billingCycle} onChange={setBillingCycle} options={BILLING_OPTIONS} />
                      </div>
                    </div>

                    <div>
                      <Label>Theme</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {themeCategories.map((cat) => (
                          <button key={cat.id} type="button" onClick={() => setThemeCat(cat.id)}
                            className="whitespace-nowrap px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                            style={themeCat === cat.id ? { background: V.ink, color: "#fff" } : { background: V.surface2, color: V.inkSoft, border: `1px solid ${V.line}` }}>
                            {cat.name}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {themeCategories.find((c) => c.id === themeCat)?.themes.map((t) => {
                          const sel = theme === t.id;
                          return (
                            <button key={t.id} type="button" onClick={() => setTheme(t.id)} title={t.desc}
                              className="flex items-center gap-1.5 border px-2 py-1.5 text-[11px] transition-colors"
                              style={sel ? { borderColor: V.primary, background: V.surface2, color: V.primary, fontWeight: 600 } : { borderColor: V.line, color: V.inkSoft }}>
                              <span className="flex gap-0.5">
                                <span className="h-3 w-3" style={{ background: t.primary }} />
                                <span className="h-3 w-3" style={{ background: t.accent }} />
                              </span>
                              {t.name}
                              {sel && <Check className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(mode === "activation_link" || billingMode !== "comp") && (
                      <div>
                        <Label>Discount code <span className="font-normal" style={{ color: V.inkFaint }}>(optional)</span></Label>
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 shrink-0" style={{ color: V.inkFaint }} />
                          <input type="text" className="lc-uline" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="e.g. WELCOME20" />
                        </div>
                      </div>
                    )}

                    {mode === "activation_link" ? (
                      <p className="text-[12.5px] leading-relaxed" style={{ color: V.inkFaint }}>
                        Emails {adminEmail || "the lead"} a link into the normal self-serve signup, pre-filled with the details above. The lead stays open until they finish.
                      </p>
                    ) : (
                      <div className="space-y-4 border-t pt-6" style={{ borderColor: V.line }}>
                        <Label>Billing method</Label>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <ChoiceCard active={billingMode === "comp"} onClick={() => { setBillingMode("comp"); setConfirming(false); }} icon={Building2} title="Comped" desc="Free, active immediately." />
                          <ChoiceCard active={billingMode === "charge_now"} onClick={() => { setBillingMode("charge_now"); setConfirming(false); }} icon={CreditCard} title="Charge now" desc="Enter their card on the next step." />
                          <ChoiceCard active={billingMode === "send_link"} onClick={() => { setBillingMode("send_link"); setConfirming(false); }} icon={Mail} title="Send a link" desc="They pay themselves, org's ready." />
                        </div>
                        {billingMode === "comp" && (
                          <div>
                            <Label>Comp reason</Label>
                            <input type="text" className="lc-uline" value={compReason} onChange={(e) => setCompReason(e.target.value)} />
                          </div>
                        )}
                      </div>
                    )}

                    {confirming && (
                      <div className="flex items-start gap-2 border p-4 text-[13px]" style={{ borderColor: "#FDE68A", background: "#FFFBEB", color: "#92400E" }}>
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>
                          {mode === "activation_link" ? "This will email the lead immediately."
                            : billingMode === "comp" ? "This creates a real, active organisation right away — this can't be undone from here."
                            : billingMode === "charge_now" ? "This creates a real Stripe subscription for this org before asking for a card."
                            : "This creates a real Stripe subscription and emails the customer a payment link immediately."}
                          {" "}Confirm to continue.
                        </span>
                      </div>
                    )}

                    <button onClick={handlePrimary} disabled={submitting || !fieldsValid}
                      className="lc-submit group flex w-full items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white disabled:opacity-60"
                      style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 14px 30px -14px ${V.primary}` }}>
                      {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : (
                        <>
                          {confirming ? "Confirm & continue" : mode === "activation_link" ? "Send activation link" : billingMode === "comp" ? "Create organisation" : billingMode === "charge_now" ? "Continue to payment" : "Send payment link"}
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
