import React, { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Send, Mail, User, MessageSquare, FileText, CheckCircle } from "lucide-react";
import axiosInstance from "../../services/axios";
import { toast } from "react-hot-toast";

const V = {
  bg: "#F3F8F5", surface: "#FFFFFF", surface2: "#E7F2EC",
  line: "rgba(6,40,30,.08)", line2: "rgba(6,40,30,.04)",
  ink: "#102A23", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "#047857", primary2: "#065F46", accent: "#F59E0B",
  accentGlow: "rgba(245,158,11,.20)", success: "#059669",
};
const font = "'Outfit', system-ui, sans-serif";
const mono = "'JetBrains Mono', monospace";

const Reveal = ({ children, delay = 0, className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 1, delay, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </motion.div>
  );
};

const css = `
.saas-page h1,.saas-page h2,.saas-page h3,.saas-page h4,.saas-page h5,.saas-page h6{font-family:'Outfit',system-ui,sans-serif!important}
.saas-input{transition:border-color .3s,box-shadow .3s}
.saas-input:focus{border-color:rgba(4,120,87,.4);box-shadow:0 0 0 3px rgba(4,120,87,.12)}
.saas-submit{position:relative;overflow:hidden;transition:transform .3s}
.saas-submit:hover{transform:translateY(-1px)}
.saas-submit::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.50) 50%,transparent 65%);transform:translateX(-120%);transition:transform 1s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.saas-submit:hover::before{transform:translateX(120%)}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const up = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.post("/contact", form);
      setSent(true);
      toast.success("Message sent successfully!");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "saas-input w-full px-4 py-3 rounded-lg text-sm outline-none";

  return (
    <div className="saas-page" style={{ fontFamily: font, background: V.bg, color: V.ink, overflowX: "hidden", position: "relative", minHeight: "100vh" }}>
      <style>{css}</style>

      {/* Ambient grid + noise */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(15,23,42,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.05) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 .05  0 0 0 0 .05  0 0 0 0 .1  0 0 0 .035 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`, mixBlendMode: "multiply", opacity: 0.5 }} />

      {/* Hero glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full" style={{ top: "-5%", left: "60%", width: 600, height: 400, filter: "blur(90px)", background: "radial-gradient(circle, rgba(4,120,87,.35), transparent 60%)" }} />
        <div className="absolute rounded-full" style={{ top: "30%", left: "-10%", width: 400, height: 400, filter: "blur(90px)", background: "radial-gradient(circle, rgba(245,158,11,.20), transparent 60%)" }} />
      </div>

      {/* Header */}
      <section className="relative z-[1] pt-32 pb-8 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-[10.5px] tracking-[.08em] uppercase mb-4"
              style={{ fontFamily: mono, color: V.inkSoft, background: V.surface, border: `1px solid ${V.line}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: V.accent, boxShadow: `0 0 0 3px rgba(245,158,11,.25)` }} />
              Get in touch
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-[clamp(36px,5vw,56px)] font-medium tracking-[-0.03em] leading-[1.04] mb-4" style={{ color: V.ink }}>
              We'd love to hear from you
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: V.inkSoft }}>
              Have a question about the platform, pricing, or want to discuss your organisation's needs? Drop us a message.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Form + Info */}
      <section className="relative z-[1] pb-28 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">

          {/* Form card */}
          <Reveal>
            <div className="rounded-xl p-8 md:p-10" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04), 0 16px 40px -12px rgba(15,23,42,.08)` }}>
              {sent ? (
                <motion.div className="text-center py-12" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="w-16 h-16 rounded-full mx-auto mb-5 grid place-items-center" style={{ background: `rgba(5,150,105,.14)`, border: `1px solid rgba(5,150,105,.3)` }}>
                    <CheckCircle className="w-8 h-8" style={{ color: V.success }} />
                  </div>
                  <h3 className="text-xl font-medium mb-2" style={{ color: V.ink }}>Message sent!</h3>
                  <p className="text-sm" style={{ color: V.inkSoft }}>We'll get back to you as soon as possible.</p>
                  <button onClick={() => setSent(false)} className="mt-6 text-sm font-medium" style={{ color: V.primary }}>
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: V.ink }}>Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: V.inkFaint }} />
                        <input type="text" value={form.name} onChange={(e) => up("name", e.target.value)}
                          className={inputClass} style={{ background: V.bg, border: `1px solid ${V.line}`, color: V.ink, paddingLeft: 36 }}
                          placeholder="Your name" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: V.ink }}>Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: V.inkFaint }} />
                        <input type="email" value={form.email} onChange={(e) => up("email", e.target.value)}
                          className={inputClass} style={{ background: V.bg, border: `1px solid ${V.line}`, color: V.ink, paddingLeft: 36 }}
                          placeholder="you@example.com" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: V.ink }}>Subject</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: V.inkFaint }} />
                      <input type="text" value={form.subject} onChange={(e) => up("subject", e.target.value)}
                        className={inputClass} style={{ background: V.bg, border: `1px solid ${V.line}`, color: V.ink, paddingLeft: 36 }}
                        placeholder="How can we help?" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: V.ink }}>Message</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4 h-4" style={{ color: V.inkFaint }} />
                      <textarea value={form.message} onChange={(e) => up("message", e.target.value)} rows={5}
                        className={`${inputClass} resize-none`} style={{ background: V.bg, border: `1px solid ${V.line}`, color: V.ink, paddingLeft: 36 }}
                        placeholder="Tell us more about your inquiry..." />
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="saas-submit w-full py-3.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.30), 0 1px 2px rgba(0,0,0,.30), 0 12px 32px -8px rgba(4,120,87,.6)` }}>
                    {loading ? "Sending..." : "Send message"}
                    {!loading && <Send className="w-4 h-4" />}
                  </button>
                </form>
              )}
            </div>
          </Reveal>

          {/* Info sidebar */}
          <div className="space-y-4">
            <Reveal delay={0.2}>
              <div className="rounded-xl p-6" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                <div className="w-9 h-9 rounded-lg grid place-items-center mb-4" style={{ background: `rgba(4,120,87,.12)`, border: `1px solid rgba(4,120,87,.3)` }}>
                  <Mail className="w-5 h-5" style={{ color: V.primary }} />
                </div>
                <h4 className="font-medium mb-1" style={{ color: V.ink }}>Email us</h4>
                <p className="text-sm" style={{ color: V.inkSoft }}>support@ngoplatform.com</p>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="rounded-xl p-6" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                <div className="w-9 h-9 rounded-lg grid place-items-center mb-4" style={{ background: `rgba(245,158,11,.12)`, border: `1px solid rgba(245,158,11,.3)` }}>
                  <MessageSquare className="w-5 h-5" style={{ color: V.accent }} />
                </div>
                <h4 className="font-medium mb-1" style={{ color: V.ink }}>Response time</h4>
                <p className="text-sm" style={{ color: V.inkSoft }}>We typically respond within 24 hours during business days.</p>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="rounded-xl p-6" style={{ background: `radial-gradient(circle at 100% 0%, rgba(4,120,87,.15), transparent 50%), ${V.surface}`, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
                <h4 className="font-medium mb-2" style={{ color: V.ink }}>Ready to get started?</h4>
                <p className="text-sm mb-4" style={{ color: V.inkSoft }}>Skip the form and launch your portal in under 3 minutes.</p>
                <a href="/plans" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: V.primary }}>
                  View plans →
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
