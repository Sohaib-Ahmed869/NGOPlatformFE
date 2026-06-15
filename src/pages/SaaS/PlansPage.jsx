import React, { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Check, X, ChevronDown, Shield, Zap, Headphones } from "lucide-react";
import PlanCard from "./PlanCard";

const V = {
  bg: "#F3F8F5", surface: "#FFFFFF", surface2: "#E7F2EC",
  line: "rgba(6,40,30,.08)", line2: "rgba(6,40,30,.04)",
  ink: "#102A23", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "#047857", primary2: "#065F46", accent: "#F59E0B",
  success: "#059669",
};
const font = "'Times New Roman', Tinos, Times, serif";
const mono = "'JetBrains Mono', monospace";

/* Scroll-reveal — same as homepage */
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
/* Override global index.css h1-h6 font-heading (Cormorant Garamond) */
.saas-page h1, .saas-page h2, .saas-page h3, .saas-page h4, .saas-page h5, .saas-page h6 {
  font-family: 'Times New Roman', Tinos, Times, serif !important;
}

/* Regular (non-featured) price cards */
.saas-price-regular {
  border: 1px solid rgba(6,40,30,.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 4px 16px -4px rgba(4,120,87,.06);
  transition: transform .4s ease, border-color .3s, box-shadow .4s ease;
}
.saas-price-regular:hover {
  transform: translateY(-4px);
  border-color: rgba(4,120,87,.3);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.04),
    0 0 0 1px rgba(4,120,87,.15),
    0 8px 24px -4px rgba(4,120,87,.15),
    0 20px 50px -12px rgba(4,120,87,.12);
}

/* Featured (popular) price card */
.saas-price-featured {
  border: 1px solid rgba(4,120,87,.4);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 0 0 1px rgba(4,120,87,.25),
    0 8px 32px -8px rgba(4,120,87,.3),
    0 24px 60px -20px rgba(4,120,87,.2);
  transition: transform .4s ease, border-color .3s, box-shadow .4s ease;
}
.saas-price-featured:hover {
  transform: translateY(-4px);
  border-color: rgba(4,120,87,.6);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 0 0 1px rgba(4,120,87,.4),
    0 0 40px -4px rgba(4,120,87,.25),
    0 28px 70px -20px rgba(4,120,87,.35);
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
.saas-faq-item:hover { border-color: rgba(4,120,87,.15); }

.saas-comp-table { transition: box-shadow .4s; }
.saas-comp-table:hover { box-shadow: 0 12px 28px -12px rgba(15,23,42,.1); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

const plans = [
  { name: "Basic", key: "basic", monthlyPrice: 200, annualPrice: 1920, description: "Perfect for small organisations just getting started with online fundraising",
    features: [
      { name: "Up to 3 campaigns", included: true }, { name: "Donation processing (Stripe)", included: true },
      { name: "Donor management", included: true }, { name: "Automated email receipts", included: true },
      { name: "Branded subdomain portal", included: true }, { name: "Admin dashboard", included: true },
      { name: "Volunteer management", included: false }, { name: "Program follow-up updates", included: false },
      { name: "Priority support", included: false },
    ] },
  { name: "Professional", key: "professional", monthlyPrice: 500, annualPrice: 4800, popular: true,
    description: "For growing organisations with active campaigns and team collaboration needs",
    features: [
      { name: "Up to 5 campaigns", included: true }, { name: "Donation processing (Stripe)", included: true },
      { name: "Donor management", included: true }, { name: "Automated email receipts", included: true },
      { name: "Branded subdomain portal", included: true }, { name: "Admin dashboard", included: true },
      { name: "Up to 10 volunteers", included: true }, { name: "Program follow-up updates", included: true },
      { name: "Priority support", included: false },
    ] },
  { name: "Enterprise", key: "enterprise", monthlyPrice: 1000, annualPrice: 9600,
    description: "For established organisations that need unlimited capacity and premium support",
    features: [
      { name: "Unlimited campaigns", included: true }, { name: "Donation processing (Stripe)", included: true },
      { name: "Donor management", included: true }, { name: "Automated email receipts", included: true },
      { name: "Branded subdomain portal", included: true }, { name: "Admin dashboard", included: true },
      { name: "Unlimited volunteers", included: true }, { name: "Program follow-up updates", included: true },
      { name: "Priority support", included: true },
    ] },
];

const comparisonFeatures = [
  { name: "Campaigns", basic: "3", professional: "5", enterprise: "Unlimited" },
  { name: "Volunteers", basic: "-", professional: "10", enterprise: "Unlimited" },
  { name: "Donation types", basic: "All", professional: "All", enterprise: "All" },
  { name: "Branded portal", basic: true, professional: true, enterprise: true },
  { name: "Email receipts", basic: true, professional: true, enterprise: true },
  { name: "Recurring donations", basic: true, professional: true, enterprise: true },
  { name: "Installment plans", basic: true, professional: true, enterprise: true },
  { name: "Donor follow-ups", basic: false, professional: true, enterprise: true },
  { name: "Volunteer management", basic: false, professional: true, enterprise: true },
  { name: "Event management", basic: true, professional: true, enterprise: true },
  { name: "Product / merch store", basic: true, professional: true, enterprise: true },
  { name: "Priority support", basic: false, professional: false, enterprise: true },
];

const faqs = [
  { q: "Can I switch plans later?", a: "Yes. You can upgrade or downgrade your plan at any time from your admin dashboard. Changes take effect at the start of your next billing cycle." },
  { q: "What payment methods do my donors get?", a: "All plans include Stripe-powered credit/debit card processing (Visa, Mastercard, Amex), bank transfers, and PayPal. Your donors can also set up recurring donations and installment plans." },
  { q: "Is there a transaction fee on donations?", a: "We do not charge any platform transaction fee. Standard Stripe processing fees apply (typically 1.7% + 30c per transaction in Australia). 100% of the remaining amount goes to your organisation." },
  { q: "How does the branded portal work?", a: "When you register, you choose a subdomain (e.g., yourcharity.ourplatform.com). Your donors visit this URL to see your organisation's donation pages, campaigns, and events — fully branded with your identity." },
  { q: "Can I cancel anytime?", a: "Yes. There are no lock-in contracts. You can cancel your subscription at any time and your portal will remain active until the end of your current billing period." },
  { q: "Is my donor data safe?", a: "Absolutely. Each organisation's data is completely isolated. We use industry-standard encryption, and all payment processing is handled by Stripe's PCI-compliant infrastructure." },
];

export default function PlansPage() {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [openFaq, setOpenFaq] = useState(null);

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
      <section className="relative z-[1] pt-32 pb-8 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <span className="inline-block px-2.5 py-1 rounded text-[10.5px] tracking-[.08em] uppercase mb-4"
              style={{ fontFamily: mono, color: V.inkSoft, background: V.surface, border: `1px solid ${V.line}` }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-2" style={{ background: V.accent, boxShadow: `0 0 0 3px rgba(245,158,11,.25)` }} />
              Pricing
            </span>
          </Reveal>
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
            <div className="inline-flex items-center rounded-[10px] p-1.5 relative"
              style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(15,23,42,.04)` }}>
              {/* Sliding background pill */}
              <motion.div
                className="absolute top-1.5 bottom-1.5 rounded-lg"
                style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 1px 4px rgba(4,120,87,.4)` }}
                animate={{ left: billingCycle === "monthly" ? 6 : "50%", right: billingCycle === "annual" ? 6 : "50%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              <motion.button
                onClick={() => setBillingCycle("monthly")}
                className="relative z-10 px-6 py-2.5 text-sm font-medium rounded-lg"
                animate={{ color: billingCycle === "monthly" ? "#fff" : V.inkSoft }}
                transition={{ duration: 0.2, delay: billingCycle === "monthly" ? 0.08 : 0 }}
              >
                Monthly
              </motion.button>
              <motion.button
                onClick={() => setBillingCycle("annual")}
                className="relative z-10 px-6 py-2.5 text-sm font-medium rounded-lg"
                animate={{ color: billingCycle === "annual" ? "#fff" : V.inkSoft }}
                transition={{ duration: 0.2, delay: billingCycle === "annual" ? 0.08 : 0 }}
              >
                Annual
                <motion.span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded inline-block"
                  style={{ fontFamily: mono }}
                  animate={{
                    color: billingCycle === "annual" ? "rgba(255,255,255,.8)" : V.success,
                    backgroundColor: billingCycle === "annual" ? "rgba(255,255,255,.15)" : "rgba(5,150,105,.14)",
                  }}
                  transition={{ duration: 0.2, delay: billingCycle === "annual" ? 0.08 : 0 }}
                >
                  -20%
                </motion.span>
              </motion.button>
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
          {plans.map((plan, i) => (
            <motion.div key={plan.key} variants={fadeUpChild} custom={i}>
              <PlanCard plan={plan} billingCycle={billingCycle} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Guarantees ── */}
      <section className="relative z-[1] py-12" style={{ borderTop: `1px solid ${V.line}`, borderBottom: `1px solid ${V.line}` }}>
        <Reveal>
          <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Shield, text: "No hidden fees" },
              { icon: Zap, text: "Cancel anytime" },
              { icon: Headphones, text: "Email support on all plans" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full grid place-items-center"
                  style={{ background: "rgba(5,150,105,.14)", border: "1px solid rgba(5,150,105,.3)" }}>
                  <item.icon className="w-4 h-4" style={{ color: V.success }} />
                </div>
                <span className="text-sm font-medium" style={{ color: V.ink }}>{item.text}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Feature comparison table ── */}
      <section className="relative z-[1] py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <span className="inline-block px-2 py-1 rounded text-xs tracking-[.08em] mb-3"
                style={{ fontFamily: mono, color: V.inkFaint, background: V.surface, border: `1px solid ${V.line}` }}>
                COMPARE
              </span>
              <h2 className="text-[clamp(28px,3.5vw,42px)] font-medium tracking-[-0.025em]" style={{ color: V.ink }}>
                Compare all features
              </h2>
              <p className="mt-3" style={{ color: V.inkSoft }}>A detailed look at what each plan includes.</p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="saas-comp-table rounded-xl overflow-hidden"
              style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${V.line}` }}>
                    <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: V.ink }}>Feature</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold" style={{ color: V.ink }}>Basic</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold" style={{ color: V.primary }}>Professional</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold" style={{ color: V.ink }}>Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, i) => (
                    <tr key={feature.name} style={{ borderBottom: `1px solid ${V.line2}`, background: i % 2 === 0 ? "rgba(6,40,30,.02)" : "transparent" }}>
                      <td className="px-6 py-3 text-sm" style={{ color: V.ink }}>{feature.name}</td>
                      {["basic", "professional", "enterprise"].map((plan) => {
                        const val = feature[plan];
                        return (
                          <td key={plan} className="px-4 py-3 text-center">
                            {typeof val === "boolean" ? (
                              val ? <Check className="w-4 h-4 mx-auto" style={{ color: V.accent }} /> : <X className="w-4 h-4 text-gray-300 mx-auto" />
                            ) : (
                              <span className="text-sm font-medium" style={{ color: V.ink }}>{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
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
              <span className="inline-block px-2 py-1 rounded text-xs tracking-[.08em] mb-3"
                style={{ fontFamily: mono, color: V.inkFaint, background: V.surface, border: `1px solid ${V.line}` }}>
                FAQ
              </span>
              <h2 className="text-[clamp(28px,3.5vw,42px)] font-medium tracking-[-0.025em]" style={{ color: V.ink }}>
                Frequently asked questions
              </h2>
              <p className="mt-3" style={{ color: V.inkSoft }}>Got questions? We've got answers.</p>
            </div>
          </Reveal>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="saas-faq-item rounded-[10px] overflow-hidden"
                  style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-5 text-left"
                  >
                    <span className="text-[16px] font-medium tracking-tight pr-4" style={{ color: V.ink }}>{faq.q}</span>
                    <motion.span
                      className="w-[22px] h-[22px] rounded-md grid place-items-center text-sm shrink-0"
                      style={{ background: openFaq === i ? V.accent : V.surface2, border: `1px solid ${openFaq === i ? "transparent" : V.line}`, color: openFaq === i ? V.bg : V.inkSoft }}
                      animate={{ rotate: openFaq === i ? 45 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed" style={{ color: V.inkSoft }}>{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
