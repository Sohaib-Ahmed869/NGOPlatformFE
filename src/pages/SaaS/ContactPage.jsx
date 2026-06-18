import React, { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Send, Mail, Phone, MapPin, CheckCircle, Clock, CalendarClock, ArrowRight, ChevronDown,
  Facebook, Instagram, Twitter, Linkedin,
} from "lucide-react";
import axiosInstance from "../../services/axios";
import { toast } from "react-hot-toast";
import { useTenant } from "../../context/TenantContext";

const V = {
  bg: "var(--tenant-bg, #F3F8F5)", surface: "#FFFFFF", surface2: "rgba(var(--tenant-accent-rgb), .08)",
  line: "rgba(var(--tenant-primary-rgb), .10)",
  ink: "var(--tenant-primary, #102A23)", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "var(--tenant-accent, #047857)", primary2: "var(--pf-accent-2, #065F46)", glow: "var(--tenant-accent-light, #059669)", accent: "var(--pf-gold, #F59E0B)",
  success: "#059669",
};
const font = "var(--font-body, 'Outfit', system-ui, sans-serif)";
const mono = "'JetBrains Mono', monospace";

const TOPICS = ["General enquiry", "Sales", "Support", "Partnership", "Press"];

// A few quick answers (mirrors the home FAQ) to deflect common questions.
const faqs = [
  { q: "Can I change my plan later?", a: "Yes — upgrade or downgrade anytime from your dashboard. Changes take effect on your next billing date." },
  { q: "Do you take a cut of donations?", a: "Never. There's no platform fee on donations — you only pay the standard payment-processing fee." },
  { q: "Do I need technical skills?", a: "Not at all. Your portal, branding and campaigns are set up through simple forms — most charities are live in minutes." },
  { q: "Is my donor data safe?", a: "Yes. Each charity's data is isolated and encrypted, with role-based access and audit logs." },
];

/* Single-open, animated FAQ accordion (mirrors the home page's style). */
function ContactFaq({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-2.5">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="saas-faqlite relative overflow-hidden"
            style={{
              background: isOpen ? `linear-gradient(180deg, rgba(var(--tenant-accent-rgb),.06), ${V.surface})` : V.surface,
              border: `1px solid ${isOpen ? "rgba(var(--tenant-accent-rgb),.35)" : V.line}`,
              boxShadow: isOpen ? "0 20px 44px -22px rgba(var(--tenant-accent-rgb),.4)" : "none",
            }}>
            {isOpen && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.glow})` }} />}
            <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}
              className="flex w-full items-center gap-4 px-6 py-5 text-left">
              <span className="text-[12px] font-bold tabular-nums transition-colors" style={{ fontFamily: mono, color: isOpen ? V.primary : V.inkFaint }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-[16px] font-semibold leading-snug transition-colors" style={{ color: isOpen ? V.primary : V.ink }}>{f.q}</span>
              <span className="grid h-8 w-8 shrink-0 place-items-center transition-all duration-300"
                style={{ background: isOpen ? V.primary : V.surface2, color: isOpen ? "#fff" : V.primary, border: `1px solid ${isOpen ? "transparent" : V.line}`, transform: isOpen ? "rotate(180deg)" : "none" }}>
                <ChevronDown className="h-4 w-4" />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div key="c" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }} style={{ overflow: "hidden" }}>
                  <p className="px-6 pb-5 pl-[3.4rem] text-[14px] leading-relaxed" style={{ color: V.inkSoft }}>{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

const Reveal = ({ children, delay = 0, className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.9, delay, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </motion.div>
  );
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
.saas-page h1,.saas-page h2,.saas-page h3,.saas-page h4,.saas-page h5,.saas-page h6{font-family:'Fraunces','Outfit',Georgia,serif!important;letter-spacing:-0.015em}
/* Sharp, editorial corners — force EVERY element square, overriding both the
   rounded-* utilities AND the [data-public-site] auto-rounding of borders/buttons/inputs. */
.saas-page, .saas-page *, .saas-page *::before, .saas-page *::after{border-radius:0 !important}
/* Underline input — straight edge, no box, accent on focus */
.saas-uline{width:100%;background:transparent;border:0;border-bottom:1px solid rgba(var(--tenant-primary-rgb),.18);padding:10px 2px;font-size:14px;color:var(--tenant-primary,#102A23);outline:none;transition:border-color .3s,box-shadow .3s}
.saas-uline::placeholder{color:#8AA89C}
.saas-uline:focus{border-bottom-color:var(--tenant-accent,#047857);box-shadow:0 1px 0 0 var(--tenant-accent,#047857)}
textarea.saas-uline{resize:none;line-height:1.6}
.saas-submit{position:relative;overflow:hidden;transition:transform .3s}
.saas-submit:hover{transform:translateY(-1px)}
.saas-submit::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.50) 50%,transparent 65%);transform:translateX(-120%);transition:transform 1s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.saas-submit:hover::before{transform:translateX(120%)}
.saas-faqlite{transition:border-color .3s,transform .3s}
.saas-faqlite:hover{transform:translateY(-2px)}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

export default function ContactPage() {
  const { platform } = useTenant();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [topic, setTopic] = useState(TOPICS[0]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const up = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const email = platform?.contactEmail || "support@ngoplatform.com";
  const phone = platform?.contactPhone || "";
  const address = platform?.address || "";
  const social = [
    { key: "facebook", href: platform?.socialLinks?.facebook, icon: Facebook },
    { key: "instagram", href: platform?.socialLinks?.instagram, icon: Instagram },
    { key: "twitter", href: platform?.socialLinks?.twitter, icon: Twitter },
    { key: "linkedin", href: platform?.socialLinks?.linkedin, icon: Linkedin },
  ].filter((s) => s.href);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in your name, email and message");
      return;
    }
    setLoading(true);
    try {
      // `topic` rides along as the subject — no backend change needed.
      await axiosInstance.post("/saas/contact", { ...form, subject: topic });
      setSent(true);
      toast.success("Message sent successfully!");
      setForm({ name: "", email: "", message: "" });
      setTopic(TOPICS[0]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  // Reusable contact-detail row for the dark panel.
  const InfoRow = ({ icon: Icon, label, value, href }) => {
    const inner = (
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center border border-white/15" style={{ color: "#fff" }}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">{label}</div>
          <div className="truncate text-[14px] text-white/90">{value}</div>
        </div>
      </div>
    );
    return href ? <a href={href} className="block transition-opacity hover:opacity-80">{inner}</a> : <div>{inner}</div>;
  };

  return (
    <div className="saas-page" style={{ fontFamily: font, background: V.bg, color: V.ink, overflowX: "hidden", position: "relative", minHeight: "100vh" }}>
      <style>{css}</style>

      {/* Subtle ambient grid (no blobs) */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(15,23,42,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.05) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)" }} />

      {/* ── Editorial split: dark brand panel + form ── */}
      <section data-hero className="relative z-[1] px-6 pb-20 pt-28">
        <Reveal className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 overflow-hidden border lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
            style={{ borderColor: V.line, boxShadow: "0 30px 70px -36px rgba(6,40,30,.4)" }}>

            {/* Left — dark brand panel */}
            <div className="relative overflow-hidden p-8 text-white sm:p-10"
              style={{ background: "linear-gradient(155deg, var(--tenant-primary, #102A23) 0%, #0A1A14 100%)" }}>
              {/* geometric corner shapes */}
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 border-2" style={{ borderColor: "rgba(255,255,255,.10)" }} />
              <div aria-hidden className="pointer-events-none absolute bottom-6 right-8 h-16 w-28 opacity-[.16]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.9) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
              <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-2 w-16" style={{ background: V.accent }} />

              <div className="relative">
                <span className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/55" style={{ fontFamily: mono }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: V.accent, boxShadow: `0 0 0 3px rgba(245,158,11,.25)` }} />
                  Get in touch
                </span>
                <h1 className="mt-5 text-[clamp(32px,4vw,46px)] font-semibold leading-[1.05] text-white">Let's talk.</h1>
                <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-white/75">
                  Questions about the platform, pricing or what's right for your organisation? Tell us what you're working on — a real person will get back to you.
                </p>

                <div className="mt-8 space-y-4">
                  <InfoRow icon={Mail} label="Email" value={email} href={`mailto:${email}`} />
                  {phone ? <InfoRow icon={Phone} label="Phone" value={phone} href={`tel:${phone}`} /> : null}
                  {address ? <InfoRow icon={MapPin} label="Office" value={address} /> : null}
                </div>

                <div className="mt-7 inline-flex items-center gap-2 border border-white/15 px-3 py-1.5 text-[12.5px] text-white/75">
                  <Clock className="h-3.5 w-3.5" style={{ color: V.accent }} /> Typically replies within 24 hours
                </div>

                {/* Book-a-call */}
                <div className="mt-7 border-t border-white/10 pt-6">
                  <p className="text-[13px] text-white/55">Prefer to talk it through?</p>
                  <a href={`mailto:${email}?subject=${encodeURIComponent("Book a 15-minute demo")}`}
                    className="group mt-2 inline-flex items-center gap-2 bg-white px-5 py-3 text-[14px] font-semibold" style={{ color: V.primary }}>
                    <CalendarClock className="h-4 w-4" /> Book a 15-min demo
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </div>

                {social.length > 0 && (
                  <div className="mt-7 flex gap-2.5">
                    {social.map((s) => {
                      const Icon = s.icon;
                      return (
                        <a key={s.key} href={s.href} target="_blank" rel="noreferrer"
                          className="grid h-10 w-10 place-items-center border border-white/15 text-white/60 transition-all hover:-translate-y-0.5 hover:border-white/40 hover:text-white">
                          <Icon className="h-4 w-4" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right — form */}
            <div className="p-8 sm:p-10" style={{ background: V.surface }}>
              {sent ? (
                <motion.div className="flex h-full flex-col items-center justify-center py-12 text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="mb-5 grid h-16 w-16 place-items-center" style={{ background: `rgba(5,150,105,.14)`, border: `1px solid rgba(5,150,105,.3)` }}>
                    <CheckCircle className="h-8 w-8" style={{ color: V.success }} />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold" style={{ color: V.ink }}>Message sent!</h3>
                  <p className="text-sm" style={{ color: V.inkSoft }}>Thanks for reaching out — we'll get back to you shortly.</p>
                  <button onClick={() => setSent(false)} className="mt-6 text-sm font-semibold" style={{ color: V.primary }}>Send another message</button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-7">
                  {/* Topic chips */}
                  <div>
                    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: V.inkFaint }}>What's this about?</p>
                    <div className="flex flex-wrap gap-2">
                      {TOPICS.map((t) => {
                        const on = topic === t;
                        return (
                          <button key={t} type="button" onClick={() => setTopic(t)}
                            className="px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
                            style={on
                              ? { background: V.primary, color: "#fff" }
                              : { background: V.surface2, color: V.inkSoft, border: `1px solid ${V.line}` }}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2">
                    <div>
                      <label htmlFor="cf-name" className="mb-1 block text-sm font-medium" style={{ color: V.ink }}>Name</label>
                      <input id="cf-name" type="text" value={form.name} onChange={(e) => up("name", e.target.value)} className="saas-uline" placeholder="Your name" />
                    </div>
                    <div>
                      <label htmlFor="cf-email" className="mb-1 block text-sm font-medium" style={{ color: V.ink }}>Email</label>
                      <input id="cf-email" type="email" value={form.email} onChange={(e) => up("email", e.target.value)} className="saas-uline" placeholder="you@example.com" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cf-message" className="mb-1 block text-sm font-medium" style={{ color: V.ink }}>Message</label>
                    <textarea id="cf-message" value={form.message} onChange={(e) => up("message", e.target.value)} rows={5} className="saas-uline" placeholder="Tell us a little about your organisation and how we can help…" />
                  </div>

                  <button type="submit" disabled={loading}
                    className="saas-submit flex w-full items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.30), 0 12px 28px -10px rgba(var(--tenant-accent-rgb),.5)` }}>
                    {loading ? "Sending…" : "Send message"}
                    {!loading && <Send className="h-4 w-4" />}
                  </button>
                </form>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Office + map (only when an address is configured) ── */}
      {address ? (
        <section className="relative z-[1] px-6 pb-20">
          <Reveal className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 overflow-hidden border md:grid-cols-[0.8fr_1.2fr]" style={{ borderColor: V.line, boxShadow: "0 24px 60px -36px rgba(6,40,30,.3)" }}>
              {/* info */}
              <div className="p-8 sm:p-10" style={{ background: V.surface }}>
                <span className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ fontFamily: mono, color: V.inkFaint }}>
                  <MapPin className="h-3.5 w-3.5" style={{ color: V.primary }} /> Visit us
                </span>
                <h2 className="mt-4 text-[clamp(22px,3vw,30px)] font-semibold" style={{ color: V.ink }}>Our office</h2>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: V.inkSoft }}>{address}</p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"
                  className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: V.primary }}>
                  Get directions <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
              {/* map (key-free Google embed, geocoded from the address) */}
              <div className="relative min-h-[300px]">
                <iframe title="Office location" className="absolute inset-0 h-full w-full" style={{ border: 0, filter: "grayscale(.25) contrast(1.05)" }}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=14&output=embed`}
                  loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* ── FAQ teaser ── */}
      <section className="relative z-[1] px-6 pb-28">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-[clamp(22px,3vw,30px)] font-semibold" style={{ color: V.ink }}>Common questions</h2>
            <a href="/#faq" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold" style={{ color: V.primary }}>
              See all FAQs <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </Reveal>
          <Reveal>
            <ContactFaq items={faqs} />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
