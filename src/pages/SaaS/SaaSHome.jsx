import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  Heart, Users, ArrowRight, Check, Sparkles,
  Shield, Palette, Target, CreditCard, Calendar, Megaphone,
  BarChart3, LifeBuoy, Quote, HandHeart,
} from "lucide-react";

/* ── Emerald charity palette ── */
const V = {
  bg: "#F3F8F5", surface: "#FFFFFF", surface2: "#E7F2EC",
  line: "rgba(6,40,30,.10)", line2: "rgba(6,40,30,.05)",
  ink: "#102A23", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "#047857", primary2: "#065F46",
  accent: "#F59E0B", accentSoft: "#FEF3C7", accentGlow: "rgba(245,158,11,.22)",
  success: "#059669",
};
const font = "'Outfit', system-ui, sans-serif";

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
.saas-page h1,.saas-page h2,.saas-page h3,.saas-page h4,.saas-page h5,.saas-page h6{
  font-family:'Outfit',system-ui,sans-serif !important;
}
@keyframes saas-float1{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes saas-float2{0%,100%{transform:translateY(0)}50%{transform:translateY(10px)}}
.saas-card{transition:transform .4s ease,border-color .4s ease,box-shadow .4s ease}
.saas-card:hover{transform:translateY(-4px);border-color:rgba(4,120,87,.28);box-shadow:0 18px 40px -16px rgba(4,120,87,.22)}
.saas-btn-primary{position:relative;overflow:hidden}
.saas-btn-primary::before{content:"";position:absolute;inset:0;
  background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%);
  transform:translateX(-120%);transition:transform 1s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.saas-btn-primary:hover::before{transform:translateX(120%)}
.saas-step{transition:transform .4s ease,box-shadow .4s ease}
.saas-step:hover{transform:translateY(-4px);box-shadow:0 18px 40px -16px rgba(4,120,87,.2)}
.saas-faq summary::-webkit-details-marker{display:none}
.saas-faq-plus{transition:transform .3s,background .3s,color .3s}
details[open] .saas-faq-plus{transform:rotate(45deg);background:${V.primary};color:#fff;border-color:transparent}
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
    <Badge icon={badgeIcon} center={center}>{badge}</Badge>
    <h2 className="mt-5 text-[clamp(30px,4vw,50px)] leading-[1.08] font-bold tracking-[-0.02em]"
      style={{ color: V.ink }} dangerouslySetInnerHTML={{ __html: title }} />
    {subtitle && (
      <p className={`mt-4 text-[16.5px] leading-relaxed ${center ? "mx-auto" : ""} max-w-[560px]`}
        style={{ color: V.inkSoft }}>{subtitle}</p>
    )}
  </Reveal>
);

/* ── Data ── */
const heroStats = [
  { label: "Raised for good causes", value: "$2.4M+" },
  { label: "Charities on the platform", value: "500+" },
  { label: "Donors reached", value: "180K+" },
  { label: "Countries served", value: "32" },
];

const features = [
  { icon: CreditCard, title: "Simple donations", desc: "Accept one-time, monthly and instalment gifts. Receipts and thank-you emails are sent automatically — no spreadsheets." },
  { icon: Users, title: "Know your donors", desc: "Every supporter in one place: giving history, contact details and the causes closest to their heart." },
  { icon: Palette, title: "Your brand, your portal", desc: "Your own web address, your logo and your colours. Donors see your charity — never us." },
  { icon: Target, title: "Campaigns that inspire", desc: "Set a goal, watch the progress bar fill, and share updates that keep supporters connected to the impact." },
  { icon: Calendar, title: "Events & volunteers", desc: "Run fundraisers and drives, manage sign-ups and coordinate your volunteer team with ease." },
  { icon: BarChart3, title: "Clear insights", desc: "See what's working at a glance — donations over time, recurring supporters and campaign results." },
];

const steps = [
  { n: "1", icon: Sparkles, title: "Create your charity space", desc: "Pick a plan, choose your web address and set up your admin account. You'll be ready in a few minutes." },
  { n: "2", icon: Palette, title: "Make it yours", desc: "Add your logo, choose your colours and launch your first campaign — no design or tech skills needed." },
  { n: "3", icon: Heart, title: "Start receiving gifts", desc: "Share your page. Donations arrive securely, receipts go out automatically, and supporters stay updated." },
];

const programs = [
  { title: "Clean Water for Every Village", pct: 78, raised: "$38,500", goal: "$50,000", donors: 312 },
  { title: "Keep Children in School", pct: 45, raised: "$22,500", goal: "$50,000", donors: 184 },
  { title: "Emergency Flood Relief", pct: 92, raised: "$92,000", goal: "$100,000", donors: 538 },
];

const testimonials = [
  { quote: "We moved off spreadsheets and our monthly donations grew by 40% in the first quarter. Supporters love how easy giving has become.", author: "Sarah Mitchell", role: "Director · Hope Bridge", initials: "SM" },
  { quote: "Our donors finally see our charity, not a generic payment page. That trust shows up in every campaign we run.", author: "Ahmed Al-Rahman", role: "Operations · Mercy Global", initials: "AR" },
  { quote: "Sharing campaign updates keeps people connected to the cause. Supporter retention has never been higher.", author: "Maria Santos", role: "Fundraising · Bright Future", initials: "MS" },
];

const pricingPlans = [
  { tier: "Basic", desc: "For small charities getting started.", price: "$200", features: ["Up to 3 campaigns", "Donation processing", "Donor management", "Your branded portal", "Admin dashboard"] },
  { tier: "Professional", desc: "For growing charities running active appeals.", price: "$500", popular: true, features: ["Up to 5 campaigns", "Everything in Basic", "Up to 10 volunteers", "Campaign updates", "Event management"] },
  { tier: "Enterprise", desc: "For established charities operating at scale.", price: "$1000", features: ["Unlimited campaigns", "Everything in Professional", "Unlimited volunteers", "Priority support", "Tailored onboarding"] },
];

const faqs = [
  { q: "Can I change my plan later?", a: "Yes — you can upgrade or downgrade at any time from your dashboard. Changes take effect on your next billing date." },
  { q: "How do my donors pay?", a: "Supporters can give by credit or debit card, Apple Pay, Google Pay and PayPal — all handled securely through Stripe." },
  { q: "Do you take a cut of donations?", a: "No. We never charge a platform fee on donations. You only pay the standard Stripe processing fee, so more of every gift reaches your cause." },
  { q: "Is my donor data safe?", a: "Absolutely. Each charity's data is fully isolated, encrypted in transit and at rest, with role-based access and audit logs." },
  { q: "Do I need technical skills?", a: "Not at all. Setting up your portal, branding and campaigns is done through simple forms — most charities are live within minutes." },
];

const partners = ["Hope Bridge", "Mercy Global", "Bright Future", "Atlas Aid", "Northwind Trust"];

/* ═══════════════ MAIN ═══════════════ */
export default function SaaSHome() {
  return (
    <div className="saas-page" style={{ fontFamily: font, background: V.bg, color: V.ink, overflowX: "hidden", position: "relative" }}>
      <style>{css}</style>

      {/* ══ HERO ══ */}
      <section className="relative overflow-hidden" style={{ padding: "150px 0 90px" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute rounded-full" style={{ top: "-12%", left: "8%", width: 620, height: 620, filter: "blur(110px)", background: "radial-gradient(circle, rgba(4,120,87,.28), transparent 65%)" }} />
          <div className="absolute rounded-full" style={{ top: "10%", right: "-8%", width: 520, height: 520, filter: "blur(110px)", background: "radial-gradient(circle, rgba(245,158,11,.22), transparent 65%)" }} />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-16 items-center">
            <div>
              <Reveal><Badge icon={Heart}>Built for charities &amp; non-profits</Badge></Reveal>
              <Reveal delay={0.12}>
                <h1 className="mt-6 text-[clamp(42px,5.6vw,72px)] leading-[1.04] font-bold tracking-[-0.03em]" style={{ color: V.ink }}>
                  Help your charity{" "}
                  <span style={{ color: V.primary }}>do more good</span>
                  <span style={{ color: V.accent }}>.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.24}>
                <p className="mt-6 max-w-[480px] text-[18px] leading-relaxed" style={{ color: V.inkSoft }}>
                  Everything your organisation needs to raise funds, welcome donors and run campaigns —
                  in one warm, easy platform with your name on it.
                </p>
              </Reveal>
              <Reveal delay={0.36}>
                <div className="flex flex-wrap gap-3 mt-9">
                  <MagneticBtn as="link" to="/plans"
                    className="saas-btn-primary group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full text-[15px] font-semibold text-white"
                    style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 14px 30px -10px rgba(4,120,87,.55)` }}>
                    Start your charity portal
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </MagneticBtn>
                  <a href="#features" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-medium transition-colors"
                    style={{ background: V.surface, color: V.ink, border: `1px solid ${V.line}` }}>
                    See how it works
                  </a>
                </div>
              </Reveal>
              <Reveal delay={0.48}>
                <div className="flex items-center gap-2 mt-7 text-[14px]" style={{ color: V.inkFaint }}>
                  <Check className="w-4 h-4" style={{ color: V.success }} />
                  No setup fee · no cut of donations · cancel anytime
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.3} className="hidden lg:block">
              <div className="relative">
                <div className="rounded-3xl p-7" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 30px 70px -28px rgba(6,40,30,.3)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl grid place-items-center" style={{ background: `linear-gradient(150deg, ${V.primary}, ${V.primary2})` }}>
                      <HandHeart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold" style={{ color: V.ink }}>Hope Bridge Foundation</div>
                      <div className="text-[12.5px]" style={{ color: V.inkFaint }}>Building brighter futures</div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl p-5" style={{ background: V.surface2 }}>
                    <div className="text-[13px] font-medium" style={{ color: V.inkSoft }}>Clean Water for Every Village</div>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-[28px] font-bold" style={{ color: V.ink }}>$38,500</span>
                      <span className="text-[13px]" style={{ color: V.inkFaint }}>of $50,000 goal</span>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full overflow-hidden" style={{ background: "#fff" }}>
                      <motion.div className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.accent})` }}
                        initial={{ width: 0 }} whileInView={{ width: "78%" }} viewport={{ once: true }}
                        transition={{ duration: 1.3, ease: [0.2, 0.7, 0.2, 1] }} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 text-[12.5px]" style={{ color: V.inkSoft }}>
                      <Users className="w-3.5 h-3.5" style={{ color: V.primary }} /> 312 kind donors this month
                    </div>
                  </div>

                  <button className="mt-5 w-full py-3 rounded-xl text-[14px] font-semibold text-white"
                    style={{ background: V.accent, boxShadow: `0 10px 24px -8px ${V.accentGlow}` }}>
                    Donate now
                  </button>
                </div>

                <div className="absolute -top-5 -right-4 px-4 py-3 rounded-2xl"
                  style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 16px 36px -14px rgba(6,40,30,.28)", animation: "saas-float1 7s ease-in-out infinite" }}>
                  <div className="text-[11px]" style={{ color: V.inkFaint }}>New monthly donor</div>
                  <div className="text-[15px] font-bold" style={{ color: V.primary }}>+ $50 / month</div>
                </div>
                <div className="absolute -bottom-6 -left-5 px-4 py-3 rounded-2xl flex items-center gap-2.5"
                  style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 16px 36px -14px rgba(6,40,30,.28)", animation: "saas-float2 9s ease-in-out infinite" }}>
                  <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: V.accentSoft }}>
                    <Heart className="w-4 h-4" style={{ color: V.accent }} />
                  </div>
                  <div>
                    <div className="text-[11px]" style={{ color: V.inkFaint }}>Receipt sent</div>
                    <div className="text-[13.5px] font-semibold" style={{ color: V.ink }}>Automatically</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
              {heroStats.map((s) => (
                <div key={s.label} className="rounded-2xl p-6 text-center" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
                  <div className="text-[32px] font-bold" style={{ color: V.primary }}>{s.value}</div>
                  <div className="mt-1 text-[13px]" style={{ color: V.inkSoft }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ PARTNERS ══ */}
      <section className="py-14">
        <div className="max-w-[1100px] mx-auto px-8">
          <p className="text-center text-[13.5px] mb-7" style={{ color: V.inkFaint }}>
            Trusted by charities making a difference around the world
          </p>
          <Reveal>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
              {partners.map((p) => (
                <span key={p} className="text-[17px] font-semibold" style={{ color: V.inkFaint }}>{p}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" className="py-24 px-8">
        <div className="max-w-[1200px] mx-auto">
          <SectionHead badge="Everything in one place" badgeIcon={Sparkles}
            title="One friendly home for<br/>all your fundraising."
            subtitle="From the first donation to the final thank-you, the platform handles the busywork so your team can focus on the cause." />
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeUpChild} custom={i}
                className="saas-card p-7 rounded-2xl" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
                <div className="w-12 h-12 rounded-2xl grid place-items-center mb-5"
                  style={{ background: `linear-gradient(150deg, ${V.surface2}, ${V.surface})`, border: `1px solid ${V.line}`, color: V.primary }}>
                  <f.icon style={{ width: 22, height: 22 }} />
                </div>
                <h3 className="text-[19px] font-bold tracking-[-0.01em]" style={{ color: V.ink }}>{f.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: V.inkSoft }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how" className="py-24 px-8" style={{ background: V.surface2 }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHead center badge="Up and running in minutes" badgeIcon={LifeBuoy}
            title="Three simple steps to<br/>your own donation portal." />
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5"
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
            {steps.map((s, i) => (
              <motion.div key={s.n} variants={fadeUpChild} custom={i}
                className="saas-step p-8 rounded-2xl relative" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full grid place-items-center text-[17px] font-bold text-white"
                    style={{ background: `linear-gradient(150deg, ${V.primary}, ${V.primary2})` }}>{s.n}</div>
                  <s.icon className="w-5 h-5" style={{ color: V.accent }} />
                </div>
                <h3 className="mt-5 text-[20px] font-bold tracking-[-0.01em]" style={{ color: V.ink }}>{s.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: V.inkSoft }}>{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ PORTAL SHOWCASE ══ */}
      <section className="py-24 px-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <Badge icon={Palette}>Your charity, front and centre</Badge>
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
            <div className="rounded-3xl overflow-hidden" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 34px 80px -30px rgba(6,40,30,.32)" }}>
              <div className="px-5 py-3.5 flex items-center gap-2" style={{ background: V.surface2, borderBottom: `1px solid ${V.line}` }}>
                <span className="w-3 h-3 rounded-full" style={{ background: "#F87171" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: V.accent }} />
                <span className="w-3 h-3 rounded-full" style={{ background: V.success }} />
                <span className="ml-2 text-[12.5px]" style={{ color: V.inkSoft }}>hopebridge.yourplatform.org</span>
              </div>
              <div className="p-6" style={{ background: V.bg }}>
                <div className="rounded-2xl p-6 text-white relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})` }}>
                  <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,.08)" }} />
                  <div className="text-[20px] font-bold relative">Hope Bridge Foundation</div>
                  <div className="mt-1 text-[13px] opacity-80 relative">Together, we build brighter futures</div>
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold relative"
                    style={{ background: V.accent }}>
                    <Heart className="w-3.5 h-3.5" /> Donate now
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-4 rounded-xl" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
                    <div className="text-[12px]" style={{ color: V.inkFaint }}>Active campaign</div>
                    <div className="mt-1 text-[15px] font-bold" style={{ color: V.ink }}>Clean Water Initiative</div>
                    <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ background: V.surface2 }}>
                      <div className="h-full rounded-full" style={{ width: "78%", background: `linear-gradient(90deg, ${V.primary}, ${V.accent})` }} />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
                    <div className="text-[12px]" style={{ color: V.inkFaint }}>Raised this month</div>
                    <div className="mt-1 text-[19px] font-bold" style={{ color: V.ink }}>$48,250</div>
                    <div className="mt-1 text-[12px] font-medium" style={{ color: V.success }}>↑ 24% from last month</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ CAMPAIGNS ══ */}
      <section className="py-24 px-8" style={{ background: V.surface2 }}>
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal className="order-2 lg:order-1">
            <div className="rounded-2xl p-6" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 24px 50px -24px rgba(6,40,30,.2)" }}>
              {programs.map((p, i) => (
                <div key={p.title} className="py-5" style={{ borderTop: i > 0 ? `1px solid ${V.line}` : "none" }}>
                  <div className="flex justify-between items-baseline gap-3">
                    <span className="text-[15.5px] font-semibold" style={{ color: V.ink }}>{p.title}</span>
                    <span className="text-[14px] font-bold" style={{ color: V.primary }}>{p.pct}%</span>
                  </div>
                  <div className="mt-2.5 h-2 rounded-full overflow-hidden" style={{ background: V.surface2 }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.accent})` }}
                      initial={{ width: 0 }} whileInView={{ width: `${p.pct}%` }} viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }} />
                  </div>
                  <div className="mt-2 text-[12.5px]" style={{ color: V.inkFaint }}>
                    {p.raised} raised of {p.goal} · {p.donors} donors
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15} className="order-1 lg:order-2">
            <Badge icon={Megaphone}>Campaigns &amp; storytelling</Badge>
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
      <section className="py-24 px-8">
        <div className="max-w-[1200px] mx-auto">
          <SectionHead center badge="Loved by charity teams" badgeIcon={Heart}
            title="Trusted by the people<br/>doing the good work." />
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5"
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
            {testimonials.map((t, i) => (
              <motion.div key={t.author} variants={fadeUpChild} custom={i}
                className="saas-card p-7 rounded-2xl flex flex-col" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
                <Quote className="w-7 h-7" style={{ color: V.accent }} />
                <blockquote className="mt-4 text-[15.5px] leading-relaxed flex-1" style={{ color: V.ink }}>
                  “{t.quote}”
                </blockquote>
                <div className="flex items-center gap-3 mt-6 pt-5" style={{ borderTop: `1px solid ${V.line}` }}>
                  <div className="w-10 h-10 rounded-full grid place-items-center text-[13px] font-bold text-white"
                    style={{ background: `linear-gradient(140deg, ${V.primary}, ${V.primary2})` }}>{t.initials}</div>
                  <div>
                    <div className="text-[14px] font-semibold" style={{ color: V.ink }}>{t.author}</div>
                    <div className="text-[12.5px]" style={{ color: V.inkFaint }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="py-24 px-8" style={{ background: V.surface2 }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHead center badge="Simple, honest pricing" badgeIcon={Shield}
            title="A plan for every charity."
            subtitle="No platform fee on donations — ever. Choose a plan, change it whenever you need." />
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start"
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
            {pricingPlans.map((plan, i) => (
              <motion.div key={plan.tier} variants={fadeUpChild} custom={i}
                className="saas-card p-8 rounded-2xl relative"
                style={{
                  background: V.surface,
                  border: plan.popular ? `2px solid ${V.primary}` : `1px solid ${V.line}`,
                  boxShadow: plan.popular ? "0 28px 60px -24px rgba(4,120,87,.4)" : "none",
                }}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-[11.5px] font-bold text-white"
                    style={{ background: V.accent }}>Most popular</span>
                )}
                <div className="text-[20px] font-bold" style={{ color: V.ink }}>{plan.tier}</div>
                <div className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: V.inkSoft }}>{plan.desc}</div>
                <div className="flex items-baseline gap-1.5 mt-5">
                  <span className="text-[42px] font-bold tracking-tight" style={{ color: V.ink }}>{plan.price}</span>
                  <span className="text-[14px]" style={{ color: V.inkFaint }}>/ month</span>
                </div>
                <ul className="mt-6 mb-7 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[14px]" style={{ color: V.inkSoft }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: V.primary }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={`/register?plan=${plan.tier.toLowerCase()}&billing=monthly`}
                  className={`block w-full text-center py-3 rounded-xl text-[14.5px] font-semibold transition-colors ${plan.popular ? "saas-btn-primary text-white" : ""}`}
                  style={plan.popular
                    ? { background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }
                    : { background: V.surface2, color: V.ink, border: `1px solid ${V.line}` }}>
                  Get started
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="py-24 px-8">
        <div className="max-w-[760px] mx-auto">
          <SectionHead center badge="Questions, answered" badgeIcon={LifeBuoy}
            title="Frequently asked questions" />
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Reveal key={faq.q} delay={i * 0.05}>
                <details className="saas-faq rounded-2xl overflow-hidden" style={{ background: V.surface, border: `1px solid ${V.line}` }}
                  {...(i === 0 ? { open: true } : {})}>
                  <summary className="flex justify-between items-center gap-4 px-6 py-5 cursor-pointer text-[16px] font-semibold list-none"
                    style={{ color: V.ink }}>
                    {faq.q}
                    <span className="saas-faq-plus w-7 h-7 rounded-full grid place-items-center text-[16px] shrink-0"
                      style={{ background: V.surface2, border: `1px solid ${V.line}`, color: V.primary }}>+</span>
                  </summary>
                  <div className="px-6 pb-6 text-[14.5px] leading-relaxed" style={{ color: V.inkSoft }}>{faq.a}</div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="pb-28 px-8">
        <div className="max-w-[1100px] mx-auto">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl text-center px-10 py-20"
              style={{ background: `linear-gradient(150deg, ${V.primary}, ${V.primary2})` }}>
              <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full" style={{ background: "rgba(255,255,255,.07)" }} />
              <div className="absolute -bottom-16 -right-10 w-72 h-72 rounded-full" style={{ background: "rgba(245,158,11,.16)" }} />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-6" style={{ background: "rgba(255,255,255,.14)" }}>
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-[clamp(30px,4.4vw,52px)] font-bold tracking-[-0.02em] leading-[1.08] text-white max-w-[16ch] mx-auto">
                  Ready to help your charity raise more?
                </h2>
                <p className="mt-4 text-[16.5px] max-w-[460px] mx-auto" style={{ color: "rgba(255,255,255,.85)" }}>
                  Set up your branded donation portal today. It only takes a few minutes.
                </p>
                <div className="flex flex-wrap gap-3 justify-center mt-8">
                  <MagneticBtn as="link" to="/plans"
                    className="saas-btn-primary inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-[15px] font-semibold"
                    style={{ background: "#fff", color: V.primary }}>
                    Get started <ArrowRight className="w-4 h-4" />
                  </MagneticBtn>
                  <Link to="/contact" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[15px] font-medium text-white"
                    style={{ border: "1px solid rgba(255,255,255,.35)" }}>
                    Talk to us
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
