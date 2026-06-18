import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { Check, X, ArrowRight } from "lucide-react";

const V = {
  bg: "var(--tenant-bg, #F3F8F5)", surface: "#FFFFFF", surface2: "rgba(var(--tenant-accent-rgb), .08)",
  line: "rgba(var(--tenant-primary-rgb), .08)", ink: "var(--tenant-primary, #102A23)", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "var(--tenant-accent, #047857)", primary2: "var(--pf-accent-2, #065F46)", accent: "var(--pf-gold, #F59E0B)", accentGlow: "rgba(245,158,11,.20)",
  success: "#059669",
};
const mono = "'JetBrains Mono', monospace";

/* GSAP count-up that rolls from the previous price to the new one — fires on
   mount (0 → price) and again whenever the billing cycle flips the amount. */
function PriceCounter({ value }) {
  const ref = useRef(null);
  const prev = useRef(0);
  useEffect(() => {
    const node = ref.current;
    const obj = { v: prev.current };
    const tween = gsap.to(obj, {
      v: value, duration: 0.8, ease: "power2.out",
      onUpdate: () => { if (node) node.textContent = "$" + Math.round(obj.v).toLocaleString("en-US"); },
    });
    prev.current = value;
    return () => tween.kill();
  }, [value]);
  return (
    <span ref={ref} className="text-[44px] font-medium tracking-tight" style={{ color: V.ink }}>
      {"$" + value.toLocaleString("en-US")}
    </span>
  );
}

export default function PlanCard({ plan, billingCycle }) {
  const annual = billingCycle === "annual";
  const bigPrice = annual ? plan.annualPrice : plan.monthlyPrice;
  const perMonth = annual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;

  return (
    <div
      className={`saas-price-card ${plan.popular ? "saas-price-featured" : "saas-price-regular"} rounded-[14px] p-8 flex flex-col h-full relative overflow-hidden`}
      style={{
        background: plan.popular
          ? `radial-gradient(circle at 100% 0%, rgba(var(--tenant-accent-rgb),.3), transparent 50%), linear-gradient(180deg, ${V.surface2}, ${V.surface})`
          : V.surface,
      }}
    >
      {plan.popular && (
        <span className="absolute top-4 right-4 px-2.5 py-1 text-[10px] tracking-[.08em] uppercase font-bold text-white"
          style={{ fontFamily: mono, background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 6px 16px -6px rgba(var(--tenant-accent-rgb),.5)` }}>
          Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold tracking-tight" style={{ color: V.ink }}>{plan.name}</h3>
        <p className="text-[13.5px] leading-relaxed mt-1.5" style={{ color: V.inkSoft }}>{plan.description}</p>
      </div>

      <div className="mb-6 pb-6" style={{ borderBottom: `1px solid ${V.line}` }}>
        <div className="flex items-baseline gap-1.5">
          {/* GSAP count-up price — the actual selected-cycle total */}
          <PriceCounter value={bigPrice} />
          <span className="text-[13px]" style={{ fontFamily: mono, color: V.inkFaint }}>{annual ? "/year" : "/month"}</span>
        </div>
        <AnimatePresence>
          {annual && (
            <motion.div
              className="mt-1.5 flex items-center gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <span className="text-xs" style={{ fontFamily: mono, color: V.inkFaint }}>
                ≈ ${perMonth}/mo · billed yearly
              </span>
              <span className="text-xs font-semibold px-2 py-0.5"
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
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke={V.primary} strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
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
          boxShadow: `inset 0 1px 0 rgba(255,255,255,.3), 0 0 24px rgba(var(--tenant-accent-rgb),.4)`,
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
