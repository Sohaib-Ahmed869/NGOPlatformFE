import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  motion, AnimatePresence, useInView, useMotionValue, useSpring,
  useReducedMotion, useScroll, useTransform,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Heart, Users, ArrowRight, Check, Sparkles,
  Shield, Palette, Target, CreditCard, Calendar, Megaphone,
  BarChart3, LifeBuoy, Quote, HandHeart, Play, Star, ChevronDown, MessageCircle,
  Rocket, TrendingUp, Camera, Mail,
} from "lucide-react";
import CtaSection from "./CtaSection";

gsap.registerPlugin(ScrollTrigger);

/* ── Brand palette, driven by the platform design tokens (set in App.jsx
   PLATFORM_VARS). Neutrals stay literal; brand hues resolve to the shared
   --tenant-* vars so the whole page themes consistently. ── */
const V = {
  // surface2 = a faint wash of the brand accent (was a hardcoded mint), so the
  // alternating section bands + light fills follow the theme instead of staying green.
  bg: "var(--tenant-bg, #F3F8F5)", surface: "#FFFFFF", surface2: "rgba(var(--tenant-accent-rgb), .08)",
  line: "rgba(var(--tenant-primary-rgb), .10)", line2: "rgba(var(--tenant-primary-rgb), .05)",
  ink: "var(--tenant-primary, #102A23)", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "var(--tenant-accent, #047857)", primary2: "var(--pf-accent-2, #065F46)",
  // `glow` = lighter shade of the brand accent, used as the SECOND stop of the
  // theme gradient (keeps gradients single-hue / on-theme instead of accent→gold).
  glow: "var(--tenant-accent-light, #059669)",
  accent: "var(--pf-gold, #F59E0B)", accentSoft: "var(--pf-gold-soft, #FEF3C7)", accentGlow: "rgba(245,158,11,.22)",
  success: "#059669",
};
const font = "var(--font-body, 'Outfit', system-ui, sans-serif)";

/* ── Animation helpers ── */
const Reveal = ({ children, delay = 0, className = "", style = {} }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.9, delay, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </motion.div>
  );
};

const stagger = { visible: { transition: { staggerChildren: 0.09 } } };
const fadeUpChild = {
  hidden: { opacity: 0, y: 26 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, delay: i * 0.09, ease: [0.2, 0.7, 0.2, 1] } }),
};

const MotionLink = motion(Link);
const MagneticBtn = ({ children, className = "", style = {}, as: Tag = "a", ...props }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 22 });
  const sy = useSpring(y, { stiffness: 220, damping: 22 });
  const move = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left - r.width / 2) * 0.16);
    y.set((e.clientY - r.top - r.height / 2) * 0.2);
  };
  const leave = () => { x.set(0); y.set(0); };
  const Component = Tag === "link" ? MotionLink : motion.a;
  return (
    <Component ref={ref} className={className} style={{ ...style, x: sx, y: sy }}
      onMouseMove={move} onMouseLeave={leave} {...props}>
      {children}
    </Component>
  );
};

/* ── Injected CSS ── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
/* Distinct, editorial display serif for headings (not the generic geometric
   sans every generated landing page ships). Body text stays as-is. */
.saas-page h1,.saas-page h2,.saas-page h3,.saas-page h4,.saas-page h5,.saas-page h6{
  font-family:'Fraunces','Outfit',Georgia,serif !important;
  letter-spacing:-0.015em;
}
/* Sharp, editorial corners everywhere — overrides every Tailwind rounded-*
   utility (and any inline radius) for a crisp, intentional, non-generic look. */
.saas-page [class*="rounded"]{border-radius:0 !important}
@keyframes saas-float1{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes saas-float2{0%,100%{transform:translateY(0)}50%{transform:translateY(10px)}}
@keyframes saas-aurora1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(46px,34px) scale(1.1)}}
@keyframes saas-aurora2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-52px,22px) scale(1.14)}}
@keyframes saas-aurora3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(26px,-32px) scale(1.12)}}
.saas-hero-grain{background-image:radial-gradient(rgba(255,255,255,.5) .5px,transparent .5px);background-size:4px 4px}
.saas-card{transition:transform .4s ease,border-color .4s ease,box-shadow .4s ease}
.saas-card:hover{transform:translateY(-4px);border-color:rgba(var(--tenant-accent-rgb),.28);box-shadow:0 18px 40px -16px rgba(var(--tenant-accent-rgb),.22)}
.saas-btn-primary{position:relative;overflow:hidden}
.saas-btn-primary::before{content:"";position:absolute;inset:0;
  background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%);
  transform:translateX(-120%);transition:transform 1s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.saas-btn-primary:hover::before{transform:translateX(120%)}
.saas-step{transition:transform .4s ease,box-shadow .4s ease}
.saas-step:hover{transform:translateY(-4px);box-shadow:0 18px 40px -16px rgba(var(--tenant-accent-rgb),.2)}
.saas-faq2{transition:transform .35s ease,box-shadow .35s ease,border-color .35s ease,background .35s ease}
.saas-faq2:hover{transform:translateY(-2px)}
.saas-cta-ghost{transition:background .3s ease,border-color .3s ease,transform .3s ease}
.saas-cta-ghost:hover{background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.55)!important;transform:translateY(-2px)}
.saas-ic{transition:transform .35s ease,background .35s ease,color .35s ease,border-color .35s ease}
.saas-card:hover .saas-ic{transform:rotate(-6deg) scale(1.08);background:linear-gradient(150deg,var(--tenant-accent,#047857),var(--tenant-accent-light,#059669));color:#fff;border-color:transparent}
.saas-topline{transform:scaleX(0);transform-origin:left;transition:transform .55s cubic-bezier(.2,.8,.2,1)}
.saas-card:hover .saas-topline,.saas-step:hover .saas-topline{transform:scaleX(1)}
@keyframes saas-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.saas-marquee{animation:saas-marquee 40s linear infinite}
.saas-marquee:hover{animation-play-state:paused}
.saas-logo{opacity:.62;transition:opacity .35s ease}
.saas-logo:hover{opacity:1}
.saas-logo-ic{transition:transform .35s ease,background .35s ease,color .35s ease,border-color .35s ease}
.saas-logo:hover .saas-logo-ic{transform:rotate(-6deg) scale(1.08);background:linear-gradient(150deg,var(--tenant-accent,#047857),var(--tenant-accent-light,#059669));color:#fff;border-color:transparent}
.saas-logo-name{transition:color .35s ease}
.saas-logo:hover .saas-logo-name{color:var(--tenant-primary,#102A23)}
@keyframes saas-prog-shine{0%{transform:translateX(-130%)}55%,100%{transform:translateX(420%)}}
.saas-prog-shine{animation:saas-prog-shine 2.8s ease-in-out infinite}
@keyframes saas-pulse-ring{0%{transform:scale(.85);opacity:.55}80%{opacity:0}100%{transform:scale(2);opacity:0}}
.saas-pulse-ring{animation:saas-pulse-ring 2.1s ease-out infinite}
@keyframes saas-pop-in{0%{transform:scale(0) rotate(-30deg);opacity:0}60%{transform:scale(1.15) rotate(0)}100%{transform:scale(1);opacity:1}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

/* ── Friendly section badge ── */
const Badge = ({ icon: Icon, children, center }) => (
  <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-medium ${center ? "mx-auto" : ""}`}
    style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.primary, boxShadow: "0 1px 2px rgba(6,40,30,.04)" }}>
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </span>
);

const SectionHead = ({ badge, badgeIcon, title, subtitle, center }) => (
  <Reveal className={`mb-14 max-w-[680px] ${center ? "mx-auto text-center" : ""}`}>
    {badge && <Badge icon={badgeIcon} center={center}>{badge}</Badge>}
    <h2 className="mt-5 text-[clamp(30px,4vw,50px)] leading-[1.08] font-bold tracking-[-0.02em]"
      style={{ color: V.ink }} dangerouslySetInnerHTML={{ __html: title }} />
    {subtitle && (
      <p className={`mt-4 text-[16.5px] leading-relaxed ${center ? "mx-auto" : ""} max-w-[560px]`}
        style={{ color: V.inkSoft }}>{subtitle}</p>
    )}
  </Reveal>
);

/* ── Animated single-open FAQ accordion ── */
function FaqItem({ faq, index, isOpen, onToggle }) {
  return (
    <Reveal delay={index * 0.05}>
      <div
        className="saas-faq2 relative overflow-hidden rounded-2xl"
        style={{
          background: isOpen ? `linear-gradient(180deg, rgba(var(--tenant-accent-rgb),.06), ${V.surface})` : V.surface,
          border: `1px solid ${isOpen ? "rgba(var(--tenant-accent-rgb),.35)" : V.line}`,
          boxShadow: isOpen ? "0 20px 44px -22px rgba(var(--tenant-accent-rgb),.4)" : "none",
        }}
      >
        {/* accent rail that appears when the item is open */}
        {isOpen && (
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]"
            style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.glow})` }} />
        )}
        <button onClick={onToggle} aria-expanded={isOpen}
          className="flex w-full items-center gap-4 px-6 py-5 text-left">
          <span className="font-mono text-[12px] font-bold tabular-nums transition-colors"
            style={{ color: isOpen ? V.primary : V.inkFaint }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex-1 text-[16px] font-semibold leading-snug transition-colors"
            style={{ color: isOpen ? V.primary : V.ink }}>
            {faq.q}
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-300"
            style={{
              background: isOpen ? V.primary : V.surface2,
              color: isOpen ? "#fff" : V.primary,
              border: `1px solid ${isOpen ? "transparent" : V.line}`,
              transform: isOpen ? "rotate(180deg)" : "none",
            }}>
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
              style={{ overflow: "hidden" }}>
              <p className="px-6 pb-6 pl-[3.4rem] text-[14.5px] leading-relaxed" style={{ color: V.inkSoft }}>
                {faq.a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

function FaqList({ faqs }) {
  const [open, setOpen] = useState(0); // first item open by default
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <FaqItem key={faq.q} faq={faq} index={i} isOpen={open === i}
          onToggle={() => setOpen((cur) => (cur === i ? -1 : i))} />
      ))}
    </div>
  );
}

/* ── Testimonial avatar with a graceful initials fallback if the image 404s ── */
function ReviewAvatar({ t }) {
  const [err, setErr] = useState(false);
  if (t.img && !err) {
    return (
      <img src={t.img} alt={t.author} loading="lazy" onError={() => setErr(true)}
        className="h-11 w-11 shrink-0 rounded-full object-cover" style={{ border: `2px solid ${V.surface}`, boxShadow: `0 0 0 1px ${V.line}` }} />
    );
  }
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
      style={{ background: `linear-gradient(140deg, ${V.primary}, ${V.primary2})` }}>{t.initials}</div>
  );
}

/* ── A single testimonial card (fixed width for the marquee carousel). ── */
function ReviewCard({ t }) {
  return (
    <article className="saas-card relative mr-5 flex w-[340px] shrink-0 flex-col overflow-hidden p-8 sm:w-[400px]"
      style={{ background: V.surface, border: `1px solid ${V.line}` }}>
      <span aria-hidden className="saas-topline pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }} />
      {/* oversized faint quotation glyph for editorial depth */}
      <Quote aria-hidden className="pointer-events-none absolute right-3 top-5 h-24 w-24" style={{ color: V.accent, opacity: 0.08 }} />
      <div className="relative flex items-center justify-between">
        <Quote className="h-7 w-7" style={{ color: V.accent }} />
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, s) => (
            <Star key={s} className="h-4 w-4" style={{ color: V.accent, fill: V.accent }} />
          ))}
        </div>
      </div>
      {/* The quote is the hero — set large in the editorial serif. */}
      <blockquote className="relative mt-5 flex-1 text-[20px] font-medium leading-[1.42] tracking-[-0.01em]"
        style={{ color: V.ink, fontFamily: "'Fraunces', Georgia, serif" }}>
        {t.quote}
      </blockquote>
      <div className="mt-7 flex items-center gap-3 pt-5" style={{ borderTop: `1px solid ${V.line}` }}>
        <ReviewAvatar t={t} />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold" style={{ color: V.ink }}>{t.author}</div>
          <div className="text-[12.5px]" style={{ color: V.inkFaint }}>{t.role}</div>
        </div>
      </div>
    </article>
  );
}

/* ── Data ── */
const heroStats = [
  { label: "Raised for good causes", to: 2.4, prefix: "$", suffix: "M+", decimals: 1 },
  { label: "Charities on the platform", to: 500, suffix: "+" },
  { label: "Donors reached", to: 180, suffix: "K+" },
  { label: "Countries served", to: 32 },
];

const features = [
  { icon: CreditCard, kind: "donations", title: "Simple donations", desc: "Accept one-time, monthly and instalment gifts. Receipts and thank-you emails are sent automatically — no spreadsheets." },
  { icon: Users, kind: "donors", title: "Know your donors", desc: "Every supporter in one place: giving history, contact details and the causes closest to their heart." },
  { icon: Palette, kind: "brand", title: "Your brand, your portal", desc: "Your own web address, your logo and your colours. Donors see your charity — never us." },
  { icon: Target, kind: "campaigns", title: "Campaigns that inspire", desc: "Set a goal, watch the progress bar fill, and share updates that keep supporters connected to the impact." },
  { icon: Calendar, kind: "events", title: "Events & volunteers", desc: "Run fundraisers and drives, manage sign-ups and coordinate your volunteer team with ease." },
  { icon: BarChart3, kind: "insights", title: "Clear insights", desc: "See what's working at a glance — donations over time, recurring supporters and campaign results." },
];

const steps = [
  { n: "1", icon: Sparkles, title: "Create your charity space", desc: "Pick a plan, choose your web address and set up your admin account. You'll be ready in a few minutes." },
  { n: "2", icon: Palette, title: "Make it yours", desc: "Add your logo, choose your colours and launch your first campaign — no design or tech skills needed." },
  { n: "3", icon: Heart, title: "Start receiving gifts", desc: "Share your page. Donations arrive securely, receipts go out automatically, and supporters stay updated." },
];


// `img` is a dummy avatar (pravatar) with a graceful initials fallback if it
// fails to load — see <ReviewAvatar/>.
const testimonials = [
  { quote: "We moved off spreadsheets and our monthly donations grew by 40% in the first quarter. Supporters love how easy giving has become.", author: "Sarah Mitchell", role: "Director · Hope Bridge", initials: "SM", img: "https://i.pravatar.cc/120?img=47" },
  { quote: "Our donors finally see our charity, not a generic payment page. That trust shows up in every campaign we run.", author: "Ahmed Al-Rahman", role: "Operations · Mercy Global", initials: "AR", img: "https://i.pravatar.cc/120?img=12" },
  { quote: "Sharing campaign updates keeps people connected to the cause. Supporter retention has never been higher.", author: "Maria Santos", role: "Fundraising · Bright Future", initials: "MS", img: "https://i.pravatar.cc/120?img=45" },
  { quote: "Onboarding took an afternoon. By the next morning we'd taken our first online gift — no developers required.", author: "James Okonkwo", role: "CEO · Atlas Aid", initials: "JO", img: "https://i.pravatar.cc/120?img=15" },
  { quote: "Recurring giving used to be a nightmare to manage. Now it just runs, and our reporting is finally clean.", author: "Priya Nair", role: "Programs · GiveWell Local", initials: "PN", img: "https://i.pravatar.cc/120?img=32" },
  { quote: "Our volunteers coordinate events in one place — sign-ups, reminders and attendance, all handled.", author: "Tom Becker", role: "Comms · Ocean Relief", initials: "TB", img: "https://i.pravatar.cc/120?img=51" },
  { quote: "Gift Aid and annual statements that used to eat a week now take minutes. It's given us our time back.", author: "Eleanor Whitcombe", role: "Trustee · Thames Relief", initials: "EW", img: "https://i.pravatar.cc/120?img=20" },
  { quote: "The branded portal made us look like a national charity overnight. Donors keep telling us how professional it feels.", author: "Daniel Okafor", role: "Volunteer Lead · Shelter First", initials: "DO", img: "https://i.pravatar.cc/120?img=33" },
];

const pricingPlans = [
  { tier: "Basic", desc: "For small charities getting started.", priceNum: 200, annualNum: 160, annualTotal: 1920, features: ["Up to 3 campaigns", "Donation processing", "Donor management", "Your branded portal", "Admin dashboard"] },
  { tier: "Professional", desc: "For growing charities running active appeals.", priceNum: 500, annualNum: 400, annualTotal: 4800, popular: true, features: ["Up to 5 campaigns", "Everything in Basic", "Up to 10 volunteers", "Campaign updates", "Event management"] },
  { tier: "Enterprise", desc: "For established charities operating at scale.", priceNum: 1000, annualNum: 800, annualTotal: 9600, features: ["Unlimited campaigns", "Everything in Professional", "Unlimited volunteers", "Priority support", "Tailored onboarding"] },
];

const faqs = [
  { q: "Can I change my plan later?", a: "Yes — you can upgrade or downgrade at any time from your dashboard. Changes take effect on your next billing date." },
  { q: "How do my donors pay?", a: "Supporters can give by credit or debit card, Apple Pay, Google Pay and PayPal — all handled securely through Stripe." },
  { q: "Do you take a cut of donations?", a: "No. We never charge a platform fee on donations. You only pay the standard Stripe processing fee, so more of every gift reaches your cause." },
  { q: "Is my donor data safe?", a: "Absolutely. Each charity's data is fully isolated, encrypted in transit and at rest, with role-based access and audit logs." },
  { q: "Do I need technical skills?", a: "Not at all. Setting up your portal, branding and campaigns is done through simple forms — most charities are live within minutes." },
];

const partners = [
  "Hope Bridge", "Mercy Global", "Bright Future", "Atlas Aid",
  "Northwind Trust", "Gather Foundation", "Open Hands", "Riverside Trust",
];
const initialsOf = (name) => name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/* ── GSAP count-up — rolls a number from 0 → `to` the first time it scrolls
   into view, with thousands separators and an optional prefix/suffix. ── */
function Counter({ to, decimals = 0, prefix = "", suffix = "", duration = 1.8, className = "", style = {} }) {
  const ref = useRef(null);
  const started = useRef(false);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const fmt = (n) =>
    prefix + n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const node = ref.current;
    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: to, duration, ease: "power2.out",
      onUpdate: () => { if (node) node.textContent = fmt(obj.v); },
    });
    return () => tween.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, to]);

  return <span ref={ref} className={className} style={style}>{fmt(0)}</span>;
}

/* ── Immersive Aurora hero — a full-viewport, cinematic stage: a deep emerald
   ground, a soft community-photo wash, three slow-drifting aurora orbs, a glass
   "live donation" card, and a stat ticker pinned to the bottom edge. The photo
   + aurora layers parallax on scroll (framer useScroll); the counters roll up
   with GSAP. Carries `data-hero` so the navbar collapse measures against it. ── */
function HeroSection() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "16%"]);
  const photoScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.12]);
  const auroraY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "-14%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "26%"]);
  const contentFade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const drift = (anim) => (reduce ? undefined : anim);

  return (
    <section
      ref={ref}
      data-hero
      className="relative flex min-h-[100dvh] flex-col overflow-hidden"
      style={{ background: "linear-gradient(168deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.08) 42%, rgba(0,0,0,.52) 100%), var(--tenant-primary, #102A23)", color: "#fff" }}
    >
      {/* Soft community-photo wash (degrades gracefully to the gradient) */}
      <motion.div className="absolute inset-0 will-change-transform" style={{ y: photoY, scale: photoScale }} aria-hidden>
        <img
          src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1740&q=80"
          alt=""
          className="h-full w-full object-cover"
          style={{ opacity: 0.2, mixBlendMode: "soft-light" }}
          loading="eager"
        />
      </motion.div>

      {/* Centred vignette scrim — keeps the middle legible, deepens the edges */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 75% at 50% 42%, rgba(0,0,0,.30) 0%, rgba(0,0,0,.58) 60%, rgba(0,0,0,.80) 100%)" }} aria-hidden />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.45) 0%, transparent 28%, transparent 72%, rgba(0,0,0,.5) 100%)" }} aria-hidden />

      {/* Fine grain + top gloss for depth */}
      <div className="saas-hero-grain pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.07), transparent)" }} aria-hidden />

      {/* ── Content (centred) ── */}
      <motion.div className="relative z-10 flex flex-1 items-center justify-center" style={{ y: contentY, opacity: contentFade }}>
        <div className="mx-auto w-full max-w-3xl px-6 pt-32 pb-12 text-center">
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-7 text-[clamp(46px,6.4vw,82px)] font-bold leading-[1.03] tracking-[-0.03em] text-white">
              Help your charity{" "}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(100deg, var(--tenant-accent-light, #059669) 0%, var(--tenant-accent, #047857) 100%)" }}>
                do more good
              </span>
              <span style={{ color: "var(--tenant-accent-light, #059669)" }}>.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-[600px] text-[18px] leading-relaxed" style={{ color: "rgba(255,255,255,.78)" }}>
              Everything your organisation needs to raise funds, welcome donors and run heartfelt
              campaigns — in one warm, beautiful platform with your name on it.
            </p>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <MagneticBtn as="link" to="/plans"
                className="saas-btn-primary group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[15px] font-semibold text-white"
                style={{ background: "linear-gradient(180deg, var(--tenant-accent, #047857), var(--pf-accent-2, #065F46))", boxShadow: "0 16px 40px -12px rgba(var(--tenant-accent-rgb), .55)" }}>
                Start your charity portal
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </MagneticBtn>
              <a href="#how" className="group inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-[15px] font-medium text-white transition-colors"
                style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.22)", backdropFilter: "blur(8px)" }}>
                <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: "rgba(255,255,255,.16)" }}>
                  <Play className="h-3 w-3 translate-x-px fill-current" />
                </span>
                See how it works
              </a>
            </div>
          </Reveal>
        </div>
      </motion.div>

      {/* ── Stat ticker pinned to the bottom edge ── */}
      <div className="relative z-10 border-t" style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", backdropFilter: "blur(6px)" }}>
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 px-8 py-7 md:grid-cols-4">
          {heroStats.map((s) => (
            <div key={s.label} className="text-center">
              <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals}
                className="text-[30px] font-bold tracking-tight text-white" />
              <div className="mt-1 text-[13px]" style={{ color: "rgba(255,255,255,.6)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── A small browser-chrome frame the feature previews render inside, so each
   one reads as a real screen from the product. ── */
function BrowserFrame({ children }) {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 40px 90px -38px rgba(6,40,30,.4)" }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: V.surface2, borderBottom: `1px solid ${V.line}` }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#F87171" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: V.accent }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: V.success }} />
        <span className="ml-2 text-[11.5px]" style={{ color: V.inkSoft }}>ngoplatform.yourplatform.org</span>
      </div>
      <div className="p-6" style={{ background: V.bg, minHeight: 340 }}>{children}</div>
    </div>
  );
}

/* ── The bespoke mini-mockup for each feature — a real-looking slice of the
   product (donation card, donor list, branded portal, campaign, events,
   insights chart). ── */
function FeaturePreview({ kind }) {
  if (kind === "donations") {
    return (
      <div>
        <div className="text-[13px] font-medium" style={{ color: V.inkSoft }}>Make a gift to</div>
        <div className="text-[18px] font-bold" style={{ color: V.ink }}>Clean Water for Every Village</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["$25", "$50", "$100"].map((a, idx) => (
            <div key={a} className="rounded-xl py-2.5 text-center text-[14px] font-semibold"
              style={idx === 1 ? { background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, color: "#fff" } : { background: V.surface, border: `1px solid ${V.line}`, color: V.ink }}>{a}</div>
          ))}
        </div>
        <div className="mt-3 inline-flex rounded-xl p-1" style={{ background: V.surface2 }}>
          <span className="rounded-lg px-4 py-1.5 text-[13px] font-semibold" style={{ background: V.surface, color: V.ink, boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}>One-time</span>
          <span className="rounded-lg px-4 py-1.5 text-[13px] font-medium" style={{ color: V.inkSoft }}>Monthly</span>
        </div>
        <button className="mt-5 w-full rounded-xl py-3 text-[14px] font-semibold text-white" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>Give $50</button>
        <div className="mt-3 flex items-center gap-1.5 text-[12.5px]" style={{ color: V.inkSoft }}>
          <Check className="h-4 w-4" style={{ color: V.success }} /> Receipt &amp; thank-you sent automatically
        </div>
      </div>
    );
  }
  if (kind === "donors") {
    const rows = [
      { n: "Emily Richardson", t: "Monthly donor", a: "$50" },
      { n: "Ahmed Khan", t: "One-time gift", a: "$120" },
      { n: "Sarah Chen", t: "Monthly donor", a: "$25" },
      { n: "David Okafor", t: "One-time gift", a: "$80" },
    ];
    return (
      <div>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold" style={{ color: V.ink }}>Recent supporters</div>
          <span className="text-[12px]" style={{ color: V.inkSoft }}>312 this month</span>
        </div>
        <div className="mt-3 space-y-2">
          {rows.map((d) => (
            <div key={d.n} className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: `linear-gradient(140deg, ${V.primary}, ${V.primary2})` }}>{initialsOf(d.n)}</span>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold" style={{ color: V.ink }}>{d.n}</div>
                <div className="text-[11.5px]" style={{ color: V.inkFaint }}>{d.t}</div>
              </div>
              <span className="text-[13px] font-bold" style={{ color: V.primary }}>{d.a}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "brand") {
    return (
      <div>
        <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})` }}>
          <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full" style={{ background: "rgba(255,255,255,.08)" }} />
          <div className="relative flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "rgba(255,255,255,.18)" }}><HandHeart className="h-5 w-5" /></span>
            <div className="text-[15px] font-bold">NGO Platform</div>
          </div>
          <div className="relative mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-semibold" style={{ background: "#fff", color: V.primary }}>
            <Heart className="h-3.5 w-3.5" /> Donate now
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[12.5px]" style={{ color: V.inkSoft }}>Your colours &amp; logo</div>
          <div className="flex gap-1.5">
            {[V.primary, V.accent, V.primary2, "#0EA5E9"].map((c) => (
              <span key={c} className="h-6 w-6 rounded-lg" style={{ background: c, border: `1px solid ${V.line}` }} />
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-lg px-3 py-2.5 text-[12.5px]" style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.inkSoft }}>
          <span style={{ color: V.primary }}>https://</span>ngoplatform.yourplatform.org
        </div>
      </div>
    );
  }
  if (kind === "campaigns") {
    return (
      <div>
        <div className="text-[13px] font-medium" style={{ color: V.inkSoft }}>Active campaign</div>
        <div className="text-[18px] font-bold" style={{ color: V.ink }}>Clean Water for Every Village</div>
        <div className="mt-3 flex items-baseline gap-2">
          <Counter to={38500} prefix="$" className="text-[26px] font-bold" style={{ color: V.ink }} />
          <span className="text-[13px]" style={{ color: V.inkFaint }}>of $50,000 goal</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ background: V.surface2 }}>
          <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }}
            initial={{ width: 0 }} animate={{ width: "78%" }} transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }} />
        </div>
        <div className="mt-4 rounded-xl p-3.5" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: V.primary }}>
            <Megaphone className="h-3.5 w-3.5" /> Update posted
          </div>
          <div className="mt-1 text-[12.5px] leading-relaxed" style={{ color: V.inkSoft }}>“The first three wells are complete — thank you for making it happen!”</div>
        </div>
      </div>
    );
  }
  if (kind === "events") {
    const evs = [
      { m: "JUN", d: "18", t: "Charity Gala Dinner", r: "86 going" },
      { m: "JUL", d: "02", t: "Community Fun Run", r: "142 going" },
      { m: "JUL", d: "20", t: "Volunteer Orientation", r: "38 going" },
    ];
    return (
      <div>
        <div className="text-[15px] font-bold" style={{ color: V.ink }}>Upcoming events</div>
        <div className="mt-3 space-y-2">
          {evs.map((e) => (
            <div key={e.t} className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg" style={{ background: "rgba(var(--tenant-accent-rgb),.10)" }}>
                <div className="text-[9px] font-bold leading-none" style={{ color: V.primary }}>{e.m}</div>
                <div className="text-[15px] font-extrabold leading-tight" style={{ color: V.ink }}>{e.d}</div>
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold" style={{ color: V.ink }}>{e.t}</div>
                <div className="text-[11.5px]" style={{ color: V.inkFaint }}>{e.r}</div>
              </div>
              <span className="rounded-lg px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: "rgba(var(--tenant-accent-rgb),.10)", color: V.primary }}>RSVP</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // insights
  const bars = [40, 62, 48, 80, 58, 92, 74];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold" style={{ color: V.ink }}>Donations this month</div>
        <span className="text-[12px] font-semibold" style={{ color: V.success }}>↑ 24%</span>
      </div>
      <Counter to={48250} prefix="$" className="mt-1 block text-[24px] font-bold" style={{ color: V.ink }} />
      <div className="mt-4 flex items-end gap-2" style={{ height: 130 }}>
        {bars.map((h, idx) => (
          <motion.div key={idx} className="flex-1 rounded-t-md"
            style={{ background: idx === 5 ? `linear-gradient(180deg, ${V.glow}, ${V.primary})` : `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, opacity: idx === 5 ? 1 : 0.85 }}
            initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.7, delay: idx * 0.06, ease: [0.2, 0.7, 0.2, 1] }} />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[11px]" style={{ color: V.inkFaint }}>
        {days.map((d) => <span key={d}>{d}</span>)}
      </div>
    </div>
  );
}

/* ── Interactive feature explorer — a clickable list on the left drives a live
   preview panel on the right. One feature is selected by default; switching is
   fully user-driven (no auto-advance) and the preview cross-fades in place so
   the layout never jumps. ── */
function FeatureExplorer() {
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const stRef = useRef(null);
  const reduce = useReducedMotion();

  // Desktop: pin the section and scrub through all six features before the page
  // continues. Mobile / reduced-motion: no pin — the list works as plain clicks.
  useEffect(() => {
    if (reduce || !rootRef.current) return undefined;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: "top 88px",
        end: () => "+=" + Math.round(window.innerHeight * 0.6 * features.length),
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const i = Math.min(features.length - 1, Math.floor(self.progress * features.length));
          setActive((prev) => (prev === i ? prev : i));
        },
      });
      stRef.current = st;
      return () => { stRef.current = null; };
    });
    return () => mm.revert();
  }, [reduce]);

  // Click a feature → while pinned, scroll to that step's segment so it sticks;
  // otherwise (mobile/reduced-motion) just select it.
  const select = (i) => {
    const st = stRef.current;
    if (st) window.scrollTo({ top: st.start + ((i + 0.5) / features.length) * (st.end - st.start), behavior: "smooth" });
    else setActive(i);
  };

  return (
    <div ref={rootRef} className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
      {/* Left — feature list */}
      <div>
        <div className="flex flex-col gap-1.5">
          {features.map((f, i) => {
            const on = i === active;
            return (
              <button key={f.title} type="button" onClick={() => select(i)} aria-pressed={on}
                className="relative w-full overflow-hidden p-4 text-left transition-all duration-300"
                style={{
                  background: on ? `linear-gradient(180deg, rgba(var(--tenant-accent-rgb),.06), ${V.surface})` : "transparent",
                  border: `1px solid ${on ? "rgba(var(--tenant-accent-rgb),.30)" : "transparent"}`,
                  boxShadow: on ? "0 18px 40px -22px rgba(var(--tenant-accent-rgb),.35)" : "none",
                }}>
                {on && <span aria-hidden className="absolute inset-y-3 left-0 w-[3px]" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.glow})` }} />}
                <div className="flex items-center gap-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center font-mono text-[15px] font-bold transition-all duration-300"
                    style={on
                      ? { background: V.primary, color: "#fff" }
                      : { background: V.surface2, color: V.primary, border: `1px solid ${V.line}` }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-bold tracking-tight" style={{ color: on ? V.ink : V.inkSoft }}>{f.title}</span>
                      {on && <ArrowRight className="h-4 w-4" style={{ color: V.primary }} />}
                    </div>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }} className="overflow-hidden">
                          <p className="pt-1.5 text-[13.5px] leading-relaxed" style={{ color: V.inkSoft }}>{f.desc}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right — live preview. Panels overlap and cross-fade (no wait-gap, no
          vertical slide) for a smooth transition; min-height keeps it stable. */}
      <div>
        <BrowserFrame>
          <div className="relative" style={{ minHeight: 260 }}>
            <AnimatePresence initial={false}>
              <motion.div key={active} className="absolute inset-x-0 top-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}>
                <FeaturePreview kind={features[active].kind} />
              </motion.div>
            </AnimatePresence>
          </div>
        </BrowserFrame>
      </div>
    </div>
  );
}

/* ── Compact illustrative visual that sits inside each timeline step card. ── */
function StepVisual({ index }) {
  if (index === 0) {
    return (
      <div className="mt-5 space-y-2">
        <div className="flex items-center rounded-lg px-3 py-2 text-[12.5px]" style={{ background: V.bg, border: `1px solid ${V.line}` }}>
          <span style={{ color: V.ink, fontWeight: 600 }}>ngoplatform</span>
          <span style={{ color: V.inkFaint }}>.yourplatform.org</span>
          <Check className="ml-auto h-4 w-4" style={{ color: V.success }} />
        </div>
        <div className="flex gap-1.5">
          {["Basic", "Pro", "Enterprise"].map((p, i) => (
            <span key={p} className="rounded-md px-2.5 py-1 text-[11.5px] font-semibold"
              style={i === 1 ? { background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, color: "#fff" } : { background: V.surface2, color: V.inkSoft }}>{p}</span>
          ))}
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="mt-5 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(150deg, ${V.primary}, ${V.glow})` }}>
          <HandHeart className="h-5 w-5" />
        </span>
        <div className="flex gap-1.5">
          {[V.primary, V.accent, V.primary2, "#0EA5E9", "#F472B6"].map((c) => (
            <span key={c} className="h-6 w-6 rounded-lg" style={{ background: c, border: `1px solid ${V.line}` }} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="mt-5 flex items-center gap-3 rounded-xl p-2.5" style={{ background: V.bg, border: `1px solid ${V.line}` }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: `linear-gradient(140deg, ${V.primary}, ${V.primary2})` }}>ER</span>
      <div className="flex-1 text-[13px]">
        <span style={{ color: V.ink, fontWeight: 600 }}>Emily</span> <span style={{ color: V.inkSoft }}>gave</span> <span style={{ color: V.primary, fontWeight: 700 }}>$50</span>
      </div>
      <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: V.success }}><Check className="h-3.5 w-3.5" /> Receipt</span>
    </div>
  );
}

/* ── A single step on the vertical timeline: a number node on the centre line
   that lights up when it reaches the middle of the viewport, plus a card that
   alternates left/right (desktop) and reveals on scroll. ── */
function TimelineStep({ step, index }) {
  const isLeft = index % 2 === 0;
  const nodeRef = useRef(null);
  const active = useInView(nodeRef, { margin: "-48% 0px -48% 0px" });

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 30, x: isLeft ? -20 : 20 }} whileInView={{ opacity: 1, y: 0, x: 0 }} viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      className="saas-card relative overflow-hidden rounded-2xl p-6"
      style={{ background: V.surface, border: `1px solid ${V.line}` }}>
      <span aria-hidden className="saas-topline pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }} />
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[40px] font-bold leading-none" style={{ color: V.primary }}>{step.n}</span>
        <span className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: V.inkFaint }}>of {steps.length}</span>
      </div>
      <h3 className="mt-4 text-[20px] font-bold tracking-[-0.01em]" style={{ color: V.ink }}>{step.title}</h3>
      <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: V.inkSoft }}>{step.desc}</p>
      <StepVisual index={index} />
    </motion.div>
  );

  return (
    <div className="relative py-4 lg:py-6">
      {/* Number node on the line */}
      <div ref={nodeRef} className="absolute left-6 top-7 z-10 -translate-x-1/2 lg:left-1/2 lg:top-1/2 lg:-translate-y-1/2">
        <div className="grid place-items-center rounded-full text-[15px] font-bold"
          style={{
            width: 46, height: 46,
            color: active ? "#fff" : V.primary,
            background: active ? `linear-gradient(150deg, ${V.primary}, ${V.glow})` : V.surface,
            border: `2px solid ${active ? "transparent" : "rgba(var(--tenant-accent-rgb),.3)"}`,
            boxShadow: active ? "0 12px 28px -8px rgba(var(--tenant-accent-rgb),.55)" : "0 1px 3px rgba(0,0,0,.06)",
            transform: active ? "scale(1.06)" : "scale(1)",
            transition: "all .45s cubic-bezier(.2,.8,.2,1)",
          }}>
          {step.n}
        </div>
      </div>

      {/* Desktop connector stub from the line to the card */}
      <span aria-hidden className="absolute top-1/2 hidden h-px lg:block"
        style={{ background: V.line, width: "2rem", left: isLeft ? "calc(50% - 2rem)" : "50%" }} />

      {/* Two-column row: the card occupies one side, the other stays empty → true zig-zag.
          On mobile the grid collapses and the filled column sits beside the left rail. */}
      <div className="ml-16 lg:ml-0 lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-20">
        <div className={isLeft ? "lg:pr-2" : "hidden lg:block"}>{isLeft ? card : null}</div>
        <div className={isLeft ? "hidden lg:block" : "lg:pl-2"}>{isLeft ? null : card}</div>
      </div>
    </div>
  );
}

/* ── Vertical "how it works" timeline whose centre line draws itself as the
   section scrolls into view (framer useScroll → scaleY). ── */
function HowTimeline() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 72%", "end 55%"] });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <div ref={ref} className="relative mx-auto mt-6 max-w-[940px]">
      {/* Static track */}
      <div aria-hidden className="absolute bottom-0 top-0 left-6 w-px -translate-x-1/2 lg:left-1/2" style={{ background: V.line }} />
      {/* Drawing progress line */}
      <motion.div aria-hidden className="absolute bottom-0 top-0 left-6 w-[2px] origin-top -translate-x-1/2 lg:left-1/2"
        style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.glow})`, scaleY: reduce ? 1 : lineScale }} />
      <div>
        {steps.map((s, i) => <TimelineStep key={s.n} step={s} index={i} />)}
      </div>
    </div>
  );
}

/* ── Theme presets for the live brand switcher (each is a different tenant's
   look — colours, name, logo monogram, domain, campaign). ── */
const portalThemes = [
  { key: "emerald", label: "Emerald", primary: "#047857", primary2: "#065F46", accent: "#F59E0B", name: "NGO Platform", tagline: "Together, we build brighter futures", domain: "ngoplatform", initials: "NP", campaign: "Clean Water Initiative" },
  { key: "ocean", label: "Ocean", primary: "#0369A1", primary2: "#075985", accent: "#F59E0B", name: "Tide Relief Project", tagline: "Clean oceans, thriving coasts", domain: "tiderelief", initials: "TR", campaign: "Reef Restoration" },
  { key: "sunset", label: "Sunset", primary: "#C2410C", primary2: "#9A3412", accent: "#0D9488", name: "Sunrise Aid", tagline: "Bringing hope at first light", domain: "sunriseaid", initials: "SA", campaign: "Warm Meals Drive" },
  { key: "rose", label: "Rose", primary: "#BE185D", primary2: "#9D174D", accent: "#F59E0B", name: "Rosewood Trust", tagline: "Care that blossoms", domain: "rosewood", initials: "RW", campaign: "Family Shelter Fund" },
];

/* ── Interactive portal preview — pick a theme (or let it auto-cycle) and the
   whole mockup recolours/re-brands live, demonstrating per-tenant theming. ── */
function BrandPortalPreview() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const t = portalThemes[active];
  const ease = "background .6s ease, color .6s ease, border-color .6s ease";

  useEffect(() => {
    if (paused || reduce) return;
    const id = setInterval(() => setActive((a) => (a + 1) % portalThemes.length), 3600);
    return () => clearInterval(id);
  }, [active, paused, reduce]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="overflow-hidden rounded-3xl" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 34px 80px -30px rgba(6,40,30,.32)" }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ background: V.surface2, borderBottom: `1px solid ${V.line}` }}>
          <span className="h-3 w-3 rounded-full" style={{ background: "#F87171" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#FBBF24" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#34D399" }} />
          <span className="ml-2 text-[12.5px]" style={{ color: V.inkSoft }}>
            <span style={{ color: t.primary, transition: ease }}>{t.domain}</span>.yourplatform.org
          </span>
        </div>
        {/* Portal */}
        <div className="p-6" style={{ background: V.bg }}>
          <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.primary2})`, transition: ease }}>
            <span className="absolute -right-6 -top-6 h-32 w-32 rounded-full" style={{ background: "rgba(255,255,255,.08)" }} />
            <div className="relative flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl text-[14px] font-extrabold" style={{ background: "rgba(255,255,255,.18)" }}>{t.initials}</span>
              <div>
                <div className="text-[19px] font-bold leading-tight">{t.name}</div>
                <div className="text-[12.5px] opacity-80">{t.tagline}</div>
              </div>
            </div>
            <div className="relative mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold" style={{ background: t.accent, transition: ease }}>
              <Heart className="h-3.5 w-3.5" /> Donate now
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
              <div className="text-[12px]" style={{ color: V.inkFaint }}>Active campaign</div>
              <div className="mt-1 text-[15px] font-bold" style={{ color: V.ink }}>{t.campaign}</div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: V.surface2 }}>
                <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${t.primary}, ${t.accent})` }}
                  initial={{ width: 0 }} whileInView={{ width: "78%" }} viewport={{ once: true }} transition={{ duration: 1.3, ease: [0.2, 0.7, 0.2, 1] }} />
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
              <div className="text-[12px]" style={{ color: V.inkFaint }}>Raised this month</div>
              <Counter to={48250} prefix="$" className="mt-1 block text-[19px] font-bold" style={{ color: V.ink }} />
              <div className="mt-1 text-[12px] font-medium" style={{ color: V.success }}>↑ <Counter to={24} suffix="% vs last month" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme switcher */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <span className="text-[12.5px] font-medium" style={{ color: V.inkSoft }}>Try a theme:</span>
        {portalThemes.map((th, i) => {
          const on = i === active;
          return (
            <button key={th.key} type="button" onClick={() => setActive(i)} aria-pressed={on} aria-label={th.label}
              className="inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[12.5px] font-semibold transition-all duration-300"
              style={{
                background: on ? V.surface : "transparent",
                border: `1px solid ${on ? "rgba(var(--tenant-accent-rgb),.35)" : V.line}`,
                color: on ? V.ink : V.inkSoft,
                boxShadow: on ? "0 8px 18px -10px rgba(6,40,30,.25)" : "none",
              }}>
              <span className="h-5 w-5 rounded-full" style={{ background: `linear-gradient(135deg, ${th.primary}, ${th.primary2})`, boxShadow: on ? "0 0 0 3px rgba(var(--tenant-accent-rgb),.15)" : "none" }} />
              {th.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── A single campaign told as a scroll-revealed story timeline: current
   progress up top, then the milestones a supporter would follow. ── */
const campaignJourney = [
  { icon: Rocket, title: "Campaign launched", time: "6 weeks ago", desc: "Goal set at $50,000 to bring clean water to four villages." },
  { icon: TrendingUp, title: "25% funded", time: "5 weeks ago", desc: "124 early supporters got the project moving." },
  { icon: Camera, title: "Photo update posted", time: "3 weeks ago", desc: "“The first three wells are complete — thank you!”", photo: true },
  { icon: Users, title: "78% · 312 donors", time: "Today", desc: "$38,500 raised of $50,000 — almost there.", current: true },
  { icon: Mail, title: "Impact report", time: "Coming soon", desc: "Every donor gets a closing thank-you with the results.", upcoming: true },
];

function CampaignStory() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref} className="rounded-2xl p-6 lg:p-7" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 24px 50px -24px rgba(6,40,30,.2)" }}>
      {/* Current state */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em]" style={{ color: V.primary }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: V.success }} /> Active campaign
          </span>
          <h3 className="mt-1.5 text-[19px] font-bold tracking-[-0.01em]" style={{ color: V.ink }}>Clean Water for Every Village</h3>
        </div>
        <Counter to={78} suffix="%" className="text-[20px] font-bold" style={{ color: V.primary }} />
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ background: V.surface2 }}>
        <motion.div className="relative h-full overflow-hidden rounded-full" style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }}
          initial={{ width: 0 }} whileInView={{ width: "78%" }} viewport={{ once: true }} transition={{ duration: 1.3, ease: [0.2, 0.7, 0.2, 1] }}>
          <span aria-hidden className="saas-prog-shine absolute inset-y-0 w-1/3" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent)" }} />
        </motion.div>
      </div>
      <div className="mt-2 text-[12.5px]" style={{ color: V.inkFaint }}>
        <Counter to={38500} prefix="$" /> raised of $50,000 · <Counter to={312} /> donors
      </div>

      {/* Story timeline */}
      <div className="relative mt-6 pt-6" style={{ borderTop: `1px solid ${V.line}` }}>
        <motion.div aria-hidden className="absolute left-[15px] w-[2px] origin-top" style={{ top: 40, bottom: 24, background: `linear-gradient(180deg, ${V.primary}, ${V.glow})` }}
          initial={{ scaleY: 0 }} animate={inView ? { scaleY: 1 } : { scaleY: 0 }} transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }} />
        <ol className="space-y-4">
          {campaignJourney.map((m, i) => (
            <motion.li key={m.title} className="relative pl-11"
              initial={{ opacity: 0, x: -14 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5, delay: 0.25 + i * 0.13, ease: [0.2, 0.7, 0.2, 1] }}>
              <motion.span className="absolute left-0 top-0 z-10 grid h-8 w-8 place-items-center rounded-full"
                initial={{ scale: 0, rotate: -25 }} animate={inView ? { scale: 1, rotate: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.13, type: "spring", stiffness: 280, damping: 16 }}
                style={m.upcoming
                  ? { background: V.surface, border: "2px dashed rgba(var(--tenant-primary-rgb),.25)", color: V.inkFaint }
                  : { background: `linear-gradient(150deg, ${V.primary}, ${V.glow})`, color: "#fff" }}>
                {m.current && <span aria-hidden className="saas-pulse-ring absolute inset-0 rounded-full" style={{ border: `2px solid ${V.accent}` }} />}
                <m.icon className="relative h-4 w-4" />
              </motion.span>
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="text-[14px] font-bold" style={{ color: V.ink }}>{m.title}</span>
                <span className="text-[11px]" style={{ color: V.inkFaint }}>· {m.time}</span>
                {m.current && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: "rgba(var(--tenant-accent-rgb),.12)", color: V.primary }}>Now</span>}
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: V.inkSoft }}>{m.desc}</p>
              {m.photo && (
                <motion.div className="relative mt-2.5 overflow-hidden rounded-xl"
                  initial={{ opacity: 0, scale: 0.96 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.5, delay: 0.6 }}
                  style={{ border: `1px solid ${V.line}`, background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})` }}>
                  <img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=70"
                    alt="Supporters celebrating the new village well" className="h-28 w-full object-cover" loading="lazy" />
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-white"
                    style={{ background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)" }}>
                    <Camera className="h-3 w-3" /> Photo update
                  </span>
                </motion.div>
              )}
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ── A price that rolls (GSAP) from 0 on first view, then from the previous
   amount to the new one whenever the billing cycle flips it. ── */
function RollingPrice({ value, className = "", style = {} }) {
  const ref = useRef(null);
  const prev = useRef(0);
  const seen = useRef(false);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  useEffect(() => {
    if (!inView) return;
    const node = ref.current;
    const from = seen.current ? prev.current : 0;
    seen.current = true;
    const obj = { v: from };
    const tween = gsap.to(obj, { v: value, duration: 0.7, ease: "power2.out",
      onUpdate: () => { if (node) node.textContent = "$" + Math.round(obj.v).toLocaleString("en-US"); } });
    prev.current = value;
    return () => tween.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);
  return <span ref={ref} className={className} style={style}>{"$" + value.toLocaleString("en-US")}</span>;
}

/* ── Pricing grid with a Monthly/Annual toggle (sliding pill) that re-rolls the
   prices and reveals the annual saving; the popular plan is spotlit. ── */
function PricingCards() {
  const [billing, setBilling] = useState("monthly");
  const annual = billing === "annual";
  return (
    <>
      {/* Billing toggle */}
      <div className="mb-12 flex justify-center">
        {/* The sliding pill lives INSIDE the active button (shared layoutId), so it
            matches each button's real width — no more 50% overlap with "Annual". */}
        <div className="relative inline-flex rounded-full p-1.5" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 6px rgba(6,40,30,.05)" }}>
          <button type="button" onClick={() => setBilling("monthly")} className="relative rounded-full px-6 py-2 text-[14px] font-semibold transition-colors" style={{ color: annual ? V.inkSoft : "#fff" }}>
            {!annual && (
              <motion.span aria-hidden layoutId="saas-billing-pill" className="absolute inset-0 rounded-full"
                style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: "0 6px 16px -6px rgba(var(--tenant-accent-rgb),.5)" }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }} />
            )}
            <span className="relative z-10">Monthly</span>
          </button>
          <button type="button" onClick={() => setBilling("annual")} className="relative rounded-full px-6 py-2 text-[14px] font-semibold transition-colors" style={{ color: annual ? "#fff" : V.inkSoft }}>
            {annual && (
              <motion.span aria-hidden layoutId="saas-billing-pill" className="absolute inset-0 rounded-full"
                style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: "0 6px 16px -6px rgba(var(--tenant-accent-rgb),.5)" }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }} />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              Annual
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={annual ? { background: "rgba(255,255,255,.22)", color: "#fff" } : { background: "rgba(var(--tenant-accent-rgb),.14)", color: V.primary }}>Save 20%</span>
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <motion.div className="grid grid-cols-1 items-stretch gap-5 pt-3 md:grid-cols-3"
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
        {pricingPlans.map((plan, i) => {
          // Show the ACTUAL price for the selected cycle: the yearly total when
          // annual is on, the monthly price otherwise (per-month equiv goes below).
          const bigPrice = annual ? plan.annualTotal : plan.priceNum;
          return (
            <motion.div key={plan.tier} variants={fadeUpChild} custom={i} className="h-full">
              {/* middle wrapper carries the static spotlight transform (kept off the
                  framer-animated & hover-animated layers to avoid transform clashes) */}
              <div className={`h-full ${plan.popular ? "md:relative md:z-10 md:-translate-y-2 md:scale-[1.035]" : ""}`}>
                <div className={`saas-card relative flex h-full flex-col rounded-2xl p-8 ${plan.popular ? "" : "overflow-hidden"}`}
                  style={{
                    background: plan.popular ? `radial-gradient(120% 80% at 50% -10%, rgba(var(--tenant-accent-rgb),.12), transparent 60%), ${V.surface}` : V.surface,
                    border: plan.popular ? `2px solid ${V.primary}` : `1px solid ${V.line}`,
                    boxShadow: plan.popular ? "0 34px 70px -26px rgba(var(--tenant-accent-rgb),.5)" : "none",
                  }}>
                  {!plan.popular && <span aria-hidden className="saas-topline pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }} />}
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-white"
                      style={{ background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})`, boxShadow: "0 8px 20px -6px rgba(var(--tenant-accent-rgb),.5)" }}>
                      <Sparkles className="h-3.5 w-3.5" /> Most popular
                    </span>
                  )}
                  <div className="text-[20px] font-bold" style={{ color: V.ink }}>{plan.tier}</div>
                  <div className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: V.inkSoft }}>{plan.desc}</div>
                  <div className="mt-5 pb-6" style={{ borderBottom: `1px solid ${V.line}` }}>
                    <div className="flex items-baseline gap-1.5">
                      <RollingPrice value={bigPrice} className="text-[42px] font-bold tracking-tight" style={{ color: V.ink }} />
                      <span className="text-[14px]" style={{ color: V.inkFaint }}>{annual ? "/ year" : "/ month"}</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {annual && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                            <span style={{ color: V.inkFaint }}>≈ ${plan.annualNum.toLocaleString()}/mo · billed yearly</span>
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(5,150,105,.12)", color: V.success }}>
                              Save ${(plan.priceNum * 12 - plan.annualTotal).toLocaleString()}/yr
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <ul className="mb-7 mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[14px]" style={{ color: V.inkSoft }}>
                        <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full" style={{ background: plan.popular ? "rgba(var(--tenant-accent-rgb),.14)" : V.surface2 }}>
                          <Check className="h-3 w-3" strokeWidth={3} style={{ color: V.primary }} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={`/register?plan=${plan.tier.toLowerCase()}&billing=${billing}`}
                    className={`group flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14.5px] font-semibold transition-all ${plan.popular ? "saas-btn-primary text-white" : ""}`}
                    style={plan.popular
                      ? { background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 12px 26px -10px rgba(var(--tenant-accent-rgb),.5)` }
                      : { background: V.surface2, color: V.ink, border: `1px solid ${V.line}` }}>
                    Get started
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </>
  );
}

/* ═══════════════ MAIN ═══════════════ */
export default function SaaSHome() {
  // Honour a "/#section" hash arriving from another page (e.g. Contact's
  // "See all FAQs" → /#faq). The features section is GSAP-pinned, which adds a
  // tall pin-spacer to the layout. We:
  //   1. refresh ScrollTrigger so the spacer is settled into the layout,
  //   2. jump INSTANTLY to the element (a smooth scroll would travel through the
  //      pinned section and get interrupted, stranding you in features/how),
  //   3. re-measure & re-jump a couple of frames later to correct for any layout
  //      shift as the pin renders at its final state.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return undefined;
    const rafs = [];
    const jump = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 80; // clear the fixed navbar
      window.scrollTo({ top, behavior: "auto" });
    };
    const t = setTimeout(() => {
      ScrollTrigger.refresh();
      jump();
      rafs.push(requestAnimationFrame(() => { jump(); rafs.push(requestAnimationFrame(jump)); }));
    }, 500);
    return () => { clearTimeout(t); rafs.forEach(cancelAnimationFrame); };
  }, []);

  return (
    <div className="saas-page" style={{ fontFamily: font, background: V.bg, color: V.ink, overflowX: "hidden", position: "relative" }}>
      <style>{css}</style>

      {/* ══ HERO — Immersive Aurora ══ */}
      <HeroSection />

      {/* ══ PARTNERS — logo-chip marquee ══ */}
      <section className="relative overflow-hidden py-16" style={{ borderTop: `1px solid ${V.line}`, borderBottom: `1px solid ${V.line}` }}>
        <div className="mx-auto mb-10 max-w-[1100px] px-8">
          <div className="flex items-center justify-center gap-4">
            <span className="hidden h-px w-12 sm:block" style={{ background: `linear-gradient(90deg, transparent, ${V.line})` }} />
            <p className="text-center text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: V.inkFaint }}>
              Trusted by charities making a difference around the world
            </p>
            <span className="hidden h-px w-12 sm:block" style={{ background: `linear-gradient(270deg, transparent, ${V.line})` }} />
          </div>
        </div>
        <Reveal>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 sm:w-40" style={{ background: `linear-gradient(90deg, ${V.bg}, transparent)` }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 sm:w-40" style={{ background: `linear-gradient(270deg, ${V.bg}, transparent)` }} />
            {/* Two identical halves; the track is animated -50% for a seamless,
                gap-free loop. Each half repeats the list twice so a single half
                is always wider than the viewport (no mid-screen "snap"). */}
            <div className="saas-marquee flex w-max">
              {[0, 1].map((half) => (
                <div key={half} className="flex shrink-0 items-center" aria-hidden={half === 1}>
                  {[...partners, ...partners].map((p, i) => (
                    <div key={`${half}-${i}`} className="saas-logo flex shrink-0 items-center gap-3 px-7">
                      <span className="saas-logo-ic grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold"
                        style={{ background: "rgba(var(--tenant-primary-rgb),.06)", color: V.inkSoft, border: `1px solid ${V.line}` }}>
                        {initialsOf(p)}
                      </span>
                      <span className="saas-logo-name whitespace-nowrap text-[18px] font-bold tracking-tight" style={{ color: V.inkSoft }}>{p}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" className="relative overflow-hidden py-24 px-8">
        <div className="relative max-w-[1200px] mx-auto">
          <SectionHead center
            title="One friendly home for<br/>all your fundraising."
            subtitle="From the first donation to the final thank-you, the platform handles the busywork so your team can focus on the cause." />
          <FeatureExplorer />
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how" className="py-24 px-8" style={{ background: V.surface2 }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHead center
            title="Three simple steps to<br/>your own donation portal." />
          <HowTimeline />
        </div>
      </section>

      {/* ══ PORTAL SHOWCASE ══ */}
      <section className="py-24 px-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <h2 className="mt-5 text-[clamp(28px,3.4vw,44px)] leading-[1.1] font-bold tracking-[-0.02em]" style={{ color: V.ink }}>
              A donation page that feels like <span style={{ color: V.primary }}>yours</span>.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed max-w-[460px]" style={{ color: V.inkSoft }}>
              Every organisation gets its own web address and a portal styled in your colours and logo.
              Donors connect with your mission — never a generic checkout.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                "Your own web address for your charity",
                "Logo, colours and theme you control",
                "A warm, welcoming experience for every donor",
                "Donor records kept private to your charity",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px]" style={{ color: V.ink }}>
                  <span className="w-6 h-6 rounded-full grid place-items-center shrink-0 mt-0.5" style={{ background: V.surface2 }}>
                    <Check className="w-3.5 h-3.5" style={{ color: V.primary }} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.15}>
            <BrandPortalPreview />
          </Reveal>
        </div>
      </section>

      {/* ══ CAMPAIGNS ══ */}
      <section className="py-24 px-8" style={{ background: V.surface2 }}>
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal className="order-2 lg:order-1">
            <CampaignStory />
          </Reveal>
          <Reveal delay={0.15} className="order-1 lg:order-2">
            <h2 className="mt-5 text-[clamp(28px,3.4vw,44px)] leading-[1.1] font-bold tracking-[-0.02em]" style={{ color: V.ink }}>
              Campaigns supporters can <span style={{ color: V.primary }}>follow</span>.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed max-w-[460px]" style={{ color: V.inkSoft }}>
              Set a goal, show live progress, and post heartfelt updates. Every donor is kept in the loop —
              so giving feels like being part of the story.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                "Goals with live progress bars",
                "Share photo and video updates",
                "Every donor notified automatically",
                "Closing impact reports to say thank you",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px]" style={{ color: V.ink }}>
                  <span className="w-6 h-6 rounded-full grid place-items-center shrink-0 mt-0.5" style={{ background: V.surface }}>
                    <Check className="w-3.5 h-3.5" style={{ color: V.primary }} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="overflow-hidden py-24">
        <div className="px-8">
          <SectionHead center
            title="Trusted by the people<br/>doing the good work." />
        </div>
        {/* Auto-scrolling marquee carousel — the list is doubled for a seamless
            loop; it pauses when hovered. Edge fades soften the in/out. */}
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-28" style={{ background: `linear-gradient(90deg, ${V.bg}, transparent)` }} />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-28" style={{ background: `linear-gradient(270deg, ${V.bg}, transparent)` }} />
          <div className="saas-marquee flex w-max py-2" style={{ animationDuration: "55s" }}>
            {[...testimonials, ...testimonials].map((t, i) => (
              <ReviewCard key={i} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="py-24 px-8" style={{ background: V.surface2 }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHead center
            title="A plan for every charity."
            subtitle="No platform fee on donations — ever. Choose a plan, change it whenever you need." />
          <PricingCards />
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" className="py-24 px-8">
        <div className="mx-auto max-w-[820px]">
          <SectionHead center
            title="Frequently asked questions"
            subtitle="Everything you need to know about the platform and billing. Can't find what you're after? We're only a message away." />

          {/* Centred accordion */}
          <FaqList faqs={faqs} />
        </div>
      </section>

      {/* ══ CTA ══ */}
      <CtaSection className="px-8 pb-28" primaryTo="/plans" />
    </div>
  );
}
