import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { Target, ArrowRight, ArrowDown, CheckCircle, Sparkles, TrendingUp, Heart } from "lucide-react";
import programService from "../../services/program.service";
import NewsletterSection from "../Home/Newsletter/newsletter";
import HeroOverlay from "../../components/HeroOverlay";
import usePageContent from "../../hooks/usePageContent";
import { useTenant } from "../../context/TenantContext";
import { cn } from "../../utils/cn";

/* Scroll-reveal: rises + fades in as it enters the viewport (once). */
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

const money = (n) => Number(n || 0).toLocaleString();

/* ── Program card ─────────────────────────────────────────────────────── */

function ProgramCard({ program, index }) {
  const reduce = useReducedMotion();
  const pct =
    program.goalAmount > 0 ? Math.min(100, Math.round((program.raisedAmount / program.goalAmount) * 100)) : 0;
  const cover = program.images?.[program.coverImageIndex || 0];
  const isCompleted = program.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (index % 3) * 0.1 }}
      whileHover={reduce ? {} : { y: -6 }}
    >
      <Link
        to={`/programs/${program._id}`}
        state={{ program }}
        className="group relative flex h-full flex-col overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
      >
        {cover ? (
          <div className="relative h-44 overflow-hidden">
            <img
              src={cover.url}
              alt={program.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {isCompleted && (
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 bg-white/90 px-2 py-1 text-[10px] font-semibold text-primary backdrop-blur-sm">
                <CheckCircle className="h-3 w-3 text-accent" /> Completed
              </span>
            )}
          </div>
        ) : (
          <div className="h-1.5 bg-accent" />
        )}

        <div className="flex flex-1 flex-col p-6">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-heading text-lg font-semibold text-primary transition-colors group-hover:text-accent">
              {program.title}
            </h3>
            {isCompleted && !cover && (
              <span className="ml-2 inline-flex shrink-0 items-center gap-1 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                <CheckCircle className="h-3 w-3" /> Completed
              </span>
            )}
          </div>
          <p className="mb-5 line-clamp-2 flex-1 text-sm text-text-muted">
            {program.description || "Help us reach our goal."}
          </p>

          {/* Progress */}
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-xs text-text-muted">
              <span className="font-medium text-primary">${money(program.raisedAmount)} raised</span>
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
            <span>
              Goal: ${money(program.goalAmount)} <span className="mx-1.5 text-gray-300">|</span> {program.donorCount || 0} donors
            </span>
            {!isCompleted && (
              <span className="flex items-center gap-1 font-semibold text-accent transition-all group-hover:gap-2">
                Donate <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function ProgramsPage() {
  const { content, loading: contentLoading } = usePageContent("programs");
  const hero = content?.hero || {};
  const intro = content?.intro || {};
  const reduce = useReducedMotion();

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const gridRef = useRef(null);

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
    const fetch = async () => {
      try {
        const res = await programService.getAll();
        setPrograms(res.data || []);
      } catch (err) {
        console.error("Failed to fetch programs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const scrollToGrid = () => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Live impact figures derived from the real programs.
  const totalRaised = programs.reduce((s, p) => s + (p.raisedAmount || 0), 0);
  const totalDonors = programs.reduce((s, p) => s + (p.donorCount || 0), 0);
  const stats = [
    { icon: Target, value: money(programs.length), label: programs.length === 1 ? "Program" : "Programs" },
    { icon: TrendingUp, value: `$${money(totalRaised)}`, label: "Raised together" },
    { icon: Heart, value: money(totalDonors), label: totalDonors === 1 ? "Generous donor" : "Generous donors" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Scroll progress bar */}
      <motion.div style={{ scaleX: progressX }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent" />

      {/* ── HERO — parallax bg + scroll-reactive content ──────────────── */}
      <div ref={heroRef} data-hero className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden py-36 lg:py-44">
        <motion.div style={{ y: heroBgY, scale: heroScale }} className="absolute -inset-y-[16%] inset-x-0 will-change-transform">
          <img
            src={hero.image ?? "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80"}
            alt=""
            className="h-full w-full object-cover"
          />
          <HeroOverlay />
        </motion.div>
        <motion.div style={{ y: heroContentY, opacity: heroContentOpacity }} className="relative z-10 px-6 text-center">
          {contentLoading ? (
            <div className="mx-auto flex flex-col items-center gap-4">
              <div className="h-11 w-72 max-w-[80vw] animate-pulse bg-white/20 md:h-14 md:w-[28rem]" />
              <div className="h-4 w-80 max-w-[90vw] animate-pulse bg-white/15" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={hero.title ?? "Our Programs"}>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="font-heading text-4xl font-bold text-[#F5EDE0] md:text-5xl lg:text-6xl"
                >
                  {hero.title ?? "Support a cause you care about"}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="mx-auto mt-4 max-w-2xl font-body text-[#EDE4D3]/70"
                >
                  {hero.subtitle ?? "Every contribution makes a difference. Browse our programs and help us reach our goals."}
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
              onClick={scrollToGrid}
              whileHover={{ y: -3 }}
              className="inline-flex items-center gap-2 rounded-token-btn bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-accent-light"
            >
              Browse programs
              <motion.span animate={reduce ? {} : { y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
                <ArrowDown className="h-4 w-4" />
              </motion.span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* ── IMPACT STATS ──────────────────────────────────────────────── */}
      {!loading && programs.length > 0 && (
        <section className="mx-auto -mt-8 max-w-5xl px-6">
          <motion.div {...reveal()} className="relative z-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-4 rounded-token border border-gray-100 bg-white p-5 shadow-sm">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-heading text-xl font-bold leading-none text-primary">{s.value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </section>
      )}

      {/* ── PROGRAMS GRID ─────────────────────────────────────────────── */}
      <section ref={gridRef} className="scroll-mt-24 px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...reveal()} className="mb-10 text-center">
            <Eyebrow icon={Sparkles}>{intro.eyebrow ?? "Our programs"}</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary">{intro.heading ?? "Choose where your gift goes"}</h2>
            <p className="mt-2 text-text-muted">{intro.subtitle ?? "Browse our active campaigns and back the cause closest to your heart."}</p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-token border border-gray-100 bg-white shadow-sm">
                  <div className="h-44 animate-pulse bg-gray-100" />
                  <div className="space-y-3 p-6">
                    <div className="h-5 w-2/3 animate-pulse bg-gray-100" />
                    <div className="h-4 w-full animate-pulse bg-gray-100" />
                    <div className="h-2 w-full animate-pulse bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : programs.length === 0 ? (
            <div className="rounded-token border border-gray-100 bg-white px-6 py-20 text-center shadow-sm">
              <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-xl bg-accent/10 text-accent">
                <Target className="h-8 w-8" />
              </span>
              <p className="font-heading text-lg font-semibold text-primary">No active programs right now</p>
              <p className="mt-1 text-sm text-text-muted">Check back soon for new campaigns and causes to support.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {programs.map((program, i) => (
                <ProgramCard key={program._id} program={program} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <NewsletterSection />
    </motion.div>
  );
}
