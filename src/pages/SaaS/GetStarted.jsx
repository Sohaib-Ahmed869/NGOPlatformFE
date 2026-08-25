import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Building2, User, ClipboardList, Sparkles, Send, ArrowRight, ArrowLeft,
  Check, Loader2, CheckCircle, SkipForward,
} from "lucide-react";
import tenantService from "../../services/tenant.service";
import { useTenant } from "../../context/TenantContext";
import { V, PageStyle } from "./ui";
import {
  CAUSE_AREAS, STAFF_SIZES, BUDGET_RANGES, DONOR_DB_SIZES,
  CURRENT_TOOLS, CHALLENGES, TIMELINES, DECISION_ROLES,
} from "../../config/leadOptions";

const STEPS = [
  { label: "You & your org", icon: Building2, hint: "The basics" },
  { label: "About your org", icon: User, hint: "Help us understand you" },
  { label: "Your setup", icon: ClipboardList, hint: "Optional — 30 seconds" },
  { label: "Your needs", icon: Sparkles, hint: "So we can tailor your demo" },
];

const VERTICAL_OPTIONS = [
  { value: "general", label: "General charity" },
  { value: "muslim", label: "Muslim charity" },
];
const BILLING_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];
const STATIC_PLANS = [
  { key: "basic", name: "Basic" },
  { key: "professional", name: "Professional" },
  { key: "enterprise", name: "Enterprise" },
];

const font = "var(--font-body, 'Outfit', system-ui, sans-serif)";
const mono = "'JetBrains Mono', monospace";

const css = `
.gs-page h1,.gs-page h2{font-weight:500!important}
.gs-page, .gs-page *, .gs-page *::before, .gs-page *::after{border-radius:0 !important}
.gs-uline{width:100%;background:transparent;border:0;border-bottom:1px solid rgba(var(--tenant-primary-rgb),.18);padding:10px 2px;font-size:14px;color:var(--tenant-primary,#102A23);outline:none;transition:border-color .3s,box-shadow .3s}
.gs-uline::placeholder{color:#8AA89C}
.gs-uline:focus{border-bottom-color:var(--tenant-accent,#047857);box-shadow:0 1px 0 0 var(--tenant-accent,#047857)}
textarea.gs-uline{resize:none;line-height:1.6}
.gs-submit{position:relative;overflow:hidden;transition:transform .3s}
.gs-submit:hover{transform:translateY(-1px)}
.gs-submit::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.50) 50%,transparent 65%);transform:translateX(-120%);transition:transform 1s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.gs-submit:hover::before{transform:translateX(120%)}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

const Label = ({ children }) => <label className="mb-1 block text-[13px] font-semibold" style={{ color: V.ink }}>{children}</label>;
const Err = ({ children }) => (children ? <p className="mt-1.5 text-xs text-red-500">{children}</p> : null);

function ChipGroup({ options, value, onChange, multi = false }) {
  const isOn = (v) => (multi ? (value || []).includes(v) : value === v);
  const toggle = (v) => {
    if (multi) {
      const set = new Set(value || []);
      if (set.has(v)) set.delete(v); else set.add(v);
      onChange(Array.from(set));
    } else {
      onChange(v);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = isOn(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold transition-colors"
            style={on ? { background: V.primary, color: "#fff" } : { background: V.surface2, color: V.inkSoft, border: `1px solid ${V.line}` }}
          >
            {on ? <Check className="h-3.5 w-3.5" /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function GetStarted() {
  const [searchParams] = useSearchParams();
  const { platform } = useTenant();
  const brandName = platform?.name || "NGO Platform";
  // Panel is dark, so prefer the light logo and fall back to the dark one —
  // mirrors RegistrationFlow / SaaSNavbar.
  const brandLogo = platform?.logo || platform?.logoDark || "";

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [plans, setPlans] = useState(STATIC_PLANS);
  const [honeypot, setHoneypot] = useState("");
  const formLoadedAt = useRef(Date.now());

  const [form, setForm] = useState({
    orgName: "", contactName: "", contactEmail: "", contactPhone: "", country: "",
    verticalType: "general", causeAreas: [], staffSize: "", annualBudgetRange: "", donorDatabaseSize: "",
    currentTools: [], currentToolsOther: "", challenges: [], challengesOther: "", message: "",
    interestedPlan: searchParams.get("plan") || "",
    interestedBillingCycle: searchParams.get("billing") || "monthly",
    timeline: "", decisionRole: "", consentToContact: false,
  });
  const up = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    tenantService.getPublicPlans()
      .then((r) => {
        const list = (Array.isArray(r.data) ? r.data : []).map((p) => ({ key: p.code, name: p.name }));
        if (list.length) {
          setPlans(list);
          setForm((f) => (f.interestedPlan && list.some((p) => p.key === f.interestedPlan) ? f : { ...f, interestedPlan: list[0].key }));
        }
      })
      .catch(() => {});
  }, []);

  const progressRef = useRef(null);
  useEffect(() => {
    if (!progressRef.current) return;
    const pct = ((step + 1) / STEPS.length) * 100;
    const tween = gsap.to(progressRef.current, { width: `${pct}%`, duration: 0.6, ease: "power2.out" });
    return () => tween.kill();
  }, [step]);

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.orgName.trim()) e.orgName = "Required";
      if (!form.contactName.trim()) e.contactName = "Required";
      if (!form.contactEmail.trim()) e.contactEmail = "Required";
      else if (!/\S+@\S+\.\S+/.test(form.contactEmail)) e.contactEmail = "Invalid email";
    }
    if (step === 1) {
      if (!form.causeAreas.length) e.causeAreas = "Pick at least one";
      if (!form.staffSize) e.staffSize = "Required";
      if (!form.annualBudgetRange) e.annualBudgetRange = "Required";
      if (!form.donorDatabaseSize) e.donorDatabaseSize = "Required";
    }
    if (step === 3) {
      if (!form.timeline) e.timeline = "Required";
      if (!form.decisionRole) e.decisionRole = "Required";
      if (!form.consentToContact) e.consentToContact = "Please confirm we can contact you";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  const next = () => { if (validate()) { setDir(1); setStep((s) => s + 1); } };
  const prev = () => { setDir(-1); setStep((s) => s - 1); };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrors((p) => ({ ...p, submit: undefined }));
    try {
      await tenantService.submitLead({
        ...form,
        companyWebsite2: honeypot,
        formLoadedAt: formLoadedAt.current,
        source: "get_started_form",
        referrerUrl: document.referrer || "",
        landingPage: window.location.pathname + window.location.search,
        utm: {
          source: searchParams.get("utm_source") || "",
          medium: searchParams.get("utm_medium") || "",
          campaign: searchParams.get("utm_campaign") || "",
          term: searchParams.get("utm_term") || "",
          content: searchParams.get("utm_content") || "",
        },
      });
      setSent(true);
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const slide = {
    initial: { opacity: 0, x: dir > 0 ? 40 : -40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: dir > 0 ? -40 : 40 },
    transition: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] },
  };

  const planOptions = useMemo(() => plans.map((p) => ({ value: p.key, label: p.name })), [plans]);

  return (
    <div className="gs-page relative min-h-screen" style={{ fontFamily: font, background: V.bg, color: V.ink, overflowX: "hidden" }}>
      <PageStyle />
      <style>{css}</style>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(15,23,42,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)" }} />

      <div className="relative z-[1]">
        {/* Full-page split — same shell as the org registration flow: brand panel = 1/3, form = 2/3 */}
        <div className="grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-3">

          {/* ═══ LEFT — dark brand panel + stepper ═══ */}
          <div className="relative overflow-hidden p-8 text-white sm:p-10" style={{ background: "linear-gradient(155deg, var(--tenant-primary, #102A23) 0%, #0A1A14 100%)" }}>
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 border-2" style={{ borderColor: "rgba(255,255,255,.10)" }} />
            <div aria-hidden className="pointer-events-none absolute bottom-6 right-8 h-16 w-28 opacity-[.16]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.9) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
            <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-2 w-16" style={{ background: V.glow }} />

            <div className="relative flex h-full flex-col">
              <Link to="/" className="inline-flex items-center gap-2.5">
                {brandLogo ? (
                  <img src={brandLogo} alt={brandName} className="h-9 w-auto max-w-[170px] object-contain" />
                ) : (
                  <>
                    <span className="grid h-9 w-9 place-items-center text-[15px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${V.primary2}, ${V.primary})` }}>
                      {brandName.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-[17px] font-bold tracking-tight text-white">{brandName}</span>
                  </>
                )}
              </Link>

              <span className="mt-9 inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/55" style={{ fontFamily: mono }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: V.glow }} /> Express interest
              </span>
              <h1 className="mt-4 text-[clamp(24px,2.8vw,33px)] font-semibold leading-[1.05] text-white">Let's build your donor portal.</h1>
              <p className="mt-3 max-w-[34ch] text-[14px] leading-relaxed text-white/70">
                Tell us about your organisation and we'll tailor a demo, a plan and pricing to fit. Takes about two minutes.
              </p>

              <nav className="mt-9 space-y-0.5">
                {STEPS.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <div key={s.label} className="flex items-start gap-3.5">
                      <div className="flex flex-col items-center">
                        <motion.div className="grid h-9 w-9 shrink-0 place-items-center text-[13px] font-bold"
                          animate={active ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.4 }}
                          style={done ? { background: "#fff", color: V.primary } : active ? { background: V.glow, color: "#06231b" } : { background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.5)", border: "1px solid rgba(255,255,255,.18)" }}>
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

              <div className="mt-auto pt-9">
                <div className="mb-2 flex items-center justify-between text-[11px] text-white/45">
                  <span style={{ fontFamily: mono }}>Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</span>
                  <Link to="/register" className="transition-colors hover:text-white">Skip — self-serve signup →</Link>
                </div>
                <div className="h-[3px] w-full overflow-hidden" style={{ background: "rgba(255,255,255,.12)" }}>
                  <div ref={progressRef} className="h-full" style={{ width: "25%", background: `linear-gradient(90deg, ${V.glow}, #fff)` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT — white form (2/3) ═══ */}
          <div className="relative bg-white p-7 pt-16 sm:p-10 sm:pt-16 lg:col-span-2">
            <Link to="/" className="absolute right-6 top-6 z-10 inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-opacity hover:opacity-70" style={{ color: V.inkFaint }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>

            {sent ? (
              <motion.div className="mx-auto flex h-full w-full max-w-[560px] flex-col items-center justify-center py-12 text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="mb-5 grid h-16 w-16 place-items-center" style={{ background: "rgba(5,150,105,.14)", border: "1px solid rgba(5,150,105,.3)" }}>
                  <CheckCircle className="h-8 w-8" style={{ color: V.success }} />
                </div>
                <h3 className="mb-2 text-xl font-semibold" style={{ color: V.ink }}>Thanks — we'll be in touch soon.</h3>
                <p className="max-w-sm text-sm" style={{ color: V.inkSoft }}>
                  Someone from our team will reach out to {form.contactEmail} shortly. In the meantime, feel free to explore what {brandName} can do.
                </p>
                <Link to="/plans" className="mt-6 text-sm font-semibold" style={{ color: V.primary }}>See plans & pricing →</Link>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div key={step} {...slide} className="mx-auto w-full max-w-[560px]">

                  {/* honeypot — never visible to a real visitor */}
                  <input
                    type="text"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    name="companyWebsite2"
                    style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                    aria-hidden="true"
                  />

                    {step === 0 && (
                      <div>
                        <h2 className="text-[clamp(20px,2.2vw,25px)] font-semibold" style={{ color: V.ink }}>Tell us about you</h2>
                        <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>We'll use this to reach out and tailor your demo.</p>
                        <div className="mt-7 space-y-6">
                          <div>
                            <Label>Organisation name</Label>
                            <input type="text" className="gs-uline" value={form.orgName} onChange={(e) => up("orgName", e.target.value)} placeholder="Hope Give Foundation" />
                            <Err>{errors.orgName}</Err>
                          </div>
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                              <Label>Your name</Label>
                              <input type="text" className="gs-uline" value={form.contactName} onChange={(e) => up("contactName", e.target.value)} placeholder="Jane Doe" />
                              <Err>{errors.contactName}</Err>
                            </div>
                            <div>
                              <Label>Work email</Label>
                              <input type="email" className="gs-uline" value={form.contactEmail} onChange={(e) => up("contactEmail", e.target.value)} placeholder="jane@hopegive.org" />
                              <Err>{errors.contactEmail}</Err>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                              <Label>Phone <span className="font-normal" style={{ color: V.inkFaint }}>(optional)</span></Label>
                              <input type="tel" className="gs-uline" value={form.contactPhone} onChange={(e) => up("contactPhone", e.target.value)} placeholder="+1 555 000 0000" />
                            </div>
                            <div>
                              <Label>Country <span className="font-normal" style={{ color: V.inkFaint }}>(optional)</span></Label>
                              <input type="text" className="gs-uline" value={form.country} onChange={(e) => up("country", e.target.value)} placeholder="United States" />
                            </div>
                          </div>
                          <button onClick={next} className="gs-submit group flex w-full items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 14px 30px -14px ${V.primary}` }}>
                            Continue <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 1 && (
                      <div>
                        <h2 className="text-[clamp(20px,2.2vw,25px)] font-semibold" style={{ color: V.ink }}>About your organisation</h2>
                        <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>Helps us recommend the right plan.</p>
                        <div className="mt-7 space-y-6">
                          <div>
                            <Label>Charity type</Label>
                            <ChipGroup options={VERTICAL_OPTIONS} value={form.verticalType} onChange={(v) => up("verticalType", v)} />
                          </div>
                          <div>
                            <Label>Cause areas</Label>
                            <ChipGroup options={CAUSE_AREAS} value={form.causeAreas} onChange={(v) => up("causeAreas", v)} multi />
                            <Err>{errors.causeAreas}</Err>
                          </div>
                          <div>
                            <Label>Staff size</Label>
                            <ChipGroup options={STAFF_SIZES} value={form.staffSize} onChange={(v) => up("staffSize", v)} />
                            <Err>{errors.staffSize}</Err>
                          </div>
                          <div>
                            <Label>Annual budget</Label>
                            <ChipGroup options={BUDGET_RANGES} value={form.annualBudgetRange} onChange={(v) => up("annualBudgetRange", v)} />
                            <Err>{errors.annualBudgetRange}</Err>
                          </div>
                          <div>
                            <Label>Donor database size</Label>
                            <ChipGroup options={DONOR_DB_SIZES} value={form.donorDatabaseSize} onChange={(v) => up("donorDatabaseSize", v)} />
                            <Err>{errors.donorDatabaseSize}</Err>
                          </div>
                          <div className="flex gap-3 pt-1">
                            <button onClick={prev} className="flex flex-1 items-center justify-center gap-2 border py-3.5 text-[14px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ borderColor: V.line, color: V.ink }}>
                              <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                            <button onClick={next} className="gs-submit group flex flex-[1.4] items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>
                              Continue <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-[clamp(20px,2.2vw,25px)] font-semibold" style={{ color: V.ink }}>Your current setup</h2>
                            <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>Totally optional — helps us tailor the demo.</p>
                          </div>
                          <button onClick={next} className="inline-flex shrink-0 items-center gap-1.5 border px-3 py-2 text-xs font-medium transition-colors hover:bg-black/[0.03]" style={{ borderColor: V.line, color: V.inkSoft }}>
                            <SkipForward className="h-3 w-3" /> Skip — I'll tell you on the call
                          </button>
                        </div>
                        <div className="mt-7 space-y-6">
                          <div>
                            <Label>What do you use today?</Label>
                            <ChipGroup options={CURRENT_TOOLS} value={form.currentTools} onChange={(v) => up("currentTools", v)} multi />
                            {form.currentTools.includes("other") && (
                              <input type="text" className="gs-uline mt-3" value={form.currentToolsOther} onChange={(e) => up("currentToolsOther", e.target.value)} placeholder="Tell us what you use" />
                            )}
                          </div>
                          <div>
                            <Label>What's been challenging?</Label>
                            <ChipGroup options={CHALLENGES} value={form.challenges} onChange={(v) => up("challenges", v)} multi />
                            {form.challenges.includes("other") && (
                              <input type="text" className="gs-uline mt-3" value={form.challengesOther} onChange={(e) => up("challengesOther", e.target.value)} placeholder="Tell us more" />
                            )}
                          </div>
                          <div>
                            <Label>Anything else? <span className="font-normal" style={{ color: V.inkFaint }}>(optional)</span></Label>
                            <textarea className="gs-uline" rows={3} value={form.message} onChange={(e) => up("message", e.target.value)} placeholder="Tell us a bit more about what you're looking for…" />
                          </div>
                          <div className="flex gap-3 pt-1">
                            <button onClick={prev} className="flex flex-1 items-center justify-center gap-2 border py-3.5 text-[14px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ borderColor: V.line, color: V.ink }}>
                              <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                            <button onClick={next} className="gs-submit group flex flex-[1.4] items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>
                              Continue <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div>
                        <h2 className="text-[clamp(20px,2.2vw,25px)] font-semibold" style={{ color: V.ink }}>Almost there</h2>
                        <p className="mt-2 text-[14px]" style={{ color: V.inkSoft }}>A couple more details and we'll be in touch.</p>
                        <div className="mt-7 space-y-6">
                          <div>
                            <Label>When are you looking to get started?</Label>
                            <ChipGroup options={TIMELINES} value={form.timeline} onChange={(v) => up("timeline", v)} />
                            <Err>{errors.timeline}</Err>
                          </div>
                          <div>
                            <Label>Your role in this decision</Label>
                            <ChipGroup options={DECISION_ROLES} value={form.decisionRole} onChange={(v) => up("decisionRole", v)} />
                            <Err>{errors.decisionRole}</Err>
                          </div>
                          {planOptions.length ? (
                            <div>
                              <Label>Plan you're interested in</Label>
                              <ChipGroup options={planOptions} value={form.interestedPlan} onChange={(v) => up("interestedPlan", v)} />
                            </div>
                          ) : null}
                          <div>
                            <Label>Billing preference</Label>
                            <ChipGroup options={BILLING_OPTIONS} value={form.interestedBillingCycle} onChange={(v) => up("interestedBillingCycle", v)} />
                          </div>

                          <label className="flex cursor-pointer items-start gap-2.5 text-[13px]" style={{ color: V.inkSoft }}>
                            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-current" style={{ accentColor: V.primary }} checked={form.consentToContact} onChange={(e) => up("consentToContact", e.target.checked)} />
                            <span>I agree to be contacted by {brandName} about this enquiry.</span>
                          </label>
                          <Err>{errors.consentToContact}</Err>

                          {errors.submit && <div className="border p-4 text-sm text-red-600" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>{errors.submit}</div>}

                          <div className="flex gap-3 pt-1">
                            <button onClick={prev} disabled={submitting} className="flex flex-1 items-center justify-center gap-2 border py-3.5 text-[14px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ borderColor: V.line, color: V.ink }}>
                              <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                            <button onClick={submit} disabled={submitting} className="gs-submit group flex flex-[1.4] items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-white disabled:opacity-60" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>
                              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <>Express interest <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></>}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

