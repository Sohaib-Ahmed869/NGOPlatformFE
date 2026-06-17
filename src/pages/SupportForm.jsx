import { useState, useRef, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  LifeBuoy,
  CheckCircle2,
  Paperclip,
  Send,
  Loader2,
  ShieldCheck,
  ArrowDown,
  ArrowRight,
  MessageCircle,
  Sparkles,
  ThumbsUp,
  Mail,
  Clock,
  Hash,
  FileText,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import supportService from "../services/support.service";
import { useTenant } from "../context/TenantContext";
import usePageContent from "../hooks/usePageContent";
import HeroOverlay from "../components/HeroOverlay";
import { PUBLIC_SUPPORT_CATEGORIES } from "../config/supportCategories";
import { cn } from "../utils/cn";

const MAX_FILE_MB = 10;

// Default hero backdrop — a warm, human "we're here to help" image. Sits behind
// the brand overlay so the tenant's primary colour still tints it on-brand.
const HERO_IMAGE = "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1600&q=80";

/* Scroll-reveal preset shared across the public pages. */
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
});

/* Underline field — straight edge, accent on focus, red on error (Contact/Hope style). */
const fieldCls = (hasError) =>
  cn(
    "w-full border-b bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400",
    hasError ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-accent",
  );

function Eyebrow({ icon: Icon, children, light = false }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-token px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        light ? "border border-white/25 bg-white/10 text-white backdrop-blur-sm" : "bg-accent/10 text-accent",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </span>
  );
}

function Field({ id, label, required, error, hint, children, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
        {hint && <span className="font-normal text-gray-400"> {hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* Section header — accent icon tile + divider (springs in on view). */
function SectionHead({ icon: Icon, title, subtitle }) {
  const reduce = useReducedMotion();
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
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
        <h3 className="font-heading text-lg font-semibold text-primary">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

/* Accent line that draws across the card's top edge as it scrolls into view. */
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

/* What-to-expect mini card. */
function ExpectCard({ icon: Icon, title, text, delay }) {
  return (
    <motion.div
      {...reveal(delay)}
      className="group relative overflow-hidden rounded-token border-token border-gray-100 bg-white p-5 shadow-token transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-accent group-hover:text-white">
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-3 font-heading font-semibold text-primary">{title}</p>
        <p className="mt-1 text-sm text-text-muted">{text}</p>
      </div>
    </motion.div>
  );
}

export default function SupportForm() {
  const { organisation } = useTenant();
  const orgName = organisation?.name || "our team";
  const supportEmail = organisation?.contactEmail || "";

  // CMS content (admin-editable via Pages → Support, with live preview + drafts).
  // Falls back to the in-code defaults so the page always renders fully.
  const { content } = usePageContent("support");
  const hero = content?.hero || {};
  const cat = content?.category || {};
  const expect = content?.expect || {};

  const [form, setForm] = useState({ name: "", email: "", summary: "", description: "", category: "general" });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { ticketNumber }
  const [drag, setDrag] = useState(false);

  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const reduce = useReducedMotion();

  // Page scroll-progress bar (matches the Contact page).
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  // Hero parallax — image drifts/zooms, content rises and fades on scroll.
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(heroProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "14%"]);
  const bgScale = useTransform(heroProgress, [0, 1], reduce ? [1, 1] : [1, 1.1]);
  const heroY = useTransform(heroProgress, [0, 1], reduce ? [0, 0] : [0, -60]);
  const heroOpacity = useTransform(heroProgress, [0, 0.9], reduce ? [1, 1] : [1, 0]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const pickFile = (f) => {
    if (!f) return;
    const ok = f.type.startsWith("image/") || f.type === "application/pdf";
    if (!ok) return toast.error("Please choose an image or PDF");
    if (f.size > MAX_FILE_MB * 1024 * 1024) return toast.error(`File must be under ${MAX_FILE_MB}MB`);
    setFile(f);
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Please enter your name";
    if (!form.email.trim()) e.email = "Please enter your email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.summary.trim()) e.summary = "A short summary helps us route your request";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      document.getElementById(Object.keys(v)[0])?.focus?.();
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, val]) => fd.append(k, val));
      if (file) fd.append("attachment", file);
      const res = await supportService.publicSubmit(fd);
      setDone({ ticketNumber: res.data.ticketNumber });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to submit — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", email: "", summary: "", description: "", category: "general" });
    setFile(null);
    setErrors({});
    setDone(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Scroll progress bar */}
      <motion.div style={{ scaleX: progressX }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent" />

      {/* ── HERO — branded gradient band (sits under the transparent navbar) ── */}
      <section
        ref={heroRef}
        data-hero
        className="relative flex min-h-[58vh] items-center justify-center overflow-hidden px-6 pb-28 pt-32 lg:pb-32 lg:pt-40"
      >
        {/* Parallax background image */}
        <motion.div style={{ y: bgY, scale: bgScale }} className="absolute -inset-y-[10%] inset-x-0 will-change-transform">
          <img src={hero.image || HERO_IMAGE} alt="" className="h-full w-full object-cover" />
          <HeroOverlay />
        </motion.div>
        {/* Brand tint + legibility wash for the centered white text */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/70" />
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ background: "linear-gradient(135deg, var(--tenant-primary, #2C2418), transparent 70%)" }}
        />
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 mx-auto max-w-2xl text-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Eyebrow icon={LifeBuoy} light>
              {hero.eyebrow || "Support"}
            </Eyebrow>
            <motion.span
              initial={reduce ? false : { scale: 0, rotate: -20 }}
              animate={reduce ? {} : { scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 16, delay: 0.1 }}
              className="mx-auto mt-6 grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-sm"
            >
              <LifeBuoy className="h-8 w-8" />
            </motion.span>
            <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.1] text-white md:text-5xl">
              {hero.title || "How can we help?"}
            </h1>
            <p className="mx-auto mt-4 max-w-xl font-body text-lg leading-relaxed text-white/75">
              {hero.subtitle ||
                `Tell ${orgName} what you need and we’ll get back to you by email — usually within 1–2 business days.`}
            </p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mt-8">
              <motion.button
                type="button"
                onClick={scrollToForm}
                whileHover={{ y: -3 }}
                className="inline-flex items-center gap-2 rounded-token-btn bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-colors hover:bg-accent-light"
              >
                {hero.ctaLabel || "Start a request"}
                <motion.span animate={reduce ? {} : { y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
                  <ArrowDown className="h-4 w-4" />
                </motion.span>
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FORM / SUCCESS — card lifted over the hero ── */}
      <section ref={formRef} className="relative z-10 -mt-16 scroll-mt-24 px-4 pb-4 sm:-mt-20">
        <div className="mx-auto max-w-3xl">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative overflow-hidden rounded-token border-token border-gray-100 bg-white p-8 text-center shadow-token sm:p-12"
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
                <h2 className="font-heading text-2xl font-bold text-primary">Request received 🎉</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
                  Thanks for reaching out. Your request is logged as{" "}
                  <span className="font-semibold text-primary">ticket #{done.ticketNumber}</span> and the {orgName} team will
                  reply to <span className="font-medium text-primary">{form.email}</span>.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-token-btn bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
                  >
                    Submit another request
                  </button>
                  <a
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-token-btn border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-accent hover:text-accent"
                  >
                    Back to home <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-token border-token border-gray-100 bg-white p-6 shadow-token sm:p-8 lg:p-10"
              >
                <CardTopLine delay={0.2} />
                <div className="mb-8 text-center">
                  <h2 className="font-heading text-2xl font-bold text-primary sm:text-3xl">
                    {content?.formHeading || "Send us a request"}
                  </h2>
                  <p className="mt-2 text-sm text-text-muted">
                    {content?.formSubheading || "Share a few details and we’ll point it to the right person."}
                  </p>
                </div>

                <form onSubmit={submit} noValidate className="space-y-9">
                  {/* Category */}
                  <motion.div {...reveal()}>
                    <SectionHead
                      icon={Sparkles}
                      title={cat.heading || "What’s this about?"}
                      subtitle={cat.subheading || "Pick a topic so we route you to the right team."}
                    />
                    <div role="group" aria-label="Category" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {PUBLIC_SUPPORT_CATEGORIES.map((c) => {
                        const on = form.category === c.value;
                        const Icon = c.icon;
                        return (
                          <motion.button
                            key={c.value}
                            type="button"
                            aria-pressed={on}
                            onClick={() => set("category", c.value)}
                            whileHover={reduce ? undefined : { y: -3, scale: 1.03 }}
                            whileTap={reduce ? undefined : { scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 24 }}
                            className={cn(
                              "flex items-center gap-2 rounded-token-btn border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200",
                              on
                                ? "border-accent bg-accent text-white shadow-md shadow-accent/25"
                                : "border-gray-200 bg-white text-gray-600 hover:border-accent/60 hover:text-primary hover:shadow-sm",
                            )}
                          >
                            <Icon className={cn("h-4 w-4 shrink-0", on ? "text-white" : "text-accent")} />
                            <span className="leading-tight">{c.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Your details */}
                  <motion.div {...reveal()}>
                    <SectionHead icon={MessageCircle} title="Your details" subtitle="So we know who you are and how to reach you." />
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                      <Field id="name" label="Your name" required error={errors.name}>
                        <input
                          id="name"
                          type="text"
                          autoComplete="name"
                          aria-invalid={!!errors.name}
                          className={fieldCls(errors.name)}
                          value={form.name}
                          onChange={(e) => set("name", e.target.value)}
                          placeholder="Jane Doe"
                        />
                      </Field>
                      <Field id="email" label="Email" required error={errors.email}>
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          aria-invalid={!!errors.email}
                          className={fieldCls(errors.email)}
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                          placeholder="you@example.com"
                        />
                      </Field>
                      <Field id="summary" label="Summary" required error={errors.summary} full>
                        <input
                          id="summary"
                          type="text"
                          aria-invalid={!!errors.summary}
                          className={fieldCls(errors.summary)}
                          value={form.summary}
                          onChange={(e) => set("summary", e.target.value)}
                          placeholder="Brief summary of your request"
                        />
                      </Field>
                    </div>
                  </motion.div>

                  {/* Details + attachment */}
                  <motion.div {...reveal()} className="space-y-5">
                    <Field id="description" label="Details" hint="(optional)">
                      <textarea
                        id="description"
                        rows={5}
                        className={fieldCls(false)}
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder="Describe your request — steps, links, or anything that helps us understand…"
                      />
                    </Field>

                    <div>
                      <p className="mb-1.5 block text-sm font-medium text-gray-700">
                        Attachment <span className="font-normal text-gray-400">(optional · image or PDF, max {MAX_FILE_MB}MB)</span>
                      </p>
                      {file ? (
                        <div className="flex items-center gap-3 rounded-token-btn border border-gray-200 bg-gray-50 px-4 py-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
                            <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFile(null)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            aria-label="Remove attachment"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                          onDragLeave={() => setDrag(false)}
                          onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
                          className={cn(
                            "flex w-full items-center justify-center gap-2 rounded-token-btn border-2 border-dashed px-4 py-5 text-sm transition-colors",
                            drag ? "border-accent bg-accent/5 text-accent" : "border-gray-300 text-gray-500 hover:border-accent/60 hover:text-primary",
                          )}
                        >
                          <Paperclip className="h-4 w-4" />
                          <span>Click or drag &amp; drop a file</span>
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => { pickFile(e.target.files?.[0]); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      />
                    </div>
                  </motion.div>

                  {/* Privacy note */}
                  <div className="flex items-start gap-2 text-xs text-text-muted">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>Your details are kept private and used only to respond to your request. We’ll never share them.</span>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={submitting || reduce ? {} : { scale: 1.01 }}
                    whileTap={submitting ? {} : { scale: 0.99 }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-token-btn bg-accent py-3.5 font-semibold text-white shadow-md transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    {submitting ? "Submitting…" : "Submit request"}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── WHAT TO EXPECT ── */}
      <section className="mx-auto max-w-5xl px-6 py-14 lg:py-20">
        <motion.div {...reveal()} className="mb-8 text-center">
          <Eyebrow icon={Clock}>{expect.eyebrow || "What happens next"}</Eyebrow>
          <h2 className="mt-3 font-heading text-2xl font-bold text-primary md:text-3xl">
            {expect.title || "After you hit submit"}
          </h2>
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-3">
          <ExpectCard icon={Hash} title="You get a ticket number" text="We log your request and show you a reference you can quote any time." delay={0} />
          <ExpectCard icon={Mail} title="We reply by email" text={`The ${orgName} team gets back to you${supportEmail ? ` from ${supportEmail}` : ""}, usually within 1–2 business days.`} delay={0.1} />
          <ExpectCard icon={ThumbsUp} title="We see it through" text="We track every request to resolution and may ask how we did once it’s sorted." delay={0.2} />
        </div>
      </section>
    </motion.div>
  );
}
