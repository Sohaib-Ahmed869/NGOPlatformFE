import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Calendar,
  Users,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import programService from "../../services/program.service";
import toast from "react-hot-toast";
import NewsletterSection from "../Home/Newsletter/newsletter";
import HeroOverlay from "../../components/HeroOverlay";
import { cn } from "../../utils/cn";

const money = (n) => Number(n || 0).toLocaleString();
const HERO_FALLBACK_BG = "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-primary-light, #4A3C2A))";
const presetAmounts = [25, 50, 100, 250, 500, 1000];

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
});

function Eyebrow({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </span>
  );
}

const STATUS_META = {
  published: { label: "Active", dot: "bg-emerald-400" },
  completed: { label: "Completed", dot: "bg-sky-400" },
  draft: { label: "Draft", dot: "bg-gray-300" },
};

export default function ProgramDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  // Program handed over via router state from the listing/donate cards → render
  // instantly with no network round-trip. Falls back to fetching on direct
  // access or refresh (where router state is absent).
  const passedProgram = location.state?.program?._id === id ? location.state.program : null;
  const [program, setProgram] = useState(passedProgram);
  const [loading, setLoading] = useState(!passedProgram);
  const [donateAmount, setDonateAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [lightbox, setLightbox] = useState(null);

  /* Page scroll-progress bar. */
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  /* Hero parallax. */
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroBgY = useTransform(heroProgress, [0, 1], reduce ? ["0%", "0%"] : ["-12%", "12%"]);
  const heroScale = useTransform(heroProgress, [0, 1], reduce ? [1, 1] : [1, 1.08]);
  const heroContentY = useTransform(heroProgress, [0, 1], reduce ? [0, 0] : [0, -60]);
  const heroContentOpacity = useTransform(heroProgress, [0, 0.85], reduce ? [1, 1] : [1, 0]);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Already have the full program from router state — skip the API call.
    if (passedProgram) return;
    let active = true;
    const fetchProgram = async () => {
      try {
        const res = await programService.getById(id);
        if (active) setProgram(res.data);
      } catch {
        console.error("Failed to fetch program");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProgram();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const activeAmount = customAmount || donateAmount;

  const handleDonate = () => {
    if (!activeAmount || parseFloat(activeAmount) <= 0) {
      toast.error("Please select or enter a donation amount");
      return;
    }
    navigate("/program-checkout", { state: { program, amount: parseFloat(activeAmount) } });
  };

  const images = program?.images || [];
  const coverUrl = images[program?.coverImageIndex || 0]?.url || images[0]?.url || "";
  const pct = program?.goalAmount > 0 ? Math.min(100, Math.round((program.raisedAmount / program.goalAmount) * 100)) : 0;
  const remaining = program ? Math.max(0, program.goalAmount - program.raisedAmount) : 0;
  const isPublished = program?.status === "published";
  const status = STATUS_META[program?.status] || { label: program?.status, dot: "bg-gray-300" };
  const openLightbox = (imgs, index) => setLightbox({ images: imgs, index });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Scroll progress bar */}
      <motion.div style={{ scaleX: progressX }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent" />

      {/* ── HERO — dark cover banner with parallax ────────────────────── */}
      <div ref={heroRef} data-hero className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden py-32 lg:py-40">
        {coverUrl ? (
          <motion.div style={{ y: heroBgY, scale: heroScale }} className="absolute -inset-y-[16%] inset-x-0 will-change-transform">
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            <HeroOverlay />
          </motion.div>
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: HERO_FALLBACK_BG }} />
            <div className="absolute inset-0 bg-black/30" />
          </>
        )}

        <motion.div style={{ y: heroContentY, opacity: heroContentOpacity }} className="relative z-10 mx-auto max-w-5xl px-6">
          <Link
            to="/programs"
            className="group mb-6 flex w-fit items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Programs
          </Link>

          {loading ? (
            <div className="space-y-4">
              <div className="h-7 w-28 animate-pulse bg-white/20" />
              <div className="h-12 w-3/4 max-w-2xl animate-pulse bg-white/20" />
              <div className="h-4 w-64 animate-pulse bg-white/15" />
            </div>
          ) : !program ? (
            <div>
              <h1 className="font-heading text-4xl font-bold text-warm-cream md:text-5xl">Program not found</h1>
              <p className="mt-3 font-body text-warm-beige/70">This program may have been removed or is no longer available.</p>
            </div>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} /> {status.label}
              </span>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-4 max-w-3xl font-heading text-3xl font-bold leading-tight text-warm-cream md:text-5xl"
              >
                {program.title}
              </motion.h1>

              {/* Slim progress + meta */}
              <div className="mt-6 max-w-xl">
                <div className="mb-1.5 flex items-end justify-between text-warm-cream">
                  <span className="font-heading text-lg font-bold">
                    ${money(program.raisedAmount)} <span className="text-sm font-normal text-warm-beige/70">raised of ${money(program.goalAmount)}</span>
                  </span>
                  <span className="font-heading text-lg font-bold text-accent">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden bg-white/20">
                  <motion.div className="h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.3, ease: "easeOut" }} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-warm-beige/80">
                  <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {program.donors?.length || program.donorCount || 0} donors</span>
                  <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Started {new Date(program.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      {!loading && program && (
        <section className="bg-background px-6 py-16 lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-5">
            {/* Left — story, gallery, updates */}
            <div className="space-y-10 lg:col-span-3">
              {/* About */}
              {program.description && (
                <motion.div {...reveal()}>
                  <Eyebrow icon={Sparkles}>About this program</Eyebrow>
                  <p className="mt-4 whitespace-pre-line font-body leading-relaxed text-text-muted">{program.description}</p>
                </motion.div>
              )}

              {/* Gallery */}
              {images.length > 0 && (
                <motion.div {...reveal()}>
                  <div className="mb-4 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-accent" />
                    <h2 className="font-heading text-lg font-bold text-primary">Gallery</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openLightbox(images.map((x) => x.url), i)}
                        className="group relative aspect-square overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                      >
                        <img src={img.url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <span className="absolute inset-0 bg-accent/0 transition-colors group-hover:bg-accent/10" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Updates */}
              {program.followUpUpdates?.length > 0 && (
                <motion.div {...reveal()}>
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <h2 className="font-heading text-lg font-bold text-primary">Program updates</h2>
                  </div>
                  <div className="space-y-3">
                    {[...program.followUpUpdates]
                      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
                      .map((update, i) => (
                        <div key={i} className="rounded-token border border-gray-100 border-l-2 border-l-accent bg-white p-4 shadow-sm">
                          <p className="text-sm leading-relaxed text-primary">{update.text}</p>
                          {update.images?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {update.images.map((img, k) => (
                                <button key={k} type="button" onClick={() => openLightbox(update.images, k)} className="focus:outline-none">
                                  <img src={img} alt="" className="h-20 w-20 cursor-zoom-in border border-gray-200 object-cover transition-all hover:ring-2 hover:ring-accent/40" />
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="mt-2 flex items-center gap-1 text-xs text-text-muted">
                            <Calendar className="h-3 w-3" /> {new Date(update.sentAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right — sticky donate card */}
            <motion.div {...reveal(0.1)} className="lg:col-span-2">
              <div className="lg:sticky lg:top-24">
                <div className="relative overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm">
                  {/* progress summary */}
                  <div className="border-b border-gray-100 p-6">
                    <div className="mb-2 flex items-end justify-between">
                      <div>
                        <p className="font-heading text-2xl font-bold text-primary">${money(program.raisedAmount)}</p>
                        <p className="text-xs text-text-muted">raised of ${money(program.goalAmount)} goal</p>
                      </div>
                      <span className="font-heading text-lg font-bold text-accent">{pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden bg-gray-100">
                      <motion.div className="h-full bg-accent" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      {[
                        { icon: Users, value: program.donors?.length || program.donorCount || 0, label: "Donors" },
                        { icon: Heart, value: `$${money(remaining)}`, label: "Remaining" },
                        { icon: Calendar, value: new Date(program.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" }), label: "Started" },
                      ].map((s) => (
                        <div key={s.label} className="rounded-token border border-gray-100 p-2.5">
                          <s.icon className="mx-auto mb-1 h-4 w-4 text-accent" />
                          <p className="text-sm font-semibold text-primary">{s.value}</p>
                          <p className="text-[10px] text-text-muted">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* donate / unavailable */}
                  {isPublished ? (
                    <div className="p-6">
                      <h3 className="font-heading text-lg font-bold text-primary">Make a donation</h3>
                      <p className="mb-5 mt-0.5 text-xs text-text-muted">Securely processed at checkout.</p>

                      <div className="mb-4 grid grid-cols-3 gap-2">
                        {presetAmounts.map((amt) => {
                          const active = donateAmount === String(amt) && !customAmount;
                          return (
                            <motion.button
                              key={amt}
                              type="button"
                              whileHover={reduce ? undefined : { y: -2, scale: 1.04 }}
                              whileTap={reduce ? undefined : { scale: 0.96 }}
                              transition={{ type: "spring", stiffness: 400, damping: 24 }}
                              onClick={() => { setDonateAmount(String(amt)); setCustomAmount(""); }}
                              className={cn(
                                "rounded-token-btn border py-2.5 text-sm font-semibold transition-colors",
                                active ? "border-accent bg-accent text-white shadow-md shadow-accent/25" : "border-gray-200 bg-white text-primary hover:border-accent/50",
                              )}
                            >
                              ${amt}
                            </motion.button>
                          );
                        })}
                      </div>

                      <div className="mb-5 flex items-center gap-2 rounded-token-input border border-gray-200 px-3 transition-colors focus-within:border-accent">
                        <span className="text-sm font-semibold text-gray-400">$</span>
                        <input
                          type="number"
                          min="1"
                          value={customAmount}
                          onChange={(e) => { setCustomAmount(e.target.value); setDonateAmount(""); }}
                          placeholder="Custom amount"
                          className="w-full bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                        />
                      </div>

                      <motion.button
                        type="button"
                        onClick={handleDonate}
                        whileHover={reduce ? {} : { scale: 1.01 }}
                        whileTap={reduce ? {} : { scale: 0.99 }}
                        className="flex w-full items-center justify-center gap-2 rounded-token-btn bg-accent py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
                      >
                        <Heart className="h-4 w-4" /> Donate {activeAmount ? `$${activeAmount}` : "now"} <ArrowRight className="h-4 w-4" />
                      </motion.button>

                      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
                        <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Secure checkout · instant receipt
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center bg-accent/10 text-accent">
                        <Heart className="h-6 w-6" />
                      </span>
                      <p className="font-heading font-semibold text-primary">
                        {program.status === "completed" ? "Program completed" : "Program unavailable"}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">This program is no longer accepting donations. Thank you to everyone who gave.</p>
                      <Link to="/programs" className="mt-5 inline-flex items-center gap-2 rounded-token-btn border border-gray-200 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent">
                        Explore other programs <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {!loading && program && <NewsletterSection />}

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setLightbox(null)} />
            <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            {lightbox.images.length > 1 && (
              <>
                <button
                  onClick={() => setLightbox((l) => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length }))}
                  className="absolute left-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setLightbox((l) => ({ ...l, index: (l.index + 1) % l.images.length }))}
                  className="absolute right-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <motion.img
              key={lightbox.index}
              src={lightbox.images[lightbox.index]}
              alt=""
              className="relative max-h-[85vh] max-w-[90vw] object-contain shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            {lightbox.images.length > 1 && (
              <div className="absolute bottom-4 text-sm text-white/60">
                {lightbox.index + 1} / {lightbox.images.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
