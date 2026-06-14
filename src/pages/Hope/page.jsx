import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowDown,
  HeartHandshake,
  CalendarCheck,
  Users,
  Loader2,
  CheckCircle2,
  UserRound,
  Sparkles,
} from "lucide-react";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { sectionReveal } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";
import usePageContent from "../../hooks/usePageContent";
import { useTenant } from "../../context/TenantContext";
import { cn } from "../../utils/cn";
import axiosInstance from "../../services/axios";
import joinTeamService from "../../services/joinTeam.service";
import { toast } from "react-hot-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  age: "",
  gender: "",
  address: "",
  skills: "",
  availableDays: [],
};

// Reusable scroll-reveal: rises + fades in as it enters the viewport (once).
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
});

/* Underline input — mirrors the Branding screen's field style (straight edges,
   no box, accent on focus), with a red variant for inline errors. */
const fieldCls = (hasError) =>
  cn(
    "w-full border-b bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400",
    hasError ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-accent",
  );

/* Label + inline error wrapper. */
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

/* Section header — matches Branding's SectionHead (accent icon + divider).
   The icon pops in (spring) when the section scrolls into view. */
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

// Stagger container + item for tile entrances.
const tileGroupVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const tileItemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

/* Selectable tiles — mirrors the donation-type selector on the Donate page:
   the tile fills with accent when selected. Staggered entrance + hover-lift /
   tap-press motion (reduced-motion aware). Works for single- and multi-select. */
function TileGroup({ options, selected, onToggle, ariaLabel, columns = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="group"
      aria-label={ariaLabel}
      className={cn("grid gap-2", columns)}
      variants={tileGroupVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <motion.button
            key={opt}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(opt)}
            variants={tileItemVariants}
            whileHover={reduce ? undefined : { y: -3, scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            className={cn(
              "border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200",
              on
                ? "border-accent bg-accent text-white shadow-md shadow-accent/25"
                : "border-gray-200 bg-white text-gray-600 hover:border-accent/60 hover:text-primary hover:shadow-sm",
            )}
          >
            {opt}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

/* Accent line that draws across a card's top border as it scrolls into view
   (slow draw). Place inside a `relative` card as its first child. */
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

const Hope = () => {
  const { organisation } = useTenant();
  const orgName = organisation?.name || "our team";

  // `loading` is true until the CMS content resolves — we gate the hero text on
  // it so we never flash a fallback string that then swaps to the saved value.
  const { content, loading: contentLoading } = usePageContent("teamHope");
  const hero = content?.hero || {};

  const [formData, setFormData] = useState(EMPTY_FORM);
  // Per-tenant custom questions + the visitor's answers (keyed by question key).
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState(null);

  const formRef = useRef(null);
  const reduce = useReducedMotion();

  /* ── Scroll motion ──────────────────────────────────────────────────── */
  // Page-wide progress bar (smoothed with a spring).
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  // Hero parallax: background drifts + zooms; content rises + fades on scroll.
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroBgY = useTransform(heroProgress, [0, 1], reduce ? ["0%", "0%"] : ["-12%", "12%"]);
  const heroScale = useTransform(heroProgress, [0, 1], reduce ? [1, 1] : [1, 1.08]);
  const heroContentY = useTransform(heroProgress, [0, 1], reduce ? [0, 0] : [0, -70]);
  const heroContentOpacity = useTransform(heroProgress, [0, 0.85], reduce ? [1, 1] : [1, 0]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    joinTeamService.getForm().then(setQuestions).catch(() => {});
  }, []);

  const set = (key, value) => {
    setFormData((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const setAnswer = (key, value) => {
    setAnswers((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const toggleAnswerOption = (key, option) => {
    setAnswers((p) => {
      const cur = Array.isArray(p[key]) ? p[key] : [];
      return { ...p, [key]: cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option] };
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const handleDayToggle = (day) =>
    set(
      "availableDays",
      formData.availableDays.includes(day)
        ? formData.availableDays.filter((d) => d !== day)
        : [...formData.availableDays, day],
    );

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const validate = () => {
    const e = {};
    if (!formData.firstName.trim()) e.firstName = "Please enter your first name";
    if (!formData.lastName.trim()) e.lastName = "Please enter your last name";
    if (!formData.email.trim()) e.email = "Please enter your email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Enter a valid email address";
    if (!formData.phoneNumber.trim()) e.phoneNumber = "Please enter your phone number";
    if (!String(formData.age).trim()) e.age = "Please enter your age";
    if (!formData.gender) e.gender = "Please select your gender";
    if (!formData.address.trim()) e.address = "Please enter your address";
    if (!formData.skills.trim()) e.skills = "Tell us a little about your skills";
    if (formData.availableDays.length === 0) e.availableDays = "Select at least one day";
    for (const q of questions) {
      if (!q.required) continue;
      const val = answers[q.key];
      const empty = q.type === "checkbox" ? !(Array.isArray(val) && val.length) : !String(val ?? "").trim();
      if (empty) e[q.key] = `${q.label} is required`;
    }
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      // Focus the first invalid field for accessibility.
      const firstKey = Object.keys(e)[0];
      const el = document.getElementById(firstKey) || document.getElementById(`q-${firstKey}`);
      el?.focus?.();
      if (!el) scrollToForm();
      return;
    }
    setSubmitting(true);
    try {
      await axiosInstance.post("/join", { ...formData, answers });
      setSubmittedName(formData.firstName.trim() || "there");
      setFormData(EMPTY_FORM);
      setAnswers({});
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.log(err);
      toast.error("Something went wrong — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndApplyAgain = () => {
    setSubmittedName(null);
    setTimeout(scrollToForm, 50);
  };

  const WHY = [
    {
      icon: HeartHandshake,
      title: "Make a real impact",
      text: "Your time and skills directly help the people we serve.",
    },
    {
      icon: CalendarCheck,
      title: "Flexible commitment",
      text: "Volunteer on the days that work for you — no pressure.",
    },
    {
      icon: Users,
      title: "A welcoming community",
      text: `Join a team of people who care, here at ${orgName}.`,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Scroll progress bar */}
      <motion.div
        style={{ scaleX: progressX }}
        className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent"
      />

      {/* Hero — parallax background + scroll-reactive content */}
      <div ref={heroRef} className="relative overflow-hidden py-36 lg:py-44">
        <motion.div style={{ y: heroBgY, scale: heroScale }} className="absolute -inset-y-[16%] inset-x-0 will-change-transform">
          <img
            src={hero.image ?? "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1600&q=80"}
            alt=""
            className="h-full w-full object-cover"
          />
          <HeroOverlay />
        </motion.div>
        <motion.div style={{ y: heroContentY, opacity: heroContentOpacity }} className="relative z-10 px-6 text-center">
          {contentLoading ? (
            // Skeleton while CMS content loads → avoids the text-swap flash.
            <div className="mx-auto flex flex-col items-center gap-4">
              <div className="h-11 w-64 max-w-[80vw] animate-pulse bg-white/20 md:h-14 md:w-96" />
              <div className="h-4 w-80 max-w-[90vw] animate-pulse bg-white/15" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={hero.title ?? "Team Hope"}>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="font-heading text-4xl font-bold text-[#F5EDE0] md:text-5xl lg:text-6xl"
                >
                  {hero.title ?? "Team Hope"}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="mx-auto mt-4 max-w-2xl font-body text-[#EDE4D3]/70"
                >
                  {hero.subtitle ?? "Join our volunteer community"}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          )}
          <motion.button
            type="button"
            onClick={scrollToForm}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -3 }}
            className="mt-8 inline-flex items-center gap-2 bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-accent-light"
          >
            Apply to volunteer
            <motion.span
              animate={reduce ? {} : { y: [0, 4, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowDown className="h-4 w-4" />
            </motion.span>
          </motion.button>
        </motion.div>
      </div>

      {/* Why volunteer */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <motion.div {...sectionReveal} className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Why volunteer
          </span>
          <h2 className="mt-3 font-heading text-3xl font-bold text-primary">Give a little, change a lot</h2>
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-3">
          {WHY.map((w, i) => (
            <motion.div
              key={w.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
              whileHover={reduce ? {} : { y: -6 }}
              className="group relative overflow-hidden border border-gray-100 bg-white text-center shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
            >
              <CardHoverGlow />
              <div className="relative p-6">
                <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-accent group-hover:text-white">
                  <w.icon className="h-6 w-6" />
                </span>
                <h3 className="font-heading text-lg font-bold text-primary">{w.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{w.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Application / success */}
      <section ref={formRef} className="scroll-mt-24 bg-background/60 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <AnimatePresence mode="wait">
            {submittedName ? (
              /* ── Success state ─────────────────────────────────────── */
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative border border-gray-100 bg-white p-10 text-center shadow-sm"
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
                <h2 className="font-heading text-2xl font-bold text-primary">Thank you, {submittedName}! 🎉</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
                  We&apos;ve received your application and a member of the {orgName} team will be in touch soon. Keep an
                  eye on your inbox.
                </p>
                <button
                  type="button"
                  onClick={resetAndApplyAgain}
                  className="mt-6 inline-flex items-center gap-2 border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-accent hover:text-accent"
                >
                  Submit another response
                </button>
              </motion.div>
            ) : (
              /* ── Application form ──────────────────────────────────── */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative border border-gray-100 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
              >
                <CardTopLine delay={0.2} />
                <div className="mb-8 text-center">
                  <h2 className="font-heading text-3xl font-bold text-primary">
                    {content?.formHeading ?? "Join our team"}
                  </h2>
                  <p className="mt-2 text-sm text-text-muted">
                    Fill in the form below — it only takes a couple of minutes.
                  </p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-10">
                  {/* About you */}
                  <motion.div {...reveal()}>
                    <SectionHead icon={UserRound} title="About you" subtitle="So we know who you are and how to reach you." />
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                      <Field id="firstName" label="First name" required error={errors.firstName}>
                        <input
                          id="firstName"
                          type="text"
                          autoComplete="given-name"
                          aria-invalid={!!errors.firstName}
                          className={fieldCls(errors.firstName)}
                          value={formData.firstName}
                          onChange={(e) => set("firstName", e.target.value)}
                        />
                      </Field>
                      <Field id="lastName" label="Last name" required error={errors.lastName}>
                        <input
                          id="lastName"
                          type="text"
                          autoComplete="family-name"
                          aria-invalid={!!errors.lastName}
                          className={fieldCls(errors.lastName)}
                          value={formData.lastName}
                          onChange={(e) => set("lastName", e.target.value)}
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
                          value={formData.email}
                          onChange={(e) => set("email", e.target.value)}
                        />
                      </Field>
                      <Field id="phoneNumber" label="Phone number" required error={errors.phoneNumber}>
                        <input
                          id="phoneNumber"
                          type="tel"
                          autoComplete="tel"
                          aria-invalid={!!errors.phoneNumber}
                          className={fieldCls(errors.phoneNumber)}
                          value={formData.phoneNumber}
                          onChange={(e) => set("phoneNumber", e.target.value.replace(/[^0-9]/g, ""))}
                        />
                      </Field>
                      <Field id="age" label="Age" required error={errors.age}>
                        <input
                          id="age"
                          type="number"
                          min="1"
                          aria-invalid={!!errors.age}
                          className={fieldCls(errors.age)}
                          value={formData.age}
                          onChange={(e) => set("age", e.target.value)}
                        />
                      </Field>
                      <Field id="gender" label="Gender" required error={errors.gender}>
                        <TileGroup
                          options={["Male", "Female"]}
                          selected={formData.gender ? [formData.gender] : []}
                          onToggle={(o) => set("gender", formData.gender === o ? "" : o)}
                          ariaLabel="Gender"
                          columns="grid-cols-2"
                        />
                      </Field>
                      <Field id="address" label="Address" required error={errors.address} full>
                        <input
                          id="address"
                          type="text"
                          autoComplete="street-address"
                          aria-invalid={!!errors.address}
                          className={fieldCls(errors.address)}
                          value={formData.address}
                          onChange={(e) => set("address", e.target.value)}
                        />
                      </Field>
                    </div>
                  </motion.div>

                  {/* Skills & availability */}
                  <motion.div {...reveal()}>
                    <SectionHead
                      icon={CalendarCheck}
                      title="Skills & availability"
                      subtitle="Help us match you with the right opportunities."
                    />
                    <div className="space-y-5">
                      <Field id="skills" label="What skills or experience do you have?" required error={errors.skills}>
                        <textarea
                          id="skills"
                          rows={4}
                          placeholder="e.g. first aid, event coordination, social media, driving…"
                          aria-invalid={!!errors.skills}
                          className={fieldCls(errors.skills)}
                          value={formData.skills}
                          onChange={(e) => set("skills", e.target.value)}
                        />
                      </Field>
                      <div>
                        <p className="mb-2 block text-sm font-medium text-gray-700">
                          Which days are you available? <span className="text-red-500">*</span>
                        </p>
                        <TileGroup
                          options={DAYS}
                          selected={formData.availableDays}
                          onToggle={handleDayToggle}
                          ariaLabel="Days available"
                        />
                        {errors.availableDays && <p className="mt-2 text-xs text-red-500">{errors.availableDays}</p>}
                      </div>
                    </div>
                  </motion.div>

                  {/* Custom questions */}
                  {questions.length > 0 && (
                    <motion.div {...reveal()}>
                      <SectionHead icon={Sparkles} title="A few more questions" subtitle={`From the ${orgName} team.`} />
                      <div className="space-y-5">
                        {questions.map((q) => {
                          const val = answers[q.key] ?? (q.type === "checkbox" ? [] : "");
                          const err = errors[q.key];
                          return (
                            <Field key={q.key} id={`q-${q.key}`} label={q.label} required={q.required} error={err}>
                              {q.type === "textarea" ? (
                                <textarea
                                  id={`q-${q.key}`}
                                  rows={3}
                                  aria-invalid={!!err}
                                  className={fieldCls(err)}
                                  value={val}
                                  onChange={(e) => setAnswer(q.key, e.target.value)}
                                />
                              ) : q.type === "select" ? (
                                <select
                                  id={`q-${q.key}`}
                                  aria-invalid={!!err}
                                  className={fieldCls(err)}
                                  value={val}
                                  onChange={(e) => setAnswer(q.key, e.target.value)}
                                >
                                  <option value="">Select</option>
                                  {(q.options || []).map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              ) : q.type === "checkbox" ? (
                                <TileGroup
                                  options={q.options || []}
                                  selected={Array.isArray(val) ? val : []}
                                  onToggle={(o) => toggleAnswerOption(q.key, o)}
                                  ariaLabel={q.label}
                                />
                              ) : (
                                <input
                                  id={`q-${q.key}`}
                                  type={
                                    q.type === "number"
                                      ? "number"
                                      : q.type === "email"
                                      ? "email"
                                      : q.type === "phone"
                                      ? "tel"
                                      : "text"
                                  }
                                  aria-invalid={!!err}
                                  className={fieldCls(err)}
                                  value={val}
                                  onChange={(e) => setAnswer(q.key, e.target.value)}
                                />
                              )}
                              {q.help ? <p className="mt-1 text-xs text-gray-400">{q.help}</p> : null}
                            </Field>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  <motion.button
                    {...reveal()}
                    type="submit"
                    disabled={submitting}
                    whileHover={submitting || reduce ? {} : { scale: 1.01 }}
                    whileTap={submitting ? {} : { scale: 0.99 }}
                    className="inline-flex w-full items-center justify-center gap-2 bg-accent py-3.5 font-semibold text-white shadow-md transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Submitting…
                      </>
                    ) : (
                      "Submit application"
                    )}
                  </motion.button>
                  <p className="text-center text-xs text-text-muted">
                    We&apos;ll only use your details to contact you about volunteering.
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <NewsletterSection />
    </motion.div>
  );
};

export default Hope;
