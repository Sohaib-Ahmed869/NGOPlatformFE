import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Heart,
  HandHeart,
  Lock,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Target,
} from "lucide-react";
import { useCart } from "../Components/cart";
import { useTenant } from "../../context/TenantContext";
import usePageContent from "../../hooks/usePageContent";
import donationTypeService from "../../services/donationtypeservice";
import programService from "../../services/program.service";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { cn } from "../../utils/cn";
import { toast } from "react-hot-toast";

const money = (n) => Number(n || 0).toLocaleString();

const presetAmounts = [25, 50, 100, 250, 500];

// Default emotional hero image (used unless the tenant sets hero.image in the CMS).
const DONATE_IMG =
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80";

// Sample impact statements per amount. These are placeholders — edit them to
// match the tenant's real programs (or wire to the CMS / donation-type config).
const IMPACT = {
  25: "Feeds a family for a week",
  50: "A month of clean water",
  100: "School supplies for a child",
  250: "An emergency relief kit",
  500: "Funds a community project",
};

const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";

/* ── shared motion vocabulary (mirrors the Hope / Contact pages) ──────────── */

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
});

function Eyebrow({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </span>
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

/* One node in the give-flow stepper. */
function StepBadge({ n, label, step }) {
  const done = step > n;
  const active = step === n;
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "grid h-6 w-6 place-items-center text-[11px] font-bold transition-colors",
          done || active ? "bg-accent text-white" : "border border-gray-300 text-gray-400",
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <span className={cn("text-xs font-semibold uppercase tracking-wider transition-colors", step >= n ? "text-primary" : "text-gray-400")}>
        {label}
      </span>
    </div>
  );
}

/* ── Hero + give form ─────────────────────────────────────────────────────── */

const QuickDonate = ({ programs }) => {
  const { addItem } = useCart();
  const { organisation } = useTenant();
  const { content } = usePageContent("donate");
  const hero = content?.hero || {};
  const reduce = useReducedMotion();

  const orgName = organisation?.name || "";

  // Hero background parallax (gentle drift + zoom on scroll).
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(heroProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "16%"]);
  const bgScale = useTransform(heroProgress, [0, 1], reduce ? [1, 1] : [1, 1.12]);

  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [donationType, setDonationType] = useState("");
  // Hydrate from the cached list so revisits paint instantly (no skeleton flash).
  const [donationTypes, setDonationTypes] = useState(() => donationTypeService.getCached() || []);
  const [loadingTypes, setLoadingTypes] = useState(() => !donationTypeService.getCached());
  const [step, setStep] = useState(1); // give flow: 1 = choose cause, 2 = choose amount

  useEffect(() => {
    let active = true;
    // Revalidate in the background (stale-while-revalidate). The cached copy is
    // already on screen; we only block with the skeleton on a cold load, and an
    // admin edit silently updates the list on the next view.
    donationTypeService
      .refresh()
      .then((list) => {
        // Don't pre-select a cause — let the donor choose. "Continue" stays
        // disabled until they pick one.
        if (active) setDonationTypes(list);
      })
      .catch(() => {
        /* keep whatever's cached — the selector just won't refresh */
      })
      .finally(() => {
        if (active) setLoadingTypes(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeAmount = customAmount || amount;
  const hasTypes = donationTypes.length > 0;

  const handleDonate = () => {
    const value = Number(activeAmount);
    if (!value || value <= 0) {
      toast.error("Please choose or enter a donation amount");
      return;
    }
    addItem({
      // Unique id per gift so distinct amounts/causes don't collapse into one
      // cart line (the cart de-dupes on id).
      id: `give-${(donationType || "donation").toLowerCase().replace(/\s+/g, "-")}-${value}-${Date.now()}`,
      title: donationType || "Donation",
      price: value,
      donationType: donationType || "Sadaqah",
      image: "",
    });
    toast.success(`$${value} added to your giving cart`);
    setCustomAmount("");
  };

  // Render the headline with an optional accent-coloured highlight phrase.
  const renderHeroTitle = () => {
    const title = hero.title ?? "Your generosity changes lives";
    const highlight = hero.highlight ?? "changes lives";
    if (highlight && title.includes(highlight)) {
      const idx = title.indexOf(highlight);
      return (
        <>
          {title.slice(0, idx)}
          <span className="text-accent">{highlight}</span>
          {title.slice(idx + highlight.length)}
        </>
      );
    }
    return title;
  };

  // Honest, live figures derived from real published programs.
  const totalRaised = programs.reduce((s, p) => s + (p.raisedAmount || 0), 0);
  const stats = [];
  if (programs.length > 0) {
    stats.push({ icon: Target, value: programs.length, label: programs.length === 1 ? "Active program" : "Active programs" });
    if (totalRaised > 0) stats.push({ icon: TrendingUp, value: `$${money(totalRaised)}`, label: "Raised so far" });
  }

  return (
    <section ref={heroRef} className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden pb-16 pt-24 lg:pb-24 lg:pt-28">
      {/* Emotional background image with parallax + dark overlays for legibility */}
      <motion.div style={{ y: bgY, scale: bgScale }} className="absolute -inset-y-[8%] inset-x-0 will-change-transform">
        <img src={hero.image ?? DONATE_IMG} alt="" className="h-full w-full object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/40" />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: `linear-gradient(135deg, var(--tenant-primary, #2C2418), transparent 70%)` }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,430px)] lg:gap-14">
          {/* Left — emotional pitch, in white over the image */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-heading text-4xl font-bold leading-[1.08] text-white md:text-5xl lg:text-6xl">
              {renderHeroTitle()}
            </h1>
            <p className="mt-5 max-w-xl font-body text-lg leading-relaxed text-white/75">
              {hero.subtitle ??
                "Choose an amount, pick a cause, and give in seconds. Every gift is secure, receipted, and goes directly to the work that matters."}
            </p>

            {stats.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {stats.map((s) => (
                  <motion.div
                    key={s.label}
                    whileHover={reduce ? {} : { y: -4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 24 }}
                    className="flex items-center gap-3 rounded-token border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center bg-accent/20 text-accent">
                      <s.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-heading text-lg font-bold leading-none text-white">{s.value}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-white/50">{s.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right — the give form (premium donation card, floats on the image) */}
          <motion.div
            className="relative overflow-hidden rounded-token border border-white/20 bg-white/80 shadow-2xl backdrop-blur-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            {/* Decorative donation shapes — newsletter-style corner glows + outlined
                square, plus a faint giving-hand watermark. All behind content. */}
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 -rotate-12 border-2 border-accent/15" />

            {/* Header band — warm gradient, heartbeat icon, trust badges */}
            <div className="relative overflow-hidden border-b border-gray-200/60 px-6 py-5 sm:px-7">
              <div className="relative flex items-start gap-3.5">
                <motion.span
                  animate={reduce ? {} : { scale: [1, 1.09, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-md shadow-accent/30"
                >
                  <HandHeart className="h-6 w-6" />
                </motion.span>
                <div>
                  <h2 className="font-heading text-xl font-bold text-primary">Give in seconds</h2>
                  <p className="mt-0.5 text-sm text-text-muted">Secure, receipted, and directed to your cause.</p>
                </div>
              </div>
            </div>

            {/* Body — guided two-step give flow */}
            <div className="relative px-6 py-6 sm:px-7">
              {/* Stepper (only when there are causes to choose → 2 steps) */}
              {!loadingTypes && hasTypes && (
                <div className="mb-6 flex items-center gap-3">
                  <StepBadge n={1} label="Cause" step={step} />
                  <div className={cn("h-px flex-1 transition-colors", step > 1 ? "bg-accent" : "bg-gray-200")} />
                  <StepBadge n={2} label="Amount" step={step} />
                </div>
              )}

              <AnimatePresence mode="wait" initial={false}>
                {loadingTypes ? (
                  /* ── Loading causes — skeleton so we never flash the amount step ─ */
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="animate-pulse"
                    aria-hidden
                  >
                    <div className="mb-2 h-3 w-28 rounded bg-gray-200" />
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-11 rounded-token-btn bg-gray-200" />
                      ))}
                    </div>
                    <div className="mt-6 h-12 w-full rounded-token-btn bg-gray-200" />
                  </motion.div>
                ) : hasTypes && step === 1 ? (
                  /* ── Step 1 — choose a cause ─────────────────────────── */
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <label className={labelCls}>Choose a cause</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {donationTypes.map((t) => {
                        const active = donationType === t.donationType;
                        return (
                          <motion.button
                            key={t._id || t.donationType}
                            type="button"
                            whileHover={reduce ? undefined : { y: -3, scale: 1.03 }}
                            whileTap={reduce ? undefined : { scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 24 }}
                            onClick={() => setDonationType(t.donationType)}
                            className={cn(
                              "rounded-token-btn border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                              active
                                ? "border-accent bg-accent text-white shadow-md shadow-accent/25"
                                : "border-gray-200 bg-white text-gray-600 hover:border-accent/50 hover:text-primary",
                            )}
                          >
                            {t.donationType}
                          </motion.button>
                        );
                      })}
                    </div>
                    <motion.button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!donationType}
                      whileHover={reduce ? {} : { scale: 1.01 }}
                      whileTap={reduce ? {} : { scale: 0.99 }}
                      className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-token-btn bg-accent text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </motion.div>
                ) : (
                  /* ── Step 2 — choose an amount + give ────────────────── */
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {hasTypes && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-accent"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back ·{" "}
                        <span className="font-semibold text-primary">{donationType}</span>
                      </button>
                    )}

                    <label className={labelCls}>Choose an amount</label>
                    <div className="mb-3 grid grid-cols-3 gap-2">
                      {presetAmounts.map((val) => {
                        const active = !customAmount && Number(amount) === val;
                        return (
                          <motion.button
                            key={val}
                            type="button"
                            whileHover={reduce ? undefined : { y: -3, scale: 1.05 }}
                            whileTap={reduce ? undefined : { scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 24 }}
                            onClick={() => { setAmount(val); setCustomAmount(""); }}
                            className={cn(
                              "rounded-token-btn border py-3 text-sm font-semibold transition-colors",
                              active
                                ? "border-accent bg-accent text-white shadow-md shadow-accent/25"
                                : "border-gray-200 bg-white text-gray-600 hover:border-accent/50",
                            )}
                          >
                            ${val}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Custom amount */}
                    <div className="mb-5 flex items-center gap-2 rounded-token-input border border-gray-200 px-3 transition-colors focus-within:border-accent">
                      <span className="text-sm font-semibold text-gray-400">$</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="Other amount"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                      />
                    </div>

                    {/* Impact summary */}
                    <div className="mb-5 flex items-start gap-2.5 rounded-token border border-accent/20 bg-accent/5 px-4 py-3">
                      <Heart className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <p className="text-sm text-gray-600">
                        You&apos;re giving <span className="font-bold text-primary">${activeAmount || 0}</span>
                        {donationType ? <> as <span className="font-semibold text-primary">{donationType}</span></> : null}.
                        {!customAmount && IMPACT[amount] ? <> <span className="font-medium text-primary/70">{IMPACT[amount]}.</span></> : null}
                      </p>
                    </div>

                    {/* CTA */}
                    <motion.button
                      onClick={handleDonate}
                      whileHover={reduce ? {} : { scale: 1.01 }}
                      whileTap={reduce ? {} : { scale: 0.99 }}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-token-btn bg-accent text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
                    >
                      Donate {activeAmount ? `$${activeAmount}` : "Now"}
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>

                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                      <Lock className="h-3 w-3" />
                      Secure checkout · choose recurring at checkout.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ── Why give (trust band) ────────────────────────────────────────────────── */

const WhyGive = () => {
  const { organisation } = useTenant();
  const orgName = organisation?.name || "us";
  const reduce = useReducedMotion();

  const points = [
    { icon: Lock, title: "Secure by design", text: "Bank-level encryption protects every card payment, end to end." },
    { icon: Heart, title: "100% donation policy", text: "Your generosity goes straight to the cause you choose." },
    { icon: Receipt, title: "Instant receipt", text: "A tax receipt is emailed the moment your gift is confirmed." },
    { icon: ShieldCheck, title: "Privacy protected", text: "Your details are never shared or sold — full stop." },
  ];

  return (
    <section className="bg-white px-6 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div {...reveal()} className="mb-10">
          <Eyebrow icon={ShieldCheck}>Give with confidence</Eyebrow>
          <h2 className="mt-3 font-heading text-2xl font-bold text-primary md:text-3xl">
            Why donors trust {orgName}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
              whileHover={reduce ? {} : { y: -6 }}
              className="group relative overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
            >
              <CardHoverGlow />
              <div className="relative p-6">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-accent group-hover:text-white">
                  <p.icon className="h-6 w-6" />
                </span>
                <h3 className="mb-1.5 font-heading text-base font-bold text-primary">{p.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{p.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ── Active programs ──────────────────────────────────────────────────────── */

const ActivePrograms = ({ programs }) => {
  const reduce = useReducedMotion();
  if (programs.length === 0) return null;

  return (
    <section className="bg-background px-6 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div {...reveal()} className="mb-10">
          <Eyebrow icon={Target}>Active programs</Eyebrow>
          <h2 className="mt-3 font-heading text-2xl font-bold text-primary md:text-3xl">
            Support a specific cause
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {programs.slice(0, 6).map((program, i) => {
            const pct =
              program.goalAmount > 0
                ? Math.min(100, Math.round((program.raisedAmount / program.goalAmount) * 100))
                : 0;
            const cover = program.images?.[program.coverImageIndex || 0]?.url;
            return (
              <motion.div
                key={program._id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.1 }}
                whileHover={reduce ? {} : { y: -6 }}
              >
                <Link
                  to={`/programs/${program._id}`}
                  state={{ program }}
                  className="group relative flex h-full flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
                >
                  {cover ? (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={cover}
                        alt={program.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="h-1.5 bg-accent" />
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="mb-1.5 font-semibold text-primary transition-colors group-hover:text-accent">
                      {program.title}
                    </h3>
                    <p className="mb-4 line-clamp-2 flex-1 text-sm text-text-muted">
                      {program.description || "Help us reach our goal."}
                    </p>
                    <div className="mb-3">
                      <div className="mb-1.5 flex justify-between text-xs text-text-muted">
                        <span className="font-medium text-primary">
                          ${program.raisedAmount?.toLocaleString()} raised
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden bg-gray-100">
                        <motion.div
                          className="h-full bg-accent"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-text-muted">
                      <span>Goal: ${program.goalAmount?.toLocaleString()}</span>
                      <span className="flex items-center gap-1 font-semibold text-accent transition-all group-hover:gap-2">
                        Donate <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {programs.length > 6 && (
          <div className="mt-8">
            <Link
              to="/programs"
              className="inline-flex items-center gap-2 rounded-token-btn border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent"
            >
              View all programs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */

const DonatePage = () => {
  const [programs, setPrograms] = useState([]);

  // Page-wide scroll-progress bar (spring-smoothed), like the Hope / Contact pages.
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await programService.getAll();
        setPrograms((res.data || []).filter((p) => p.status === "published"));
      } catch {
        /* ignore — sections that rely on programs just won't render */
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <motion.div style={{ scaleX: progressX }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent" />
      <QuickDonate programs={programs} />
      <WhyGive />
      <ActivePrograms programs={programs} />
      <NewsletterSection />
    </div>
  );
};

export default DonatePage;
