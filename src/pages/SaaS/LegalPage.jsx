import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTenant } from "../../context/TenantContext";

/* Palette mirrors the other SaaS pages — brand hues resolve to the platform
   design tokens so these pages theme with the rest of the marketing site. */
const V = {
  bg: "var(--tenant-bg, #F3F8F5)", surface: "#FFFFFF", surface2: "rgba(var(--tenant-accent-rgb), .08)",
  line: "rgba(var(--tenant-primary-rgb), .08)", line2: "rgba(var(--tenant-primary-rgb), .04)",
  ink: "var(--tenant-primary, #102A23)", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "var(--tenant-accent, #047857)", primary2: "var(--pf-accent-2, #065F46)", accent: "var(--pf-gold, #F59E0B)",
  success: "#059669",
};
const font = "var(--font-body, 'Outfit', system-ui, sans-serif)";

// Single source of truth for when these policies were last revised.
const LAST_UPDATED = "18 June 2026";

const Reveal = ({ children, delay = 0, className = "", id }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.08 });
  return (
    <motion.div ref={ref} id={id} className={className}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </motion.div>
  );
};

const css = `
.saas-page h1,.saas-page h2,.saas-page h3,.saas-page h4,.saas-page h5,.saas-page h6{font-family:var(--font-heading,'Outfit',system-ui,sans-serif)!important}
.legal-toc a{transition:color .25s,border-color .25s}
.legal-toc a:hover{color:var(--tenant-accent,#047857);border-color:rgba(var(--tenant-accent-rgb),.4)}
.legal-body p{margin-top:.85rem;line-height:1.75}
.legal-body ul{margin-top:.85rem;display:flex;flex-direction:column;gap:.55rem}
.legal-body li{display:flex;gap:.6rem;line-height:1.65}
.legal-body li::before{content:"";flex:none;margin-top:.6rem;width:6px;height:6px;border-radius:9999px;background:var(--tenant-accent,#047857)}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

/* ── Shared legal page layout: ambient hero + sticky table of contents + body.
   `sections` is [{ id, title, paras?: string[], bullets?: string[] }]. ── */
function LegalLayout({ title, intro, updated, sections }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const idsKey = sections.map((s) => s.id).join("|");

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Scroll-spy: the active section is the last one whose top has scrolled
  // above the band just under the navbar.
  useEffect(() => {
    const ids = idsKey.split("|");
    const onScroll = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) current = id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [idsKey]);

  const goTo = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" });
  };

  return (
    <div className="saas-page" style={{ fontFamily: font, background: V.bg, color: V.ink, minHeight: "100vh", position: "relative" }}>
      <style>{css}</style>

      {/* Ambient grid + noise (matches Contact/Plans) */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(15,23,42,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.05) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)" }} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full" style={{ top: "-6%", left: "58%", width: 560, height: 420, filter: "blur(100px)", background: "radial-gradient(circle, rgba(var(--tenant-accent-rgb),.26), transparent 62%)" }} />
        <div className="absolute rounded-full" style={{ top: "24%", left: "-8%", width: 420, height: 420, filter: "blur(100px)", background: "radial-gradient(circle, rgba(var(--tenant-accent-rgb),.14), transparent 62%)" }} />
      </div>

      {/* ── Hero ── */}
      <section data-hero className="relative z-[1] px-6 pt-24 pb-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h1 className="text-[clamp(36px,5vw,56px)] font-bold leading-[1.04] tracking-[-0.03em]" style={{ color: V.ink }}>{title}</h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-4 max-w-xl text-[16.5px] leading-relaxed" style={{ color: V.inkSoft }}>{intro}</p>
          </Reveal>
        </div>
      </section>

      {/* ── Body + sticky TOC ── */}
      <section className="relative z-[1] px-6 pb-28 pt-6">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[230px_1fr]">
          {/* Table of contents */}
          <aside className="hidden lg:block">
            <nav className="legal-toc sticky top-28 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: V.inkFaint }}>On this page</div>
              <div className="flex flex-col">
                {sections.map((s) => {
                  const on = s.id === activeId;
                  return (
                    <a key={s.id} href={`#${s.id}`}
                      onClick={(e) => { e.preventDefault(); goTo(s.id); }}
                      className="border-l-2 py-1.5 pl-3 text-[13.5px] transition-all duration-300"
                      style={on
                        ? { borderColor: V.primary, color: V.primary, fontWeight: 600, background: "rgba(var(--tenant-accent-rgb), .07)" }
                        : { borderColor: V.line, color: V.inkSoft }}>
                      {s.title}
                    </a>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* Sections */}
          <div className="min-w-0">
            <div className="legal-body rounded-none p-7 sm:p-10" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 16px 40px -20px rgba(15,23,42,.10)" }}>
              {sections.map((s, i) => (
                <Reveal key={s.id} id={s.id} delay={Math.min(i * 0.03, 0.2)} className="scroll-mt-28">
                  <div className={i > 0 ? "mt-10 border-t pt-10" : ""} style={i > 0 ? { borderColor: V.line } : undefined}>
                    <div className="flex items-baseline gap-3">
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: V.primary }}>{String(i + 1).padStart(2, "0")}</span>
                      <h2 className="text-[22px] font-bold tracking-[-0.01em]" style={{ color: V.ink }}>{s.title}</h2>
                    </div>
                    <div className="mt-1 text-[15px]" style={{ color: V.inkSoft }}>
                      {s.paras?.map((p, k) => <p key={k} dangerouslySetInnerHTML={{ __html: p }} />)}
                      {s.bullets && (
                        <ul>{s.bullets.map((b, k) => <li key={k}><span dangerouslySetInnerHTML={{ __html: b }} /></li>)}</ul>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <p className="mt-5 text-[13px]" style={{ color: V.inkFaint }}>Last updated {updated}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* Builds the dynamic "contact" closing section from the platform settings. */
function contactSection({ name, email, phone, address }) {
  const bullets = [`Email: <a style="color:var(--tenant-accent,#047857);font-weight:600" href="mailto:${email}">${email}</a>`];
  if (phone) bullets.push(`Phone: <a style="color:var(--tenant-accent,#047857);font-weight:600" href="tel:${phone}">${phone}</a>`);
  if (address) bullets.push(`Post: ${address}`);
  return {
    id: "contact",
    title: "Contact us",
    paras: [`If you have any questions about this policy, your data, or how ${name} works, we're happy to help — reach out any time:`],
    bullets,
  };
}

/* ═══════════════ PRIVACY ═══════════════ */
export function PrivacyPage() {
  const { platform } = useTenant();
  const name = platform?.name || "NGO Platform";
  const email = platform?.contactEmail || "support@ngoplatform.com";
  const phone = platform?.contactPhone || "";
  const address = platform?.address || "";

  const sections = [
    { id: "intro", title: "Introduction", paras: [
      `This Privacy Policy explains how ${name} ("we", "us", "our") collects, uses, shares and protects information when you visit our website, create an account, or use our platform to run your charity's fundraising.`,
      `We've written it in plain language. By using ${name}, you agree to the practices described here.`,
    ] },
    { id: "data-we-collect", title: "Information we collect", paras: [
      "We only collect what we need to provide and improve the service:",
    ], bullets: [
      "<strong>Account &amp; organisation details</strong> — your name, email, charity name, web address and the colours/logo you choose.",
      "<strong>Donor records you manage</strong> — the supporter information your charity adds or receives through its portal (names, emails, giving history).",
      "<strong>Payment information</strong> — processed securely by our payment provider (Stripe). We never see or store full card numbers.",
      "<strong>Usage data</strong> — pages visited, features used and basic device/browser information, to keep the service reliable and secure.",
      "<strong>Communications</strong> — messages you send us through support or contact forms.",
    ] },
    { id: "how-we-use", title: "How we use your information", bullets: [
      "Provide, operate and maintain your branded donation portal.",
      "Process donations and send automatic receipts and thank-you emails.",
      "Respond to support requests and important service notices.",
      "Improve performance, security and the features we offer.",
      "Meet our legal, accounting and regulatory obligations.",
    ] },
    { id: "roles", title: "Our role & your role", paras: [
      `For data about <em>your charity's account</em>, ${name} is the data controller. For the <em>donor data your charity collects</em> through its portal, your charity is the controller and ${name} acts as a processor that handles it on your instructions, under our agreement with you.`,
    ] },
    { id: "sharing", title: "How we share information", paras: [
      "We do not sell your data. We share it only with trusted providers that help us run the service, and only as needed:",
    ], bullets: [
      "<strong>Payment processing</strong> — Stripe (and PayPal where enabled), under their own privacy terms.",
      "<strong>Email delivery</strong> — to send receipts, notifications and campaign updates.",
      "<strong>Hosting &amp; infrastructure</strong> — to store and serve the platform securely.",
      "<strong>Legal</strong> — where required by law, or to protect rights, safety and the integrity of the service.",
    ] },
    { id: "cookies", title: "Cookies", paras: [
      "We use essential cookies to keep you signed in and to keep the service secure, plus a small amount of analytics to understand how the platform is used. You can control cookies through your browser settings; disabling essential cookies may affect how the site works.",
    ] },
    { id: "security", title: "How we protect your data", paras: [
      "Each charity's data is isolated from every other tenant. Information is encrypted in transit and at rest, access is role-based and logged, and payments run on our provider's PCI-compliant infrastructure. No system is perfectly secure, but we work hard to keep your data safe.",
    ] },
    { id: "retention", title: "Data retention", paras: [
      "We keep your information for as long as your account is active and for a reasonable period afterwards to meet legal, tax and accounting requirements. When data is no longer needed, we delete or anonymise it.",
    ] },
    { id: "your-rights", title: "Your rights", paras: [
      "Depending on where you live, you may have the right to:",
    ], bullets: [
      "Access the personal data we hold about you.",
      "Correct information that's inaccurate or out of date.",
      "Request deletion of your data, subject to our legal obligations.",
      "Receive a copy of your data in a portable format.",
      "Object to, or restrict, certain processing.",
    ] },
    { id: "international", title: "International transfers", paras: [
      "Your information may be processed in countries other than your own. Where it is, we use appropriate safeguards so it remains protected to the standard described in this policy.",
    ] },
    { id: "children", title: "Children's privacy", paras: [
      "The platform is intended for charities and adults acting on their behalf. It is not directed at children, and we do not knowingly collect personal data from children.",
    ] },
    { id: "changes", title: "Changes to this policy", paras: [
      "We may update this policy from time to time. When we make material changes, we'll update the date at the top and, where appropriate, let you know through the platform.",
    ] },
    contactSection({ name, email, phone, address }),
  ];

  return (
    <LegalLayout
      title="Privacy Policy"
      intro={`How ${name} collects, uses and safeguards information — explained simply.`}
      updated={LAST_UPDATED}
      sections={sections}
    />
  );
}

/* ═══════════════ TERMS ═══════════════ */
export function TermsPage() {
  const { platform } = useTenant();
  const name = platform?.name || "NGO Platform";
  const email = platform?.contactEmail || "support@ngoplatform.com";
  const phone = platform?.contactPhone || "";
  const address = platform?.address || "";

  const sections = [
    { id: "acceptance", title: "Acceptance of terms", paras: [
      `These Terms of Service ("Terms") govern your access to and use of ${name} (the "Service"). By creating an account or using the Service, you agree to these Terms. If you're using the Service on behalf of an organisation, you confirm you're authorised to bind that organisation.`,
    ] },
    { id: "the-service", title: "The Service", paras: [
      `${name} provides charities and non-profits with a branded donation portal and tools to accept donations, manage donors, run campaigns and events, and report on results. We may add, change or remove features over time to improve the Service.`,
    ] },
    { id: "accounts", title: "Accounts & eligibility", bullets: [
      "You must provide accurate information and keep your account details up to date.",
      "You're responsible for safeguarding your login credentials and for all activity under your account.",
      "You must be legally able to enter into these Terms and use the Service in compliance with the law.",
    ] },
    { id: "plans-billing", title: "Plans & billing", bullets: [
      "Paid plans are billed in advance on a recurring monthly or annual basis until cancelled.",
      "You can upgrade, downgrade or cancel at any time; changes take effect from your next billing date.",
      "Fees are exclusive of taxes, which may be added where applicable.",
      "Except where required by law, fees already paid are non-refundable.",
    ] },
    { id: "donations-fees", title: "Donations & processing fees", paras: [
      `${name} does not charge a platform fee on donations. Standard payment-processing fees from our providers (such as Stripe) still apply and are deducted per transaction.`,
      "Your charity is responsible for the accuracy of its campaigns, for issuing valid receipts, and for using donated funds in line with its stated purpose and applicable law.",
    ] },
    { id: "acceptable-use", title: "Acceptable use", paras: [
      "You agree not to use the Service to:",
    ], bullets: [
      "Break the law or facilitate fraud, money laundering or deceptive fundraising.",
      "Upload harmful code, attempt to disrupt the Service, or access it without authorisation.",
      "Misrepresent your identity, your charity, or how donations will be used.",
      "Infringe the intellectual property or privacy rights of others.",
    ] },
    { id: "your-content", title: "Your content", paras: [
      "You keep ownership of the content you add — your logo, text, images, campaigns and donor records. You grant us a limited licence to host and display that content solely to operate the Service for you.",
    ] },
    { id: "ip", title: "Our intellectual property", paras: [
      `The Service itself — including the platform, software, design and ${name} branding — belongs to us and our licensors. These Terms don't grant you any rights to it except the right to use the Service as described.`,
    ] },
    { id: "third-party", title: "Third-party services", paras: [
      "The Service integrates with third parties such as Stripe and PayPal for payments. Your use of those services is also governed by their terms, and we're not responsible for their acts or omissions.",
    ] },
    { id: "termination", title: "Suspension & termination", paras: [
      "You may cancel at any time. We may suspend or terminate access if these Terms are breached, if required by law, or to protect the Service and its users. On termination, your right to use the Service stops; we'll make your data available for export for a reasonable period where practical.",
    ] },
    { id: "disclaimers", title: "Disclaimers", paras: [
      "The Service is provided “as is” and “as available”. To the fullest extent permitted by law, we disclaim warranties of any kind and do not guarantee the Service will be uninterrupted, error-free or fit for a particular purpose.",
    ] },
    { id: "liability", title: "Limitation of liability", paras: [
      `To the fullest extent permitted by law, ${name} will not be liable for indirect, incidental or consequential losses, or for lost profits or data. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim.`,
    ] },
    { id: "indemnity", title: "Indemnification", paras: [
      `You agree to indemnify and hold ${name} harmless from claims arising out of your use of the Service, your content, or your breach of these Terms or applicable law.`,
    ] },
    { id: "governing-law", title: "Governing law", paras: [
      "These Terms are governed by the laws of the jurisdiction in which we operate, without regard to conflict-of-laws rules. Courts of that jurisdiction will have exclusive jurisdiction over any disputes.",
    ] },
    { id: "changes", title: "Changes to these terms", paras: [
      "We may update these Terms from time to time. When we make material changes, we'll update the date above and, where appropriate, notify you. Continuing to use the Service means you accept the updated Terms.",
    ] },
    contactSection({ name, email, phone, address }),
  ];

  return (
    <LegalLayout
      title="Terms of Service"
      intro={`The terms for using ${name} — what you can expect from us, and what we ask of you.`}
      updated={LAST_UPDATED}
      sections={sections}
    />
  );
}
