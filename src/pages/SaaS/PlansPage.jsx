import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Check, X, ChevronDown, Shield, Zap, Headphones, LayoutGrid, ArrowRight } from "lucide-react";
import PlanCard from "./PlanCard";
import CtaSection from "./CtaSection";
import tenantService from "../../services/tenant.service";

const V = {
  // surface2 = faint accent wash (was a hardcoded mint) so bands/fills follow the theme.
  bg: "var(--tenant-bg, #F3F8F5)", surface: "#FFFFFF", surface2: "rgba(var(--tenant-accent-rgb), .08)",
  line: "rgba(var(--tenant-primary-rgb), .08)", line2: "rgba(var(--tenant-primary-rgb), .04)",
  ink: "var(--tenant-primary, #102A23)", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "var(--tenant-accent, #047857)", primary2: "var(--pf-accent-2, #065F46)",
  glow: "var(--tenant-accent-light, #059669)", accent: "var(--pf-gold, #F59E0B)",
  success: "#059669",
};
const font = "var(--font-body, 'Outfit', system-ui, sans-serif)";
const mono = "'JetBrains Mono', monospace";

/* Scroll-reveal — same as homepage */
/* Warm pill badge — matches the home page's section eyebrow. */
const Badge = ({ icon: Icon, children, center }) => (
  <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-medium ${center ? "mx-auto" : ""}`}
    style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.primary, boxShadow: "0 1px 2px rgba(6,40,30,.04)" }}>
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </span>
);

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

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };
const fadeUpChild = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 1, delay: i * 0.08, ease: [0.2, 0.7, 0.2, 1] } }),
};

/* Injected CSS — hover effects + grid matching homepage */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
/* Editorial serif headings + sharp corners everywhere — matches the home page. */
.saas-page h1, .saas-page h2, .saas-page h3, .saas-page h4, .saas-page h5, .saas-page h6 {
  font-family: 'Fraunces', 'Outfit', Georgia, serif !important;
  letter-spacing: -0.015em;
}
.saas-page [class*="rounded"] { border-radius: 0 !important; }

/* Regular (non-featured) price cards */
.saas-price-regular {
  border: 1px solid rgba(6,40,30,.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 4px 16px -4px rgba(var(--tenant-accent-rgb),.06);
  transition: transform .4s ease, border-color .3s, box-shadow .4s ease;
}
.saas-price-regular:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--tenant-accent-rgb),.3);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.04),
    0 0 0 1px rgba(var(--tenant-accent-rgb),.15),
    0 8px 24px -4px rgba(var(--tenant-accent-rgb),.15),
    0 20px 50px -12px rgba(var(--tenant-accent-rgb),.12);
}

/* Featured (popular) price card */
.saas-price-featured {
  border: 1px solid rgba(var(--tenant-accent-rgb),.4);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 0 0 1px rgba(var(--tenant-accent-rgb),.25),
    0 8px 32px -8px rgba(var(--tenant-accent-rgb),.3),
    0 24px 60px -20px rgba(var(--tenant-accent-rgb),.2);
  transition: transform .4s ease, border-color .3s, box-shadow .4s ease;
}
.saas-price-featured:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--tenant-accent-rgb),.6);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 0 0 1px rgba(var(--tenant-accent-rgb),.4),
    0 0 40px -4px rgba(var(--tenant-accent-rgb),.25),
    0 28px 70px -20px rgba(var(--tenant-accent-rgb),.35);
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

.saas-btn-primary { position: relative; overflow: hidden; }
.saas-btn-primary::before {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.50) 50%, transparent 65%);
  transform: translateX(-120%); transition: transform 1s cubic-bezier(.2,.8,.2,1);
  pointer-events: none;
}
.saas-btn-primary:hover::before { transform: translateX(120%); }

.saas-faq-item { transition: border-color .3s; }
.saas-faq-item:hover { border-color: rgba(var(--tenant-accent-rgb),.15); }

.saas-comp-table { transition: box-shadow .4s; }
.saas-comp-table:hover { box-shadow: 0 12px 28px -12px rgba(15,23,42,.1); }
/* Comparison table: row hover + a continuous highlight down the popular column */
.saas-comp-row { transition: background .2s ease; }
.saas-comp-row:hover { background: rgba(var(--tenant-accent-rgb),.045); }
.saas-comp-pop { background: rgba(var(--tenant-accent-rgb),.06); }
.saas-comp-row:hover .saas-comp-pop { background: rgba(var(--tenant-accent-rgb),.11); }

/* Home-style FAQ accordion */
.saas-faq2 { transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease, background .35s ease; }
.saas-faq2:hover { transform: translateY(-2px); }

@keyframes saas-aurora1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,30px) scale(1.1); } }
@keyframes saas-aurora2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-46px,22px) scale(1.14); } }
.saas-gic { transition: transform .35s ease; }
.group:hover .saas-gic { transform: rotate(-6deg) scale(1.12); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

// Shown only until the live (SuperAdmin-managed) plans load, or if none are seeded.
const FALLBACK_PLANS = [
  { name: "Basic", key: "basic", monthlyPrice: 200, annualPrice: 1920, popular: false,
    description: "Perfect for small organisations just getting started with online fundraising",
    features: [
      { name: "Up to 3 campaigns", included: true }, { name: "Donation processing (Stripe)", included: true },
      { name: "Donor management", included: true }, { name: "Branded subdomain portal", included: true },
      { name: "Admin dashboard", included: true },
    ],
    limits: { campaigns: 3, volunteers: 0 },
    featureFlags: { recurringGiving: true, programs: true, events: true, store: true } },
  { name: "Professional", key: "professional", monthlyPrice: 500, annualPrice: 4800, popular: true,
    description: "For growing organisations with active campaigns and team collaboration needs",
    features: [
      { name: "Up to 5 campaigns", included: true }, { name: "Everything in Basic", included: true },
      { name: "Up to 10 volunteers", included: true }, { name: "Program follow-up updates", included: true },
      { name: "Event management", included: true },
    ],
    limits: { campaigns: 5, volunteers: 10 },
    featureFlags: { recurringGiving: true, programs: true, p2pCampaigns: true, events: true, volunteers: true, newsletter: true, store: true } },
  { name: "Enterprise", key: "enterprise", monthlyPrice: 1000, annualPrice: 9600, popular: false,
    description: "For established organisations that need unlimited capacity and premium support",
    features: [
      { name: "Unlimited campaigns", included: true }, { name: "Everything in Professional", included: true },
      { name: "Unlimited volunteers", included: true }, { name: "Priority support", included: true },
      { name: "Tailored onboarding", included: true },
    ],
    limits: { campaigns: null, volunteers: null },
    featureFlags: { recurringGiving: true, programs: true, p2pCampaigns: true, events: true, volunteers: true, newsletter: true, store: true } },
];

// Comparison rows derived from each plan's real limits + capability flags.
const COMPARE_ROWS = [
  { label: "Campaigns", type: "limit", key: "campaigns" },
  { label: "Volunteers", type: "limit", key: "volunteers" },
  { label: "Recurring & installments", type: "flag", key: "recurringGiving" },
  { label: "Programs / causes", type: "flag", key: "programs" },
  { label: "P2P fundraisers", type: "flag", key: "p2pCampaigns" },
  { label: "Event management", type: "flag", key: "events" },
  { label: "Volunteer management", type: "flag", key: "volunteers" },
  { label: "Newsletter campaigns", type: "flag", key: "newsletter" },
  { label: "Product / merch store", type: "flag", key: "store" },
];

const compareValue = (plan, row) => {
  if (row.type === "limit") {
    const v = plan.limits?.[row.key];
    if (v === null) return "Unlimited";
    if (v === undefined || v === "") return "—";
    return String(v);
  }
  return !!plan.featureFlags?.[row.key];
};

// DB plan (public payload) → the shape PlanCard + the comparison table expect.
const mapDbPlan = (p) => ({
  key: p.code,
  name: p.name,
  description: p.description || "",
  monthlyPrice: p.price?.monthly || 0,
  annualPrice: p.price?.annual || 0,
  popular: !!p.isPopular,
  features: (p.features || []).map((f) => ({ name: f, included: true })),
  limits: p.limits || {},
  featureFlags: p.featureFlags || {},
});

const faqs = [
  { q: "Can I switch plans later?", a: "Yes. You can upgrade or downgrade your plan at any time from your admin dashboard. Changes take effect at the start of your next billing cycle." },
  { q: "What payment methods do my donors get?", a: "All plans include Stripe-powered credit/debit card processing (Visa, Mastercard, Amex), bank transfers, and PayPal. Your donors can also set up recurring donations and installment plans." },
  { q: "Is there a transaction fee on donations?", a: "We do not charge any platform transaction fee. Standard Stripe processing fees apply (typically 1.7% + 30c per transaction in Australia). 100% of the remaining amount goes to your organisation." },
  { q: "How does the branded portal work?", a: "When you register, you choose a subdomain (e.g., yourcharity.ourplatform.com). Your donors visit this URL to see your organisation's donation pages, campaigns, and events — fully branded with your identity." },
  { q: "Can I cancel anytime?", a: "Yes. There are no lock-in contracts. You can cancel your subscription at any time and your portal will remain active until the end of your current billing period." },
  { q: "Is my donor data safe?", a: "Absolutely. Each organisation's data is completely isolated. We use industry-standard encryption, and all payment processing is handled by Stripe's PCI-compliant infrastructure." },
];

/* ── Animated single-open FAQ accordion — matches the home page ── */
function FaqItem({ faq, index, isOpen, onToggle }) {
  return (
    <Reveal delay={index * 0.05}>
      <div className="saas-faq2 relative overflow-hidden rounded-2xl"
        style={{
          background: isOpen ? `linear-gradient(180deg, rgba(var(--tenant-accent-rgb),.06), ${V.surface})` : V.surface,
          border: `1px solid ${isOpen ? "rgba(var(--tenant-accent-rgb),.35)" : V.line}`,
          boxShadow: isOpen ? "0 20px 44px -22px rgba(var(--tenant-accent-rgb),.4)" : "none",
        }}>
        {isOpen && (
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]"
            style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.glow})` }} />
        )}
        <button onClick={onToggle} aria-expanded={isOpen} className="flex w-full items-center gap-4 px-6 py-5 text-left">
          <span className="text-[12px] font-bold tabular-nums transition-colors"
            style={{ fontFamily: mono, color: isOpen ? V.primary : V.inkFaint }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex-1 text-[16px] font-semibold leading-snug transition-colors"
            style={{ color: isOpen ? V.primary : V.ink }}>{faq.q}</span>
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
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }} style={{ overflow: "hidden" }}>
              <p className="px-6 pb-6 pl-[3.4rem] text-[14.5px] leading-relaxed" style={{ color: V.inkSoft }}>{faq.a}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

function FaqList({ faqs: items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-3">
      {items.map((faq, i) => (
        <FaqItem key={faq.q} faq={faq} index={i} isOpen={open === i}
          onToggle={() => setOpen((cur) => (cur === i ? -1 : i))} />
      ))}
    </div>
  );
}

export default function PlansPage() {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [dbPlans, setDbPlans] = useState(null); // null = still loading

  useEffect(() => {
    tenantService
      .getPublicPlans()
      .then((res) => setDbPlans(Array.isArray(res.data) ? res.data : []))
      .catch(() => setDbPlans([]));
  }, []);

  // Live, SuperAdmin-managed plans drive the page; fall back to curated defaults
  // while loading or if none are published.
  const cardPlans = dbPlans && dbPlans.length ? dbPlans.map(mapDbPlan) : FALLBACK_PLANS;

  return (
    <div className="saas-page" style={{ fontFamily: font, background: V.bg, color: V.ink, overflowX: "hidden", position: "relative", minHeight: "100vh" }}>
      <style>{css}</style>

      {/* Page-wide ambient grid + noise — same as homepage */}
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

      {/* ── Header ── */}
      <section data-hero className="relative z-[1] pt-32 pb-8 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal delay={0.1}>
            <h1 className="text-[clamp(36px,5vw,56px)] font-medium tracking-[-0.03em] leading-[1.04] mb-4" style={{ color: V.ink }}>
              Simple, transparent pricing
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: V.inkSoft }}>
              Choose the plan that fits your organisation. No hidden fees, no surprises. All plans include donation processing and a branded portal.
            </p>
          </Reveal>

          {/* Billing toggle — smooth sliding indicator */}
          <Reveal delay={0.3}>
            <div className="relative inline-flex p-1.5"
              style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(15,23,42,.04)` }}>
              <button type="button" onClick={() => setBillingCycle("monthly")}
                className="relative px-6 py-2.5 text-sm font-semibold transition-colors"
                style={{ color: billingCycle === "monthly" ? "#fff" : V.inkSoft }}>
                {billingCycle === "monthly" && (
                  <motion.span aria-hidden layoutId="plans-billing-pill" className="absolute inset-0"
                    style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 1px 4px rgba(var(--tenant-accent-rgb),.4)` }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }} />
                )}
                <span className="relative z-10">Monthly</span>
              </button>
              <button type="button" onClick={() => setBillingCycle("annual")}
                className="relative px-6 py-2.5 text-sm font-semibold transition-colors"
                style={{ color: billingCycle === "annual" ? "#fff" : V.inkSoft }}>
                {billingCycle === "annual" && (
                  <motion.span aria-hidden layoutId="plans-billing-pill" className="absolute inset-0"
                    style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 1px 4px rgba(var(--tenant-accent-rgb),.4)` }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }} />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  Annual
                  <span className="px-1.5 py-0.5 text-[10px] font-bold" style={{ fontFamily: mono, background: billingCycle === "annual" ? "rgba(255,255,255,.18)" : "rgba(5,150,105,.14)", color: billingCycle === "annual" ? "#fff" : V.success }}>-20%</span>
                </span>
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Plan Cards ── */}
      <section className="relative z-[1] pb-20 px-6">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-[1280px] mx-auto"
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={stagger}
        >
          {cardPlans.map((plan, i) => (
            <motion.div key={plan.key} variants={fadeUpChild} custom={i}>
              <PlanCard plan={plan} billingCycle={billingCycle} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Feature comparison table ── */}
      <section className="relative z-[1] py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-[clamp(28px,3.8vw,44px)] font-bold tracking-[-0.025em]" style={{ color: V.ink }}>
                Compare all features
              </h2>
              <p className="mt-3" style={{ color: V.inkSoft }}>A detailed look at what each plan includes.</p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="saas-comp-table relative overflow-x-auto"
              style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 22px 54px -28px rgba(6,40,30,.18)" }}>
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${V.line}` }}>
                    <th className="px-6 pb-5 pt-6 align-bottom text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: V.inkFaint }}>Feature</th>
                    {cardPlans.map((p) => (
                      <th key={p.key} className={`relative px-4 pb-5 pt-6 text-center align-bottom ${p.popular ? "saas-comp-pop" : ""}`}>
                        {p.popular && (
                          <span className="absolute left-1/2 top-1.5 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white"
                            style={{ background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})` }}>Most popular</span>
                        )}
                        <div className="text-[15px] font-bold" style={{ color: p.popular ? V.primary : V.ink }}>{p.name}</div>
                        <div className="mt-0.5 text-[12px]" style={{ fontFamily: mono, color: V.inkFaint }}>${p.monthlyPrice}/mo</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row.label} className="saas-comp-row" style={{ borderTop: `1px solid ${V.line2}` }}>
                      <td className="px-6 py-3.5 text-sm font-medium" style={{ color: V.ink }}>{row.label}</td>
                      {cardPlans.map((p) => {
                        const val = compareValue(p, row);
                        return (
                          <td key={p.key} className={`px-4 py-3.5 text-center ${p.popular ? "saas-comp-pop" : ""}`}>
                            {typeof val === "boolean" ? (
                              val ? (
                                <span className="inline-grid h-6 w-6 place-items-center align-middle" style={{ background: "rgba(var(--tenant-accent-rgb),.12)" }}>
                                  <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: V.primary }} />
                                </span>
                              ) : (
                                <span className="text-[15px] font-medium text-gray-300">—</span>
                              )
                            ) : (
                              <span className="text-sm font-semibold" style={{ color: V.ink }}>{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `1px solid ${V.line}` }}>
                    <td className="px-6 py-5" />
                    {cardPlans.map((p) => (
                      <td key={p.key} className={`px-4 py-5 text-center ${p.popular ? "saas-comp-pop" : ""}`}>
                        <Link to={`/register?plan=${p.key}&billing=monthly`}
                          className="saas-btn-primary group inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-semibold transition-colors"
                          style={p.popular
                            ? { background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, color: "#fff" }
                            : { background: V.surface2, color: V.ink, border: `1px solid ${V.line}` }}>
                          Choose <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="relative z-[1] py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-[clamp(28px,3.8vw,44px)] font-bold tracking-[-0.025em]" style={{ color: V.ink }}>
                Frequently asked questions
              </h2>
              <p className="mt-3 mx-auto max-w-[520px] text-[16.5px] leading-relaxed" style={{ color: V.inkSoft }}>
                Everything you need to know about plans and billing. Can't find what you're after? We're only a message away.
              </p>
            </div>
          </Reveal>

          <FaqList faqs={faqs} />
        </div>
      </section>

      {/* ── CTA ── */}
      <CtaSection primaryLabel="Start your portal" primaryTo="/register" />
    </div>
  );
}
