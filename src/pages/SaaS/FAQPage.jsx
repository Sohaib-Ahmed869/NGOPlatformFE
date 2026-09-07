import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import CtaSection from "./CtaSection";
import { V, PageStyle, Reveal, PageHero } from "./ui";

const font = "var(--font-body, 'Outfit', system-ui, sans-serif)";
const mono = "'JetBrains Mono', monospace";

// Everything a prospective charity asks before signing up — merges the
// shorter teasers shown on Home/Plans/Contact into one complete answer set.
const faqs = [
  { q: "How do I get started?", a: "Fill out our quick enquiry form to express interest and our team will reach out to tailor a demo, plan and pricing for your organisation — or skip straight to self-serve signup and be live in minutes." },
  { q: "What happens after I express interest?", a: "Someone from our team will reach out by email or phone to understand your needs, answer any questions and walk you through a demo tailored to your organisation." },
  { q: "Can I change my plan later?", a: "Yes. You can upgrade or downgrade at any time from your admin dashboard. Changes take effect at the start of your next billing cycle." },
  { q: "Is there a transaction fee on donations?", a: "We never charge a platform fee on donations. Standard Stripe processing fees apply (typically 1.7% + 30c per transaction in Australia) — 100% of the remaining amount goes to your organisation." },
  { q: "How do my donors pay?", a: "Supporters can give by credit or debit card, Apple Pay, Google Pay, PayPal and bank transfer, all handled securely through Stripe." },
  { q: "How does the branded portal work?", a: "When you register, you choose a subdomain (e.g. yourcharity.ourplatform.com). Your donors visit this URL to see your organisation's donation pages, campaigns and events, fully branded with your identity." },
  { q: "Do you support recurring donations and installments?", a: "Yes — donors can set up a recurring donation or split a donation into installments, and everything is billed automatically from then on." },
  { q: "Can I set up my own giving categories?", a: "Yes. You decide the categories supporters choose from — specific appeals, funds, sponsorships or anything else your cause runs on — alongside the standard one-off, monthly and instalment options." },
  { q: "Can I cancel anytime?", a: "Yes. There are no lock-in contracts. You can cancel your subscription at any time and your portal stays active until the end of your current billing period." },
  { q: "Is my donor data safe?", a: "Absolutely. Each organisation's data is fully isolated, encrypted in transit and at rest, with role-based access and audit logs. Payment processing is handled by Stripe's PCI-compliant infrastructure." },
  { q: "Do I need technical skills to set this up?", a: "Not at all. Your portal, branding and campaigns are set up through simple forms, and most charities are live within minutes." },
];


/* Single-open, animated FAQ accordion — matches the home/plans page style. */
function FaqItem({ faq, index, isOpen, onToggle }) {
  return (
    <Reveal delay={index * 0.04}>
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
        <button type="button" onClick={onToggle} aria-expanded={isOpen}
          className="flex w-full items-center gap-4 px-6 py-5 text-left">
          <span className="text-[12px] font-bold tabular-nums transition-colors"
            style={{ fontFamily: mono, color: isOpen ? V.primary : V.inkFaint }}>
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
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
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

const css = `
.saas-page h1,.saas-page h2{font-weight:500!important}
.saas-faq2{transition:transform .35s ease,box-shadow .35s ease,border-color .35s ease,background .35s ease}
.saas-faq2:hover{transform:translateY(-2px)}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

export default function FAQPage() {
  return (
    <div className="saas-page" style={{ fontFamily: font, background: V.bg, color: V.ink, overflowX: "hidden", position: "relative", minHeight: "100vh" }}>
      <PageStyle />
      <style>{css}</style>

      {/* Page-wide ambient grid — matches the rest of the marketing site */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(15,23,42,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.05) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
      }} />

      {/* ── Header ── */}
      <div data-hero>
        <PageHero
          chip="Questions"
          title="Frequently asked questions"
          lede="Getting started, plans and billing, and how the platform works. Cannot find your answer? We are one message away."
        />
      </div>

      {/* ── FAQ list ── */}
      <section className="relative z-[1] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <FaqList faqs={faqs} />
        </div>
      </section>

      {/* ── CTA ── */}
      <CtaSection primaryLabel="Talk to sales" primaryTo="/get-started" secondaryLabel="See the plans" secondaryTo="/plans" />
    </div>
  );
}
