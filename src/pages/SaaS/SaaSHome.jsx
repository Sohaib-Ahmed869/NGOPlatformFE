import React, { useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  Users, BarChart3, Globe, ArrowRight, CheckCircle,
  TrendingUp, Clock, Lock, Palette, Target,
  CreditCard, Calendar, MapPin, Activity,
} from "lucide-react";

/* ── Violet palette ── */
const V = {
  bg: "#F7F4FB", surface: "#FFFFFF", surface2: "#F2EDF8",
  line: "rgba(28,15,55,.08)", line2: "rgba(28,15,55,.04)",
  ink: "#1A0D2E", inkSoft: "#5B4A7A", inkFaint: "#9D90B5",
  primary: "#7C3AED", primary2: "#6D28D9",
  accent: "#DB2777", accentGlow: "rgba(219,39,119,.20)",
  success: "#059669", danger: "#DC2626",
};

const font = "'Space Grotesk', system-ui, sans-serif";
const mono = "'JetBrains Mono', monospace";

/* ═══════════════════════════════════════════════════════════
   ANIMATION SYSTEM — 8 effects from design spec
   ═══════════════════════════════════════════════════════════ */

/* 1. Scroll-reveal — fade up when 12% visible, one-shot */
const Reveal = ({ children, delay = 0, className = "", style = {} }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 1, delay, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </motion.div>
  );
};

/* Staggered children reveal */
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };
const fadeUpChild = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 1, delay: i * 0.08, ease: [0.2, 0.7, 0.2, 1] } }),
};

/* 2. Magnetic button — follows cursor ~18-25% offset, snaps back */
/* Memoize motion(Link) at module scope — avoids recreating on every render */
const MotionLink = motion(Link);

const MagneticBtn = ({ children, className = "", style = {}, as: Tag = "a", ...props }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 20 });
  const sy = useSpring(y, { stiffness: 200, damping: 20 });

  const handleMove = useCallback((e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left - r.width / 2) * 0.18);
    y.set((e.clientY - r.top - r.height / 2) * 0.25);
  }, [x, y]);

  const handleLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  const Component = Tag === "link" ? MotionLink : motion.a;
  return (
    <Component ref={ref} className={className} style={{ ...style, x: sx, y: sy }}
      onMouseMove={handleMove} onMouseLeave={handleLeave} {...props}>
      {children}
    </Component>
  );
};

/* 4. Gloss sweep — CSS pseudo via injected styles */
/* 5. Arrow nudge — handled via Tailwind group-hover */
/* 8. Status pulse — handled in navbar via CSS animation */

/* ── Injected CSS: keyframes + gloss sweep + reduced-motion ── */
const globalCSS = `
/* Override global index.css h1-h6 font-heading (Cormorant Garamond) for SaaS pages */
.saas-page h1, .saas-page h2, .saas-page h3, .saas-page h4, .saas-page h5, .saas-page h6 {
  font-family: 'Space Grotesk', system-ui, sans-serif !important;
}

@keyframes saas-float1 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes saas-float2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
@keyframes saas-spin { to { transform: rotate(360deg); } }
@keyframes saas-core-spin { to { transform: rotate(360deg); } }

/* 4. Gloss sweep on feature cards */
.saas-card::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.06) 50%, transparent 70%);
  transform: translateX(-110%); transition: transform 1.2s cubic-bezier(.2,.8,.2,1);
  pointer-events: none; z-index: 2;
}
.saas-card:hover::before { transform: translateX(110%); }

/* Gloss sweep on primary buttons */
.saas-btn-primary { position: relative; overflow: hidden; }
.saas-btn-primary::before {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.50) 50%, transparent 65%);
  transform: translateX(-120%); transition: transform 1s cubic-bezier(.2,.8,.2,1);
  pointer-events: none;
}
.saas-btn-primary:hover::before { transform: translateX(120%); }

/* Gloss sweep on widgets when hero-viz hovered */
.saas-widget::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.10) 50%, transparent 65%);
  transform: translateX(-110%); transition: transform 1.2s cubic-bezier(.2,.8,.2,1);
  pointer-events: none;
}
.saas-hero-viz:hover .saas-widget::after { transform: translateX(110%); }

/* 6. Core conic overlay spin */
.saas-core-overlay {
  position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from 90deg, transparent, rgba(255,255,255,.20), transparent 30%);
  mix-blend-mode: overlay;
  animation: saas-core-spin 8s linear infinite;
}

/* Step top accent line */
.saas-step { transition: transform .4s ease, border-color .4s ease, box-shadow .4s ease; }
.saas-step:hover { transform: translateY(-2px); border-color: rgba(124,58,237,.2); box-shadow: 0 12px 28px -12px rgba(124,58,237,.12); }
.saas-step::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(124,58,237,.6), transparent);
  opacity: 0; transition: opacity .4s;
}
.saas-step:hover::before { opacity: 1; }
.saas-step::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.06) 50%, transparent 70%);
  transform: translateX(-110%); transition: transform 1.2s cubic-bezier(.2,.8,.2,1);
  pointer-events: none;
}
.saas-step:hover::after { transform: translateX(110%); }

/* Feature card hover */
.saas-card { transition: transform .4s ease, border-color .4s ease; }
.saas-card:hover { transform: translateY(-2px); border-color: rgba(28,15,55,.16); box-shadow: 0 12px 28px -12px rgba(15,23,42,.14); }

/* Regular (non-featured) price cards */
.saas-price-regular {
  border: 1px solid rgba(28,15,55,.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 4px 16px -4px rgba(124,58,237,.06);
  transition: transform .4s ease, border-color .3s, box-shadow .4s ease;
}
.saas-price-regular:hover {
  transform: translateY(-4px);
  border-color: rgba(124,58,237,.3);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.04),
    0 0 0 1px rgba(124,58,237,.15),
    0 8px 24px -4px rgba(124,58,237,.15),
    0 20px 50px -12px rgba(124,58,237,.12);
}

/* Featured (popular) price card */
.saas-price-featured {
  border: 1px solid rgba(124,58,237,.4);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 0 0 1px rgba(124,58,237,.25),
    0 8px 32px -8px rgba(124,58,237,.3),
    0 24px 60px -20px rgba(124,58,237,.2);
  transition: transform .4s ease, border-color .3s, box-shadow .4s ease;
}
.saas-price-featured:hover {
  transform: translateY(-4px);
  border-color: rgba(124,58,237,.6);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 0 0 1px rgba(124,58,237,.4),
    0 0 40px -4px rgba(124,58,237,.25),
    0 28px 70px -20px rgba(124,58,237,.35);
}

/* Gloss sweep on all price cards */
.saas-price-card { position: relative; overflow: hidden; }
.saas-price-card::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.12) 50%, transparent 70%);
  transform: translateX(-110%); transition: transform 1.2s cubic-bezier(.2,.8,.2,1);
  pointer-events: none; z-index: 2;
}
.saas-price-card:hover::before { transform: translateX(110%); }

/* FAQ plus rotation */
.saas-faq-plus { transition: transform .3s, background .3s, color .3s; }
details[open] .saas-faq-plus { transform: rotate(45deg); background: ${V.accent}; color: ${V.bg}; border-color: transparent; }

/* Browser tilt on hover */
.saas-browser { transform: perspective(1400px) rotateY(-6deg) rotateX(3deg); transition: transform .5s ease; }
.saas-portal-wrap:hover .saas-browser { transform: perspective(1400px) rotateY(-3deg) rotateX(1.5deg); }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

/* ── Mono tag ── */
const MonoTag = ({ children }) => (
  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-[10.5px] tracking-[.08em] uppercase"
    style={{ fontFamily: mono, color: V.inkSoft, background: V.surface, border: `1px solid ${V.line}` }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: V.accent, boxShadow: `0 0 0 3px rgba(219,39,119,.25)` }} />
    {children}
  </span>
);

/* ── Section head ── */
const SectionHead = ({ num, mono: monoText, title, subtitle, center }) => (
  <Reveal className={`mb-16 max-w-[720px] ${center ? "mx-auto text-center" : ""}`}>
    <div className={`flex items-center gap-3.5 mb-4 ${center ? "justify-center" : ""}`}>
      <span className="px-2 py-1 rounded text-xs tracking-[.08em]" style={{ fontFamily: mono, color: V.inkFaint, background: V.surface, border: `1px solid ${V.line}` }}>{num}</span>
      {monoText && <span className="text-[11px] tracking-[.06em] uppercase" style={{ fontFamily: mono, color: V.inkFaint }}>{monoText}</span>}
    </div>
    <h2 className="text-[clamp(34px,4.4vw,56px)] leading-[1.04] font-medium tracking-[-0.03em]" style={{ color: V.ink, fontFamily: font }} dangerouslySetInnerHTML={{ __html: title }} />
    {subtitle && <p className="mt-4 max-w-[540px] text-[16px] leading-relaxed" style={{ color: V.inkSoft }}>{subtitle}</p>}
  </Reveal>
);

/* ── WidgetCard — flow-layout version for 2×2 grid ── */
const WidgetCard = ({ icon, label, value, delta, meta, spark, floatDur, floatDir }) => (
  <div className="saas-widget p-3.5 rounded-xl"
    style={{
      background: `linear-gradient(180deg, rgba(255,255,255,.95), rgba(242,237,248,.95))`,
      backdropFilter: "blur(20px) saturate(140%)", border: `1px solid ${V.line}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(15,23,42,.04), 0 16px 36px -12px rgba(15,23,42,.22)`,
      animation: `${floatDir === "up" ? "saas-float1" : "saas-float2"} ${floatDur}s ease-in-out infinite`,
    }}>
    <div className="flex items-center gap-2 text-[10px] tracking-[.12em] uppercase" style={{ fontFamily: mono, color: V.inkFaint }}>
      <div className="w-[18px] h-[18px] rounded-[5px] grid place-items-center"
        style={{ background: `rgba(219,39,119,.14)`, border: `1px solid rgba(219,39,119,.3)`, color: V.accent, boxShadow: `0 0 12px rgba(219,39,119,.3)` }}>
        {icon}
      </div>
      {label}
    </div>
    <div className="flex items-baseline justify-between gap-2.5 mt-2">
      <span className="text-[22px] font-semibold tracking-tight leading-none" style={{ color: V.ink, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded"
        style={{ fontFamily: mono, color: V.success, background: `rgba(5,150,105,.14)`, border: `1px solid rgba(5,150,105,.3)` }}>{delta}</span>
    </div>
    {spark && (
      <svg className="w-full h-[18px] mt-2" viewBox="0 0 100 20" preserveAspectRatio="none">
        <polyline points={spark} fill="none" stroke={V.accent} strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    )}
    <div className="flex items-center gap-1.5 mt-1.5 text-[9.5px] tracking-[.08em]" style={{ fontFamily: mono, color: V.inkFaint }}>
      <span className="w-[5px] h-[5px] rounded-full" style={{ background: V.accent, boxShadow: `0 0 0 2px rgba(219,39,119,.25)` }} />
      {meta}
    </div>
  </div>
);

/* 3. Parallax hero glows — mousemove shifts glow positions */
const useParallaxGlows = () => {
  const glowARef = useRef(null);
  const glowBRef = useRef(null);
  useEffect(() => {
    let raf = null;
    const handler = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 40;
        const y = (e.clientY / window.innerHeight - 0.5) * 24;
        if (glowARef.current) glowARef.current.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px)`;
        if (glowBRef.current) glowBRef.current.style.transform = `translate(${-x}px, ${-y}px)`;
        raf = null;
      });
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return { glowARef, glowBRef };
};

/* ── Data ── */
const features = [
  { icon: CreditCard, title: "Donation Engine", desc: "One-time, recurring, installment plans. Stripe-native processing with automatic receipts, tax compliance, and reconciliation.", large: true,
    dash: [{ l: "stripe.charge.created", v: "$240.00" }, { l: "recurring.subscription", v: "$50/mo" }, { l: "installment.scheduled", v: "3 × $150" }, { l: "receipt.email.sent", v: "✓" }] },
  { icon: Users, title: "Donor CRM", desc: "Full donor records, communication history, giving patterns, segmentation, and major-donor tracking — scoped per tenant.", tall: true,
    dash: [{ l: "Major donors", v: "23" }, { l: "Recurring", v: "186" }, { l: "First-time", v: "412" }, { l: "Lapsed (30d)", v: "31" }, { l: "Avg. gift", v: "$84" }, { l: "LTV", v: "$720" }] },
  { icon: Palette, title: "Branded Portal", desc: "Custom subdomain, custom theme, your brand throughout. Donors see you, not us.", monoTag: "{slug}.platform.com" },
  { icon: Calendar, title: "Events & RSVPs", desc: "Fundraisers, drives, galas — manage attendees, ticketing, and check-in from one place." },
  { icon: Target, title: "Campaign Programs", desc: "Goal-based campaigns with live progress, donor updates, impact reports." },
  { icon: Lock, title: "Tenant Isolation", desc: "Hard data boundaries per org. SOC 2-aligned access control, audit logs, encryption at rest." },
  { icon: MapPin, title: "Volunteer Ops", desc: "Roles, hours, scheduling, and built-in messaging — coordinate teams without spreadsheets." },
  { icon: Activity, title: "Live Analytics", desc: "Real-time dashboards: donation velocity, donor cohorts, campaign funnels.", hasSpark: true },
];

const steps = [
  { num: "STEP 01", title: "Register & provision", desc: "Pick a plan, claim your subdomain, create your admin account. Tenant provisioned automatically.",
    code: ["$ tenant create --slug=hopebridge", "✓ subdomain registered", "✓ admin user provisioned"] },
  { num: "STEP 02", title: "Configure portal", desc: "Upload your logo, pick a theme, add donation types, launch your first campaign.",
    code: ['branding.theme = "midnight"', 'campaigns.add("Clean Water")', "✓ portal live"] },
  { num: "STEP 03", title: "Accept donations", desc: "Share your portal link. Donations flow into Stripe, receipts go out automatically.",
    code: ["POST /api/donate", "✓ payment.succeeded", "✓ receipt.sent"] },
];

const programs = [
  { title: "Clean Water Initiative", pct: 78, raised: "$38,500", goal: "$50,000", donors: 312, updated: "2h ago" },
  { title: "Education Fund 2026", pct: 45, raised: "$22,500", goal: "$50,000", donors: 184, updated: "1d ago" },
  { title: "Emergency Relief", pct: 92, raised: "$92,000", goal: "$100,000", donors: 538, updated: "4h ago" },
];

const testimonials = [
  { quote: "We switched from a manual spreadsheet system and saw recurring donations increase 40% in the first quarter.", author: "Sarah Mitchell", role: "EXEC DIR · HOPE BRIDGE", initials: "SM" },
  { quote: "The branded portal makes us look professional. Donors trust us more because they see our identity, not a generic payment page.", author: "Ahmed Al-Rahman", role: "OPS MGR · MERCY GLOBAL", initials: "AR" },
  { quote: "Campaign follow-up updates are a game changer. Donors feel connected to impact, and retention has never been higher.", author: "Maria Santos", role: "FUNDRAISING · BRIGHT FUTURE", initials: "MS" },
];

const stats = [
  { label: "Donations processed", value: "10,482", delta: "+12.4% vs last month" },
  { label: "Active organisations", value: "512", delta: "+18 this week" },
  { label: "Total raised", value: "$2.18M", delta: "+8.6% MoM" },
  { label: "Platform uptime", value: "99.98%", delta: "SLA met" },
];

const pricingPlans = [
  { tier: "Basic", desc: "For small organisations getting started.", price: "$29", features: ["Up to 3 campaigns", "Donation processing", "Donor management", "Branded subdomain", "Admin dashboard"] },
  { tier: "Professional", desc: "For growing organisations with active campaigns.", price: "$79", popular: true, features: ["Up to 5 campaigns", "Everything in Basic", "Up to 10 volunteers", "Program follow-ups", "Event management"] },
  { tier: "Enterprise", desc: "For established organisations at scale.", price: "$199", features: ["Unlimited campaigns", "Everything in Pro", "Unlimited volunteers", "Priority support", "Custom integrations"] },
];

const faqs = [
  { q: "Can I switch plans later?", a: "Yes — you can upgrade, downgrade, or cancel at any time. Prorated billing means you only pay for what you use." },
  { q: "What payment methods do my donors get?", a: "Donors can give via credit/debit card, Apple Pay, Google Pay and PayPal. All processed securely through Stripe." },
  { q: "Is there a transaction fee on donations?", a: "We don't charge a platform fee on donations. You only pay standard Stripe processing fees (2.9% + 30¢)." },
  { q: "How does multi-tenancy work?", a: "Each organisation operates in a fully isolated tenant — its own subdomain, branding, donor records, and audit trail. Data never crosses tenant boundaries." },
  { q: "Is donor data safe?", a: "Bank-grade encryption at rest and in transit, role-based access control, audit logs, and SOC 2-aligned practices." },
];

const logoOrgs = ["Hope Bridge", "Mercy Global", "Bright Future", "Atlas Aid", "Northwind Trust"];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function SaaSHome() {
  const { glowARef, glowBRef } = useParallaxGlows(); /* 3. parallax glows */

  /* 6. Hero viz 3D tilt on hover */
  const heroVizRef = useRef(null);
  const vizRotY = useMotionValue(-8);
  const vizRotX = useMotionValue(4);
  const sVizRotY = useSpring(vizRotY, { stiffness: 60, damping: 20 });
  const sVizRotX = useSpring(vizRotX, { stiffness: 60, damping: 20 });

  return (
    <div className="saas-page" style={{ fontFamily: font, background: V.bg, color: V.ink, overflowX: "hidden", position: "relative" }}>
      <style>{globalCSS}</style>

      {/* ══ PAGE-WIDE AMBIENT BACKGROUND ══ */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(15,23,42,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.05) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
      }} />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 .05  0 0 0 0 .05  0 0 0 0 .1  0 0 0 .035 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        mixBlendMode: "multiply", opacity: 0.5,
      }} />

      {/* ══════════════════════════════════
          HERO
      ══════════════════════════════════ */}
      <section className="relative z-[1] overflow-hidden" style={{ padding: "160px 0 80px" }}>
        {/* 3. Parallax glows — drift with cursor */}
        <div className="absolute inset-0 pointer-events-none">
          <div ref={glowARef} className="absolute rounded-full will-change-transform"
            style={{ top: "-10%", left: "50%", width: 800, height: 600, transform: "translateX(-50%)", filter: "blur(90px)", background: `radial-gradient(circle, rgba(124,58,237,.50), transparent 60%)` }} />
          <div ref={glowBRef} className="absolute rounded-full will-change-transform"
            style={{ top: "20%", right: "-10%", width: 500, height: 500, filter: "blur(90px)", background: `radial-gradient(circle, rgba(219,39,119,.40), transparent 60%)` }} />
          <div className="absolute rounded-full"
            style={{ bottom: "-10%", left: "-5%", width: 500, height: 500, filter: "blur(90px)", background: `radial-gradient(circle, rgba(109,40,217,.35), transparent 60%)` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, rgba(247,244,251,.9) 80%, ${V.bg} 100%)` }} />
        </div>

        <div className="relative z-[1] max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-20 items-center"
            onMouseEnter={() => { vizRotY.set(-4); vizRotX.set(2); }}
            onMouseLeave={() => { vizRotY.set(-8); vizRotX.set(4); }}>

            {/* Left: Text */}
            <div>
              <Reveal><MonoTag>Trusted by 500+ organisations</MonoTag></Reveal>

              <Reveal delay={0.2}>
                <h1 className="mt-5 text-[clamp(46px,6vw,84px)] leading-[.98] font-medium tracking-[-0.035em]" style={{ color: V.ink }}>
                  Infrastructure<br />for modern<br />
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${V.primary} 0%, ${V.accent} 100%)` }}>charities.</span>
                </h1>
              </Reveal>

              <Reveal delay={0.35}>
                <p className="mt-6 max-w-[480px] text-[17px] leading-relaxed" style={{ color: V.inkSoft }}>
                  A multi-tenant platform that gives every organisation its own branded portal, donation engine, donor CRM, and campaign tooling — running on shared infrastructure.
                </p>
              </Reveal>

              {/* 2. Magnetic buttons + 4. Gloss sweep + 5. Arrow nudge */}
              <Reveal delay={0.5}>
                <div className="flex flex-wrap gap-2.5 mt-8">
                  <MagneticBtn as="link" to="/plans"
                    className="saas-btn-primary group inline-flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold text-white"
                    style={{
                      background: `linear-gradient(180deg, ${V.primary} 0%, ${V.primary2} 100%)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,.30), inset 0 -1px 0 rgba(0,0,0,.25), 0 1px 2px rgba(0,0,0,.30), 0 12px 32px -8px rgba(124,58,237,.6), 0 0 0 1px rgba(124,58,237,.3)`,
                    }}>
                    Get started <span className="inline-block transition-transform duration-300 group-hover:translate-x-[3px]">→</span>
                  </MagneticBtn>
                  <a href="#features" className="inline-flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-medium transition-all hover:border-[rgba(15,23,42,.16)]"
                    style={{ background: "rgba(255,255,255,.65)", color: V.ink, border: `1px solid ${V.line}`, backdropFilter: "blur(12px)", boxShadow: `inset 0 1px 0 rgba(255,255,255,.95), 0 1px 2px rgba(15,23,42,.03)` }}>
                    Explore platform
                  </a>
                </div>
              </Reveal>
            </div>

            {/* Right: Floating data widgets in 2×2 grid */}
            <Reveal delay={0.4} className="hidden lg:block">
              <motion.div ref={heroVizRef} className="saas-hero-viz grid grid-cols-2 gap-4"
                style={{ perspective: 1200, rotateY: sVizRotY, rotateX: sVizRotX }}>
                <WidgetCard icon={<TrendingUp className="w-[11px] h-[11px]" />} label="donations" value="$48.2K" delta="▲ 24%" meta="live · 24h" spark="0,16 12,14 24,15 36,11 48,12 60,8 72,10 84,5 100,3" floatDur={7} floatDir="up" />
                <WidgetCard icon={<Globe className="w-[11px] h-[11px]" />} label="tenants" value="512" delta="+18" meta="+18 this week" floatDur={8} floatDir="down" />
                <WidgetCard icon={<BarChart3 className="w-[11px] h-[11px]" />} label="campaigns" value="1,284" delta="▲ 8%" meta="active · 42 new" spark="0,15 14,13 28,14 42,9 56,10 70,7 84,8 100,4" floatDur={10} floatDir="down" />
                <WidgetCard icon={<Clock className="w-[11px] h-[11px]" />} label="uptime" value="99.98%" delta="SLA" meta="all regions · ok" floatDur={9} floatDir="up" />
              </motion.div>
            </Reveal>
          </div>

          {/* Stats bar */}
          <Reveal delay={0.2}>
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 rounded-xl overflow-hidden"
              style={{ border: `1px solid ${V.line}`, background: `linear-gradient(180deg, ${V.surface}, rgba(255,255,255,.6))`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.05)` }}>
              {stats.map((s, i) => (
                <div key={i} className="p-7" style={{ borderRight: i < 3 ? `1px solid ${V.line}` : "none" }}>
                  <div className="text-[11px] tracking-[.06em] uppercase mb-3" style={{ fontFamily: mono, color: V.inkFaint }}>{s.label}</div>
                  <div className="text-[40px] font-medium tracking-tight leading-none bg-clip-text text-transparent"
                    style={{ backgroundImage: `linear-gradient(180deg, ${V.ink} 0%, ${V.inkSoft} 100%)` }}>{s.value}</div>
                  <div className="mt-2 text-[11px]" style={{ fontFamily: mono, color: V.success }}>{s.delta}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ TRUSTED ══ */}
      <section className="relative z-[1] py-20">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="text-center mb-7 text-[11px] tracking-[.06em] uppercase" style={{ fontFamily: mono, color: V.inkFaint }}>// Powering charity organisations worldwide</div>
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-5 rounded-[10px] overflow-hidden" style={{ border: `1px solid ${V.line}`, background: V.surface }}>
              {logoOrgs.map((name, i) => (
                <div key={name} className="py-6 px-3 text-center text-sm font-medium opacity-70" style={{ color: V.inkSoft, borderRight: i < 4 ? `1px solid ${V.line}` : "none" }}>{name}</div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FEATURES — cards with 4. gloss sweep ══ */}
      <section id="features" className="relative z-[1] py-28 px-8">
        <div className="max-w-[1280px] mx-auto">
          <SectionHead num="01 / FEATURES" mono="Built for charity ops" title="Every primitive you need.<br/>Composable, fast, multi-tenant." subtitle="A complete fundraising stack — payments, donor CRM, campaigns, events, branded portals — all isolated per organisation." />
          <motion.div className="grid grid-cols-12 gap-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={stagger}>
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeUpChild} custom={i}
                className={`saas-card p-7 rounded-xl relative overflow-hidden ${f.large ? "col-span-12 md:col-span-8" : f.tall ? "col-span-12 md:col-span-4 md:row-span-2" : "col-span-12 md:col-span-4"}`}
                style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                <div className="w-9 h-9 rounded-lg grid place-items-center mb-5" style={{ background: `linear-gradient(180deg, ${V.surface2}, ${V.surface})`, border: `1px solid ${V.line}`, color: V.primary, boxShadow: `inset 0 1px 0 rgba(255,255,255,.08)` }}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight" style={{ color: V.ink }}>{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: V.inkSoft }}>{f.desc}</p>
                {f.monoTag && <div className="mt-4 text-[11px] tracking-[.06em] uppercase" style={{ fontFamily: mono, color: V.inkFaint }}>{f.monoTag}</div>}
                {f.dash && (
                  <div className="mt-6 rounded-lg p-4 text-[11px]" style={{ fontFamily: mono, background: `linear-gradient(180deg, ${V.bg}, ${V.surface})`, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                    {f.dash.map((row, j) => (
                      <div key={j} className="grid grid-cols-[1fr_60px] gap-3 items-center py-2" style={{ borderTop: j > 0 ? `1px dashed ${V.line}` : "none" }}>
                        <div className="flex items-center gap-2" style={{ color: V.inkSoft, fontFamily: font }}>
                          <span className="w-1 h-1 rounded-full" style={{ background: V.accent }} />{row.l}
                        </div>
                        <div className="text-right font-semibold" style={{ color: V.accent }}>{row.v}</div>
                      </div>
                    ))}
                    <div className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ background: V.surface2 }}>
                      <div className="h-full" style={{ width: "72%", background: `linear-gradient(90deg, ${V.primary}, ${V.accent})`, boxShadow: `0 0 8px ${V.accentGlow}` }} />
                    </div>
                  </div>
                )}
                {f.hasSpark && (
                  <svg className="w-full h-[50px] mt-3.5" viewBox="0 0 200 50" preserveAspectRatio="none">
                    <defs><linearGradient id="sfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={V.accent} stopOpacity=".3" /><stop offset="1" stopColor={V.accent} stopOpacity="0" /></linearGradient></defs>
                    <path d="M0,40 L20,32 L40,36 L60,22 L80,28 L100,18 L120,24 L140,12 L160,18 L180,8 L200,14 L200,50 L0,50 Z" fill="url(#sfill)" />
                    <path d="M0,40 L20,32 L40,36 L60,22 L80,28 L100,18 L120,24 L140,12 L160,18 L180,8 L200,14" fill="none" stroke={V.accent} strokeWidth="1.5" />
                  </svg>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS — step cards with top accent line ══ */}
      <section id="how" className="relative z-[1] py-28 px-8">
        <div className="max-w-[1280px] mx-auto">
          <SectionHead num="02 / DEPLOY" mono="From signup to first donation in <3 min" title="Provision your tenant.<br/>Customise. Launch." />
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={stagger}>
            {steps.map((s, i) => (
              <motion.div key={i} variants={fadeUpChild} custom={i} className="saas-step p-7 rounded-xl relative overflow-hidden"
                style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                <span className="inline-block px-2.5 py-1 rounded text-[11px] tracking-[.08em]"
                  style={{ fontFamily: mono, color: V.accent, background: `rgba(219,39,119,.12)`, border: `1px solid rgba(219,39,119,.3)` }}>{s.num}</span>
                <h3 className="mt-5 text-[22px] font-medium tracking-tight" style={{ color: V.ink }}>{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: V.inkSoft }}>{s.desc}</p>
                <div className="mt-6 p-3 rounded-lg text-[11px] space-y-1"
                  style={{ fontFamily: mono, background: V.bg, border: `1px solid ${V.line2}`, color: V.inkSoft, boxShadow: `inset 0 1px 0 rgba(255,255,255,.03)` }}>
                  {s.code.map((line, j) => (
                    <div key={j} style={{ color: line.startsWith("✓") ? V.success : V.inkSoft }}>{line}</div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ PORTAL SHOWCASE — browser with 3D tilt on hover ══ */}
      <section className="relative z-[1] py-28 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="saas-portal-wrap grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 items-center">
            <Reveal>
              <span className="px-2 py-1 rounded text-xs tracking-[.08em]" style={{ fontFamily: mono, color: V.inkFaint, background: V.surface, border: `1px solid ${V.line}` }}>03 / TENANT</span>
              <h2 className="mt-3.5 text-[clamp(32px,3.6vw,48px)] leading-[1.05] font-medium tracking-[-0.025em]" style={{ color: V.ink }}>
                A donor experience that belongs to{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${V.primary}, ${V.accent})` }}>your organisation.</span>
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed max-w-[460px]" style={{ color: V.inkSoft }}>
                Every organisation gets a fully isolated portal at <code className="text-sm" style={{ fontFamily: mono, color: V.accent }}>{"{slug}"}.platform.com</code> — your brand, your data, your donors.
              </p>
              <ul className="mt-7 space-y-0">
                {["Custom subdomain per organisation", "Full brand control: colors, logo, theme", "Isolated donor accounts per tenant", "Tenant-scoped data, audit logs, access control"].map((item) => (
                  <li key={item} className="flex items-start gap-3 py-3.5 text-sm" style={{ borderTop: `1px solid ${V.line}` }}>
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: V.accent }} />
                    <span style={{ color: V.ink }}>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal>
              <div className="saas-browser rounded-xl overflow-hidden"
                style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.95), 0 30px 80px -20px rgba(15,23,42,.18), 0 0 0 1px ${V.line2}` }}>
                <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ background: `linear-gradient(180deg, ${V.surface2}, ${V.surface})`, borderBottom: `1px solid ${V.line}` }}>
                  <div className="w-[11px] h-[11px] rounded-full" style={{ background: "#FF5F57", boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)" }} />
                  <div className="w-[11px] h-[11px] rounded-full" style={{ background: "#FFBD2E", boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)" }} />
                  <div className="w-[11px] h-[11px] rounded-full" style={{ background: "#28C840", boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)" }} />
                  <div className="ml-3 flex-1 max-w-[320px] px-3 py-1 rounded-md text-[11px] flex items-center gap-1.5"
                    style={{ fontFamily: mono, background: V.bg, border: `1px solid ${V.line}`, color: V.inkSoft }}>
                    <Lock className="w-[11px] h-[11px]" style={{ color: V.success }} /> hopebridgefoundation.platform.com
                  </div>
                </div>
                <div className="p-6" style={{ background: V.bg, minHeight: 380 }}>
                  <div className="p-6 rounded-[10px] relative overflow-hidden"
                    style={{ background: `radial-gradient(circle at 80% 0%, rgba(219,39,119,.3), transparent 50%), linear-gradient(135deg, ${V.primary2}, ${V.surface2})`, border: `1px solid ${V.line}`, color: V.ink, boxShadow: `inset 0 1px 0 rgba(255,255,255,.1)` }}>
                    <div className="text-[22px] font-semibold tracking-tight">Hope Bridge Foundation</div>
                    <div className="mt-1.5 text-xs opacity-70" style={{ fontFamily: mono }}>// est.2014 — building bridges of opportunity</div>
                    <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold"
                      style={{ background: V.accent, color: V.bg, boxShadow: `0 0 16px ${V.accentGlow}, inset 0 1px 0 rgba(255,255,255,.3)` }}>
                      Donate now →
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2.5">
                    <div className="p-3.5 rounded-lg text-[11px]" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                      <div style={{ fontFamily: mono, fontSize: "9.5px", color: V.inkFaint }}>// active campaign</div>
                      <div className="mt-1.5 text-[20px] font-medium tracking-tight">Clean Water <span style={{ color: V.accent }}>Initiative</span></div>
                      <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: V.bg, border: `1px solid ${V.line2}` }}>
                        <div className="h-full rounded-full" style={{ width: "78%", background: `linear-gradient(90deg, ${V.primary}, ${V.accent})`, boxShadow: `0 0 8px ${V.accentGlow}` }} />
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg text-[11px]" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                      <div style={{ fontFamily: mono, fontSize: "9.5px", color: V.inkFaint }}>// raised this month</div>
                      <div className="mt-1.5 text-[20px] font-medium tracking-tight">$48,250</div>
                      <div className="mt-1.5" style={{ fontFamily: mono, fontSize: "9.5px", color: V.success }}>↑ +24.3%</div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ PROGRAMS ══ */}
      <section className="relative z-[1] py-28 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
            <Reveal>
              <div className="rounded-xl px-5 py-2" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                {programs.map((p, i) => (
                  <div key={i} className="py-5" style={{ borderTop: i > 0 ? `1px solid ${V.line}` : "none" }}>
                    <div className="flex justify-between items-baseline gap-3">
                      <span className="text-[17px] font-semibold tracking-tight" style={{ color: V.ink }}>{p.title}</span>
                      <span className="text-[13px] font-semibold" style={{ fontFamily: mono, color: V.accent }}>{p.pct}%</span>
                    </div>
                    <div className="mt-1 text-xs" style={{ fontFamily: mono, color: V.inkFaint }}>{p.raised} / {p.goal} · {p.donors} donors · updated {p.updated}</div>
                    <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: V.bg, border: `1px solid ${V.line2}` }}>
                      <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: `linear-gradient(90deg, ${V.primary}, ${V.accent})`, boxShadow: `0 0 8px ${V.accentGlow}` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal>
              <span className="px-2 py-1 rounded text-xs tracking-[.08em]" style={{ fontFamily: mono, color: V.inkFaint, background: V.surface, border: `1px solid ${V.line}` }}>04 / CAMPAIGNS</span>
              <h2 className="mt-3.5 text-[clamp(32px,3.6vw,48px)] leading-[1.05] font-medium tracking-[-0.025em]" style={{ color: V.ink }}>
                Campaigns donors can{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${V.primary}, ${V.accent})` }}>actually follow.</span>
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed max-w-[460px]" style={{ color: V.inkSoft }}>
                Goal-based campaigns with real-time progress tracking. Post follow-up updates — every donor gets notified automatically.
              </p>
              <ul className="mt-7 space-y-0">
                {["Set goals with live progress bars", "Post updates with images & video", "Auto-notify every donor on update", "Final impact reports on close"].map((item, j) => (
                  <li key={item} className="flex items-start gap-3 py-3.5 text-sm" style={{ borderTop: `1px solid ${V.line}` }}>
                    <span className="text-xs" style={{ fontFamily: mono, color: V.accent }}>[0{j + 1}]</span>
                    <span style={{ color: V.ink }}>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="relative z-[1] py-28 px-8">
        <div className="max-w-[1280px] mx-auto">
          <SectionHead num="05 / VOICES" title="Operators love it.<br/>Donors trust it." />
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={stagger}>
            {testimonials.map((t, i) => (
              <motion.div key={i} variants={fadeUpChild} custom={i} className="saas-card p-7 rounded-xl relative overflow-hidden"
                style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                <div className="text-[13px] tracking-[2px]" style={{ color: V.accent }}>★★★★★</div>
                <blockquote className="mt-4 text-[17px] leading-[1.45] font-normal tracking-tight" style={{ color: V.ink }}>"{t.quote}"</blockquote>
                <div className="flex items-center gap-3 mt-5 pt-4" style={{ borderTop: `1px solid ${V.line}` }}>
                  <div className="w-9 h-9 rounded-lg grid place-items-center text-xs font-bold"
                    style={{ background: `linear-gradient(140deg, ${V.primary}, ${V.primary2})`, color: V.bg, boxShadow: `inset 0 1px 0 rgba(255,255,255,.25)` }}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: V.ink }}>{t.author}</div>
                    <div className="text-xs mt-0.5" style={{ fontFamily: mono, color: V.inkFaint }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="relative z-[1] py-28 px-8">
        <div className="max-w-[1280px] mx-auto">
          <SectionHead num="06 / PRICING" title="Pricing built<br/>for organisations of any size." />
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={stagger}>
            {pricingPlans.map((plan, i) => (
              <motion.div key={i} variants={fadeUpChild} custom={i}
                className={`saas-price-card ${plan.popular ? "saas-price-featured" : "saas-price-regular"} p-8 rounded-[14px] relative overflow-hidden`}
                style={{
                  background: plan.popular
                    ? `radial-gradient(circle at 100% 0%, rgba(124,58,237,.3), transparent 50%), linear-gradient(180deg, ${V.surface2}, ${V.surface})`
                    : V.surface,
                }}>
                {plan.popular && (
                  <span className="absolute top-4 right-4 px-2.5 py-1 rounded text-[10px] tracking-[.08em] uppercase font-bold"
                    style={{ fontFamily: mono, background: V.accent, color: V.bg, boxShadow: `0 0 12px ${V.accentGlow}, inset 0 1px 0 rgba(255,255,255,.3)` }}>
                    Popular
                  </span>
                )}
                <div className="text-xl font-semibold tracking-tight" style={{ color: V.ink }}>{plan.tier}</div>
                <div className="mt-1.5 text-[13.5px] leading-relaxed mb-5" style={{ color: V.inkSoft }}>{plan.desc}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[44px] font-medium tracking-tight" style={{ color: V.ink }}>{plan.price}</span>
                  <span className="text-[13px]" style={{ fontFamily: mono, color: V.inkFaint }}>/mo</span>
                </div>
                <ul className="mt-6 mb-7 space-y-0">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 py-2 text-[13.5px]" style={{ color: V.inkSoft }}>
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke={V.accent} strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={`/register?plan=${plan.tier.toLowerCase()}&billing=monthly`}
                  className={`block w-full text-center py-3 rounded-lg text-[13.5px] font-semibold transition-colors ${plan.popular ? "saas-btn-primary" : ""}`}
                  style={plan.popular ? {
                    background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, color: V.bg, border: "1px solid transparent",
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,.3), 0 0 24px rgba(124,58,237,.4)`,
                  } : { background: V.surface2, color: V.ink, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.06)` }}>
                  Get started
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="relative z-[1] py-28 px-8">
        <div className="max-w-[1280px] mx-auto">
          <SectionHead num="07 / FAQ" title="Frequently asked questions" center />
          <div className="max-w-[800px] mx-auto space-y-2">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <details className="rounded-[10px] overflow-hidden" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}
                  {...(i === 0 ? { open: true } : {})}>
                  <summary className="flex justify-between items-center gap-4 px-5 py-5 cursor-pointer text-[16px] font-medium tracking-tight list-none [&::-webkit-details-marker]:hidden" style={{ color: V.ink }}>
                    {faq.q}
                    <span className="saas-faq-plus w-[22px] h-[22px] rounded-md grid place-items-center text-sm shrink-0"
                      style={{ background: V.surface2, border: `1px solid ${V.line}`, color: V.inkSoft }}>+</span>
                  </summary>
                  <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: V.inkSoft }}>{faq.a}</div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BIG CTA ══ */}
      <section className="relative z-[1] pb-28 px-8" style={{ paddingTop: 0 }}>
        <div className="max-w-[1280px] mx-auto">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl text-center px-12 py-24"
              style={{
                background: `radial-gradient(ellipse 60% 80% at 50% 100%, rgba(219,39,119,.25), transparent 70%), radial-gradient(ellipse 80% 80% at 50% 0%, rgba(124,58,237,.40), transparent 70%), linear-gradient(180deg, ${V.surface2}, ${V.surface})`,
                border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.08)`,
              }}>
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: `linear-gradient(rgba(28,15,55,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(28,15,55,.04) 1px, transparent 1px)`,
                backgroundSize: "32px 32px", maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
              }} />
              <h2 className="relative text-[clamp(36px,5vw,64px)] font-medium tracking-[-0.03em] leading-[1.05] max-w-[16ch] mx-auto " style={{ color: V.ink }}>
                Ready to launch your branded portal?
              </h2>
              <p className="relative mt-4 max-w-[480px] mx-auto text-[16px]" style={{ color: V.inkSoft }}>
                Spin up your tenant in under 3 minutes. No credit card required.
              </p>
              <div className="relative inline-flex gap-2.5 mt-8">
                <MagneticBtn as="link" to="/plans"
                  className="saas-btn-primary group inline-flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold text-white"
                  style={{
                    background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,.30), inset 0 -1px 0 rgba(0,0,0,.25), 0 1px 2px rgba(0,0,0,.30), 0 12px 32px -8px rgba(124,58,237,.6), 0 0 0 1px rgba(124,58,237,.3)`,
                  }}>
                  Get started <span className="inline-block transition-transform duration-300 group-hover:translate-x-[3px]">→</span>
                </MagneticBtn>
                <Link to="/plans" className="inline-flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-medium transition-all"
                  style={{ background: "rgba(255,255,255,.65)", color: V.ink, border: `1px solid ${V.line}`, backdropFilter: "blur(12px)", boxShadow: `inset 0 1px 0 rgba(255,255,255,.95), 0 1px 2px rgba(15,23,42,.03)` }}>
                  View pricing
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
