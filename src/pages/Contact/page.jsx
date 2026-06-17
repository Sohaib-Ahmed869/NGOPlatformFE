import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./contact-phone.css";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  HandHeart,
  Handshake,
  Receipt,
  Newspaper,
  Send,
  Loader2,
  CheckCircle2,
  Plus,
  Clock,
  ShieldCheck,
  ArrowDown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { sectionReveal } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";
import axios from "../../services/axios";
import toast from "react-hot-toast";
import { useTenant } from "../../context/TenantContext";
import usePageContent from "../../hooks/usePageContent";
import { SOCIAL_META, SOCIAL_ICON_PATHS, socialHref } from "../../config/socialIcons";
import { cn } from "../../utils/cn";

/* ── reasons for contact (charity-standard) ───────────────────────────────
   Each maps to the `purpose` we persist. "partnership" reveals the host-an-
   event fields via progressive disclosure. */
const REASONS = [
  { id: "general", label: "General enquiry", purpose: "General enquiry", icon: MessageCircle },
  { id: "volunteer", label: "Volunteering", purpose: "Volunteering", icon: HandHeart },
  { id: "partnership", label: "Partnerships & events", purpose: "Partnership / Host an event", icon: Handshake },
  { id: "donations", label: "Donations & receipts", purpose: "Donations & receipts", icon: Receipt },
  { id: "media", label: "Media / press", purpose: "Media / press", icon: Newspaper },
];

const HOST_OPTIONS = ["Partner with us", "Community event", "Full collaboration"];

const DEFAULT_FAQS = [
  {
    q: "How will my donation be used?",
    a: "Every contribution goes directly toward our programs and the communities we serve. We publish where funds are directed and keep administrative costs as low as possible.",
  },
  {
    q: "Can I get a tax-deductible receipt?",
    a: "Yes. A receipt is emailed automatically as soon as your donation is processed. If you can’t find it, contact us with the date and amount and we’ll resend it.",
  },
  {
    q: "How can I volunteer or fundraise?",
    a: "We’d love your help. Choose “Volunteering” or “Partnership / Host an event” above, tell us a little about yourself, and our team will reach out with the next steps.",
  },
  {
    q: "How soon will I hear back?",
    a: "We usually reply within 1–2 business days. For anything urgent, calling or emailing us directly is the fastest way to reach the team.",
  },
];

/* Scroll-reveal: rises + fades in as it enters the viewport (once). */
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
});

/* Underline input — mirrors the Branding/Hope field style (straight edges, no
   box, accent on focus), with a red variant for inline errors. */
const fieldCls = (hasError) =>
  cn(
    "w-full border-b bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400",
    hasError ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-accent",
  );

const tileGroupVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const tileItemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

/* ── small pieces ─────────────────────────────────────────────────────── */

function Eyebrow({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </span>
  );
}

/* Label + inline-error wrapper (Hope style). */
function Field({ id, label, required, error, children, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* Section header — accent icon tile + divider; icon springs in on view. */
function SectionHead({ icon: Icon, title, subtitle }) {
  const reduce = useReducedMotion();
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
      <motion.span
        initial={reduce ? false : { scale: 0, rotate: -25 }}
        whileInView={reduce ? {} : { scale: 1, rotate: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ type: "spring", stiffness: 300, damping: 16 }}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"
      >
        <Icon className="h-5 w-5" />
      </motion.span>
      <div>
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

/* Accent line that draws across a card's top border as it scrolls into view. */
function CardTopLine({ delay = 0.15 }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={reduce ? {} : { scaleX: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay }}
      className="absolute inset-x-0 top-0 h-[3px] origin-left bg-accent"
    />
  );
}

/* Soft accent gradient wash that fades in on hover (replaces the hard line).
   Place inside a `group relative overflow-hidden` card as its first child. */
function CardHoverGlow() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    />
  );
}

/* Reason selector — accent-filling tiles (Hope's TileGroup, with icons). */
function ReasonTiles({ value, onChange }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="group"
      aria-label="Reason for contact"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      variants={tileGroupVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {REASONS.map((r) => {
        const on = value === r.id;
        const Icon = r.icon;
        return (
          <motion.button
            key={r.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(r.id)}
            variants={tileItemVariants}
            whileHover={reduce ? undefined : { y: -3, scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            className={cn(
              "flex items-center gap-2.5 rounded-token-btn border px-3 py-3 text-left text-sm font-medium transition-colors duration-200",
              on
                ? "border-accent bg-accent text-white shadow-md shadow-accent/25"
                : "border-gray-200 bg-white text-gray-600 hover:border-accent/60 hover:text-primary hover:shadow-sm",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", on ? "text-white" : "text-accent")} />
            <span className="leading-tight">{r.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

/* Selectable text tiles (host-event type). */
function TileGroup({ options, selected, onToggle, ariaLabel, columns = "grid-cols-2 sm:grid-cols-3" }) {
  const reduce = useReducedMotion();
  return (
    <div role="group" aria-label={ariaLabel} className={cn("grid gap-2", columns)}>
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <motion.button
            key={opt}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(opt)}
            whileHover={reduce ? undefined : { y: -3, scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            className={cn(
              "rounded-token-btn border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200",
              on
                ? "border-accent bg-accent text-white shadow-md shadow-accent/25"
                : "border-gray-200 bg-white text-gray-600 hover:border-accent/60 hover:text-primary hover:shadow-sm",
            )}
          >
            {opt}
          </motion.button>
        );
      })}
    </div>
  );
}

/* Quick-channel card — flat, hover-line, animated icon tile (Hope's WHY card). */
function ChannelCard({ icon: Icon, label, value, href, delay }) {
  const reduce = useReducedMotion();
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={reduce ? {} : { y: -6 }}
      className="group relative h-full overflow-hidden rounded-token border-token border-gray-100 bg-white shadow-token transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
    >
      <CardHoverGlow />
      <div className="relative flex h-full items-center gap-4 p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-accent group-hover:text-white">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
          <p className="truncate font-heading font-semibold text-primary">{value}</p>
        </div>
      </div>
    </motion.div>
  );
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block h-full">
      {inner}
    </a>
  ) : (
    inner
  );
}

/* Contact row inside the "connect" card. */
function ContactRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <div className="text-sm text-primary">{children}</div>
      </div>
    </div>
  );
}

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div
      className={cn(
        "group rounded-token border-token bg-white shadow-token transition-colors duration-200",
        open ? "border-accent/40" : "border-gray-100 hover:border-accent/30",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span
          className={cn(
            "font-heading font-semibold transition-colors duration-200",
            open ? "text-accent" : "text-primary group-hover:text-accent",
          )}
        >
          {q}
        </span>
        {/* Plus that rotates 45° into an × and fills accent when open. */}
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center border transition-all duration-300",
            open ? "rotate-45 border-accent bg-accent text-white" : "border-gray-200 text-accent group-hover:border-accent/50",
          )}
        >
          <Plus className="h-4 w-4" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const initialForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  description: "",
  hostCity: "",
  wouldLikeToHost: HOST_OPTIONS[0],
  numberOfGuests: "",
  minimumDonation: "",
};

/* ── page ─────────────────────────────────────────────────────────────── */

const Contact = () => {
  const { organisation } = useTenant();
  const { content, loading: contentLoading } = usePageContent("contact");
  const hero = content?.hero || {};
  const officeHours = content?.officeHours || "Monday – Friday, 9:00 am – 5:00 pm";
  const faqs = Array.isArray(content?.faqs) && content.faqs.length ? content.faqs : DEFAULT_FAQS;
  const orgName = organisation?.name || "our team";

  // Optional socials + formatted address from org settings.
  const socials = organisation?.socialLinks || {};
  const socialList = SOCIAL_META.map((m) => ({ key: m.key, label: m.label, href: socialHref(m.key, socials[m.key]) })).filter(
    (s) => s.href,
  );
  const ad = organisation?.addressDetails || {};
  const cityLine = [[ad.city, ad.state].filter(Boolean).join(", "), ad.postalCode].filter(Boolean).join(" ").trim();
  const structuredAddress = [ad.line1, ad.line2, cityLine, ad.country].map((x) => (x || "").trim()).filter(Boolean);
  const addressLines = structuredAddress.length ? structuredAddress : organisation?.address ? [organisation.address] : [];
  const mapSrc = addressLines.length
    ? `https://www.google.com/maps?q=${encodeURIComponent(addressLines.join(", "))}&output=embed`
    : "";
  const phone = organisation?.contactPhone || "";
  const email = organisation?.contactEmail || "";
  const hasConnect = !!(mapSrc || phone || email || addressLines.length || socialList.length);

  const [reason, setReason] = useState("general");
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const formRef = useRef(null);
  const reduce = useReducedMotion();

  /* Page scroll-progress bar. */
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  /* Hero parallax. */
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroBgY = useTransform(heroProgress, [0, 1], reduce ? ["0%", "0%"] : ["-12%", "12%"]);
  const heroScale = useTransform(heroProgress, [0, 1], reduce ? [1, 1] : [1, 1.08]);
  const heroContentY = useTransform(heroProgress, [0, 1], reduce ? [0, 0] : [0, -70]);
  const heroContentOpacity = useTransform(heroProgress, [0, 0.85], reduce ? [1, 1] : [1, 0]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const isPartnership = reason === "partnership";
  const reasonObj = REASONS.find((r) => r.id === reason) || REASONS[0];

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Please enter your full name";
    if (!form.email.trim()) e.email = "Please enter your email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.phoneNumber.trim()) e.phoneNumber = "Please enter your phone number";
    if (!form.description.trim()) e.description = "Please write us a message";
    if (isPartnership) {
      if (!form.hostCity.trim()) e.hostCity = "Where would you host?";
      if (!String(form.numberOfGuests).trim()) e.numberOfGuests = "Expected guests?";
      if (!String(form.minimumDonation).trim()) e.minimumDonation = "Minimum donation?";
    }
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      document.getElementById(Object.keys(e)[0])?.focus?.();
      return;
    }

    // Align with the ContactRequest schema. For partnerships we capture the host
    // details; the "would like to host" type is folded into the message so it
    // reaches the inbox without a schema change.
    const description = isPartnership ? `[Partnership · ${form.wouldLikeToHost}]\n\n${form.description}` : form.description;
    const payload = {
      fullName: form.fullName,
      phoneNumber: form.phoneNumber,
      email: form.email,
      purpose: reasonObj.purpose,
      description,
    };
    if (isPartnership) {
      payload.hostCity = form.hostCity;
      payload.numberOfGuests = Number(form.numberOfGuests) || undefined;
      payload.minimumDonation = Number(form.minimumDonation) || undefined;
      payload.wouldLikeToHostShahidAfridi = true;
    }

    try {
      setSubmitting(true);
      await axios.post("/contact", payload);
      setForm(initialForm);
      setReason("general");
      setErrors({});
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error("Something went wrong — please try again");
      console.log(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Scroll progress bar */}
      <motion.div style={{ scaleX: progressX }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent" />

      {/* ── HERO — parallax bg + scroll-reactive content ──────────────── */}
      <div ref={heroRef} data-hero className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden py-36 lg:py-44">
        <motion.div style={{ y: heroBgY, scale: heroScale }} className="absolute -inset-y-[16%] inset-x-0 will-change-transform">
          <img
            src={hero.image ?? "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1600&q=80"}
            alt=""
            className="h-full w-full object-cover"
          />
          <HeroOverlay />
        </motion.div>
        <motion.div style={{ y: heroContentY, opacity: heroContentOpacity }} className="relative z-10 px-6 text-center">
          {contentLoading ? (
            <div className="mx-auto flex flex-col items-center gap-4">
              <div className="h-11 w-64 max-w-[80vw] animate-pulse bg-white/20 md:h-14 md:w-96" />
              <div className="h-4 w-80 max-w-[90vw] animate-pulse bg-white/15" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={hero.title ?? "Get In Touch"}>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="font-heading text-4xl font-bold text-[#F5EDE0] md:text-5xl lg:text-6xl"
                >
                  {hero.title ?? "Get In Touch"}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="mx-auto mt-4 max-w-2xl font-body text-[#EDE4D3]/70"
                >
                  {hero.subtitle ?? "We would love to hear from you"}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 flex justify-center"
          >
            <motion.button
              type="button"
              onClick={scrollToForm}
              whileHover={{ y: -3 }}
              className="inline-flex items-center gap-2 rounded-token-btn bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-accent-light"
            >
              {hero.ctaLabel ?? "Send a message"}
              <motion.span animate={reduce ? {} : { y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
                <ArrowDown className="h-4 w-4" />
              </motion.span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* ── QUICK CHANNELS ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <motion.div {...sectionReveal} className="mb-10 text-center">
          <Eyebrow icon={Sparkles}>{content?.channels?.eyebrow ?? "Get in touch"}</Eyebrow>
          <h2 className="mt-3 font-heading text-3xl font-bold text-primary">{content?.channels?.title ?? "Reach us your way"}</h2>
          <p className="mt-2 text-text-muted">{content?.channels?.subtitle ?? "Prefer to talk? Pick whatever’s easiest — or use the form below."}</p>
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ChannelCard icon={Phone} label="Call us" value={phone || "Reach out anytime"} href={phone ? `tel:${phone.replace(/\s/g, "")}` : undefined} delay={0} />
          <ChannelCard icon={Mail} label="Email us" value={email || "Send us a note"} href={email ? `mailto:${email}` : undefined} delay={0.1} />
          <ChannelCard
            icon={MapPin}
            label="Visit us"
            value={addressLines[0] || "Find us on the map"}
            href={addressLines.length ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLines.join(", "))}` : undefined}
            delay={0.2}
          />
        </div>
      </section>

      {/* ── FORM / SUCCESS ────────────────────────────────────────────── */}
      <section ref={formRef} className="scroll-mt-24 bg-background/60 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative rounded-token border-token border-gray-100 bg-white p-10 text-center shadow-token"
              >
                <CardTopLine delay={0.15} />
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                  className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"
                >
                  <CheckCircle2 className="h-9 w-9" />
                </motion.span>
                <h2 className="font-heading text-2xl font-bold text-primary">Message sent 🎉</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
                  Thank you for reaching out. The {orgName} team has received your message and will get back to you within 1–2
                  business days.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-6 inline-flex items-center gap-2 rounded-token-btn border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-accent hover:text-accent"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-token border-token border-gray-100 bg-white p-6 shadow-token sm:p-8 lg:p-10"
              >
                <CardTopLine delay={0.2} />
                <div className="mb-8 text-center">
                  <h2 className="font-heading text-3xl font-bold text-primary">{content?.formHeading ?? "Send us a message"}</h2>
                  <p className="mt-2 text-sm text-text-muted">{content?.formSubheading ?? "Tell us what you need and we’ll point you to the right person."}</p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-10">
                  {/* Reason */}
                  <motion.div {...reveal()}>
                    <SectionHead icon={Sparkles} title="What can we help with?" subtitle="Pick a topic so we route you to the right team." />
                    <ReasonTiles value={reason} onChange={setReason} />
                  </motion.div>

                  {/* About you */}
                  <motion.div {...reveal()}>
                    <SectionHead icon={MessageCircle} title="Your details" subtitle="So we know who you are and how to reach you." />
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                      <Field id="fullName" label="Full name" required error={errors.fullName}>
                        <input
                          id="fullName"
                          type="text"
                          autoComplete="name"
                          aria-invalid={!!errors.fullName}
                          className={fieldCls(errors.fullName)}
                          value={form.fullName}
                          onChange={(e) => set("fullName", e.target.value)}
                        />
                      </Field>
                      <Field id="email" label="Email" required error={errors.email}>
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          aria-invalid={!!errors.email}
                          className={fieldCls(errors.email)}
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                        />
                      </Field>
                      <Field id="phoneNumber" label="Phone number" required error={errors.phoneNumber} full>
                        <div className={cn("contact-phone", errors.phoneNumber && "contact-phone-error")}>
                          <PhoneInput
                            country="au"
                            value={(form.phoneNumber || "").replace(/^\+/, "")}
                            onChange={(val) => set("phoneNumber", val ? `+${val}` : "")}
                            enableSearch
                            countryCodeEditable={false}
                            inputProps={{ id: "phoneNumber", name: "phoneNumber" }}
                          />
                        </div>
                      </Field>
                    </div>
                  </motion.div>

                  {/* Partnership extras (progressive disclosure) */}
                  <AnimatePresence initial={false}>
                    {isPartnership && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-5 border border-accent/20 bg-accent/5 p-5">
                          <p className="text-sm font-semibold text-primary">Tell us about the event you’d like to host</p>
                          <div>
                            <p className="mb-2 block text-sm font-medium text-gray-700">I’d like to</p>
                            <TileGroup
                              options={HOST_OPTIONS}
                              selected={[form.wouldLikeToHost]}
                              onToggle={(o) => set("wouldLikeToHost", o)}
                              ariaLabel="Host type"
                              columns="grid-cols-1 sm:grid-cols-3"
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
                            <Field id="hostCity" label="Host city" required error={errors.hostCity}>
                              <input id="hostCity" type="text" aria-invalid={!!errors.hostCity} className={fieldCls(errors.hostCity)} value={form.hostCity} onChange={(e) => set("hostCity", e.target.value)} placeholder="e.g. Sydney" />
                            </Field>
                            <Field id="numberOfGuests" label="Expected guests" required error={errors.numberOfGuests}>
                              <input id="numberOfGuests" type="text" inputMode="numeric" aria-invalid={!!errors.numberOfGuests} className={fieldCls(errors.numberOfGuests)} value={form.numberOfGuests} onChange={(e) => set("numberOfGuests", e.target.value.replace(/\D/g, ""))} placeholder="100" />
                            </Field>
                            <Field id="minimumDonation" label="Min. donation ($)" required error={errors.minimumDonation}>
                              <input id="minimumDonation" type="text" inputMode="numeric" aria-invalid={!!errors.minimumDonation} className={fieldCls(errors.minimumDonation)} value={form.minimumDonation} onChange={(e) => set("minimumDonation", e.target.value.replace(/\D/g, ""))} placeholder="100" />
                            </Field>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Message */}
                  <motion.div {...reveal()}>
                    <Field id="description" label={isPartnership ? "Tell us about yourself / your business" : "How can we help you?"} required error={errors.description}>
                      <textarea
                        id="description"
                        rows={5}
                        aria-invalid={!!errors.description}
                        className={fieldCls(errors.description)}
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder={isPartnership ? "Share a little about yourself and what you have in mind…" : "Write your message here…"}
                      />
                    </Field>
                  </motion.div>

                  <div className="flex items-start gap-2 text-xs text-text-muted">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>Your details are kept private and used only to respond to your enquiry. We’ll never share them.</span>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={submitting || reduce ? {} : { scale: 1.01 }}
                    whileTap={submitting ? {} : { scale: 0.99 }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-token-btn bg-accent py-3.5 font-semibold text-white shadow-md transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    {submitting ? "Sending…" : "Send message"}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── FIND & CONNECT ────────────────────────────────────────────── */}
      {hasConnect && (
        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <motion.div {...sectionReveal} className="mb-10 text-center">
            <Eyebrow icon={MapPin}>{content?.connect?.eyebrow ?? "Visit us"}</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary">{content?.connect?.title ?? "Find & connect with us"}</h2>
          </motion.div>
          <div className={cn("grid gap-6", mapSrc ? "lg:grid-cols-2" : "mx-auto max-w-xl")}>
            {mapSrc && (
              <motion.div {...reveal()} className="relative rounded-token border-token border-gray-100 bg-white shadow-token">
                <iframe
                  title="Our location"
                  src={mapSrc}
                  className="h-full min-h-[300px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </motion.div>
            )}
            <motion.div {...reveal(0.1)} className="relative rounded-token border-token border-gray-100 bg-white p-6 shadow-token sm:p-8">
              <CardTopLine delay={0.2} />
              <h3 className="font-heading text-lg font-bold text-primary">{content?.connect?.heading ?? "Reach us directly"}</h3>
              <div className="mt-5 space-y-4">
                <ContactRow icon={Clock} label="Office hours">
                  {officeHours}
                </ContactRow>
                {phone && (
                  <ContactRow icon={Phone} label="Phone">
                    <a href={`tel:${phone.replace(/\s/g, "")}`} className="transition-colors hover:text-accent">
                      {phone}
                    </a>
                  </ContactRow>
                )}
                {email && (
                  <ContactRow icon={Mail} label="Email">
                    <a href={`mailto:${email}`} className="break-all transition-colors hover:text-accent">
                      {email}
                    </a>
                  </ContactRow>
                )}
                {addressLines.length > 0 && (
                  <ContactRow icon={MapPin} label="Address">
                    {addressLines.map((line, i) => (
                      <span key={i} className="block leading-snug">
                        {line}
                      </span>
                    ))}
                  </ContactRow>
                )}
              </div>

              {socialList.length > 0 && (
                <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Follow</span>
                  {socialList.map((s) => (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="grid h-9 w-9 place-items-center bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d={SOCIAL_ICON_PATHS[s.key]} />
                      </svg>
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="bg-background/60 px-6 py-16 lg:py-20">
        <motion.div {...sectionReveal} className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <Eyebrow icon={MessageCircle}>{content?.faqSection?.eyebrow ?? "FAQ"}</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary">{content?.faqSection?.title ?? "Frequently asked questions"}</h2>
            <p className="mt-2 text-text-muted">{content?.faqSection?.subtitle ?? "Quick answers to the things people ask us most."}</p>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-text-muted">
            Still have a question?{" "}
            <button onClick={() => { setSent(false); scrollToForm(); }} className="inline-flex items-center gap-1 font-semibold text-primary hover:text-accent">
              Send us a message <ArrowRight className="h-4 w-4" />
            </button>
          </p>
        </motion.div>
      </section>

      <NewsletterSection />
    </motion.div>
  );
};

export default Contact;
