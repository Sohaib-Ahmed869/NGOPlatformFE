import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { X, ArrowRight } from "lucide-react";
import { V } from "./ui";

const mono = "'JetBrains Mono', monospace";

/* Prices are Australian dollars. "A$" rather than a bare "$" because the
   schedule is quoted in AUD and the site sells to charities who will otherwise
   read a lone $ as USD — the enterprise plan was literally stored as `usd` in
   the plan collection before this, so the ambiguity is not hypothetical.
   en-AU grouping, no cents: every amount in the schedule is a whole dollar. */
const AUD = (n) => "A$" + Math.round(Number(n) || 0).toLocaleString("en-AU");

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
      onUpdate: () => { if (node) node.textContent = AUD(obj.v); },
    });
    prev.current = value;
    return () => tween.kill();
  }, [value]);
  return (
    <span ref={ref} className="text-[44px] font-medium tracking-tight" style={{ color: V.ink }}>
      {AUD(value)}
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
        <span className="absolute top-4 right-4 rounded-full px-2.5 py-1 text-[10px] tracking-[.08em] uppercase font-bold text-white"
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
                ≈ {AUD(perMonth)}/mo · billed yearly
              </span>
              <span className="rounded-full text-xs font-semibold px-2 py-0.5"
                style={{ color: V.success, background: "rgba(5,150,105,.14)", border: "1px solid rgba(5,150,105,.3)" }}>
                Save {AUD(plan.monthlyPrice * 12 - plan.annualPrice)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The rest of the published schedule, always visible and NOT tied to
            the billing toggle. The toggle changes which number is being sold;
            these three are what a charity is actually comparing between plans,
            and hiding two of them behind a switch is what made the old card
            unanswerable ("what does a year cost?"). Onboarding is a one-off and
            has no Stripe recurring price — it is invoiced separately. */}
        <dl className="mt-4 space-y-1.5">
          {[
            ["Annual, paid yearly", AUD(plan.annualPrice)],
            ["Equivalent per month", AUD(plan.annualPrice / 12)],
            ...(plan.onboardingFee ? [["Onboarding, one off", AUD(plan.onboardingFee)]] : []),
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 text-[12.5px]">
              <dt style={{ color: V.inkSoft }}>{label}</dt>
              <dd className="font-semibold" style={{ fontFamily: mono, color: V.ink }}>{value}</dd>
            </div>
          ))}
        </dl>
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
        to={`/get-started?plan=${plan.key}&billing=${billingCycle}`}
        className={`saas-btn-primary group flex items-center justify-center gap-2 w-full py-3 rounded-lg text-[13.5px] font-semibold transition-colors`}
        style={plan.popular ? {
          background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, color: V.bg, border: "1px solid transparent",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,.3), 0 0 24px rgba(var(--tenant-accent-rgb),.4)`,
        } : {
          background: V.surface2, color: V.ink, border: `1px solid ${V.line}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,.06)`,
        }}
      >
        Talk to sales
        <ArrowRight className="w-4 h-4 group-hover:translate-x-[3px] transition-transform duration-300" />
      </Link>
    </div>
  );
}
