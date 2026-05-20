import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ArrowRight } from "lucide-react";

const V = {
  bg: "#F7F4FB", surface: "#FFFFFF", surface2: "#F2EDF8",
  line: "rgba(28,15,55,.08)", ink: "#1A0D2E", inkSoft: "#5B4A7A", inkFaint: "#9D90B5",
  primary: "#7C3AED", primary2: "#6D28D9", accent: "#DB2777", accentGlow: "rgba(219,39,119,.20)",
  success: "#059669",
};
const mono = "'JetBrains Mono', monospace";

export default function PlanCard({ plan, billingCycle }) {
  const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const perMonth = billingCycle === "annual" ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;

  return (
    <div
      className={`saas-price-card ${plan.popular ? "saas-price-featured" : "saas-price-regular"} rounded-[14px] p-8 flex flex-col h-full relative overflow-hidden`}
      style={{
        background: plan.popular
          ? `radial-gradient(circle at 100% 0%, rgba(124,58,237,.3), transparent 50%), linear-gradient(180deg, ${V.surface2}, ${V.surface})`
          : V.surface,
      }}
    >
      {plan.popular && (
        <span className="absolute top-4 right-4 px-2.5 py-1 rounded text-[10px] tracking-[.08em] uppercase font-bold"
          style={{ fontFamily: mono, background: V.accent, color: V.bg, boxShadow: `0 0 12px ${V.accentGlow}, inset 0 1px 0 rgba(255,255,255,.3)` }}>
          Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold tracking-tight" style={{ color: V.ink }}>{plan.name}</h3>
        <p className="text-[13.5px] leading-relaxed mt-1.5" style={{ color: V.inkSoft }}>{plan.description}</p>
      </div>

      <div className="mb-6 pb-6" style={{ borderBottom: `1px solid ${V.line}` }}>
        <div className="flex items-baseline gap-1.5">
          {/* Animated price number */}
          <AnimatePresence mode="wait">
            <motion.span
              key={perMonth}
              className="text-[44px] font-medium tracking-tight"
              style={{ color: V.ink }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            >
              ${perMonth}
            </motion.span>
          </AnimatePresence>
          <span className="text-[13px]" style={{ fontFamily: mono, color: V.inkFaint }}>/month</span>
        </div>
        <AnimatePresence>
          {billingCycle === "annual" && (
            <motion.div
              className="mt-1.5 flex items-center gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <span className="text-xs" style={{ fontFamily: mono, color: V.inkFaint }}>
                ${price} billed annually
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ color: V.success, background: "rgba(5,150,105,.14)", border: "1px solid rgba(5,150,105,.3)" }}>
                Save ${plan.monthlyPrice * 12 - plan.annualPrice}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ul className="space-y-0 mb-7 flex-1">
        {plan.features.map((feature) => (
          <li key={feature.name} className="flex items-center gap-2.5 py-2 text-[13.5px]" style={{ color: feature.included ? V.inkSoft : "#ccc" }}>
            {feature.included ? (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke={V.accent} strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
            ) : (
              <X className="w-3.5 h-3.5 shrink-0 text-gray-300" />
            )}
            {feature.name}
          </li>
        ))}
      </ul>

      <Link
        to={`/register?plan=${plan.key}&billing=${billingCycle}`}
        className={`saas-btn-primary group flex items-center justify-center gap-2 w-full py-3 rounded-lg text-[13.5px] font-semibold transition-colors`}
        style={plan.popular ? {
          background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, color: V.bg, border: "1px solid transparent",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,.3), 0 0 24px rgba(124,58,237,.4)`,
        } : {
          background: V.surface2, color: V.ink, border: `1px solid ${V.line}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,.06)`,
        }}
      >
        Get started
        <ArrowRight className="w-4 h-4 group-hover:translate-x-[3px] transition-transform duration-300" />
      </Link>
    </div>
  );
}
