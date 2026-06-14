import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import {
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  ArrowRight,
  ArrowDown,
  Ticket,
  Users,
  Star,
  Sparkles,
  Tag,
} from "lucide-react";
import axiosInstance from "../../services/axios";
import NewsletterSection from "../Home/Newsletter/newsletter";
import HeroOverlay from "../../components/HeroOverlay";
import usePageContent from "../../hooks/usePageContent";
import { cn } from "../../utils/cn";
import {
  EVENT_TYPE_LABELS,
  IMG_FALLBACK,
  D,
  fmtDateRange,
  typeLabel,
  locationOf,
  timeOf,
  priceLabel,
  plainPreview,
  monthKeyOf,
} from "./eventHelpers";

/* ── motion vocabulary (Hope / Contact / Programs) ────────────────────── */
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

function MetaRow({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <Icon className="h-4 w-4 shrink-0 text-accent" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function Badge({ tone = "muted", children }) {
  const tones = {
    muted: "bg-gray-100 text-gray-600",
    accent: "bg-accent/10 text-accent",
    danger: "bg-red-50 text-red-600",
    success: "bg-emerald-50 text-emerald-600",
  };
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold", tones[tone])}>{children}</span>;
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "border-accent bg-accent text-white" : "border-gray-200 bg-white text-text-muted hover:border-accent/50 hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

/* ── Event card (equal-height; whole card links to the detail page) ───── */
function EventCard({ event, index, past }) {
  const reduce = useReducedMotion();
  const cap = event.capacity;
  const full = event.isFull;
  const spots = event.spotsLeft;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (index % 3) * 0.08 }}
      whileHover={reduce ? {} : { y: -6 }}
      className="h-full"
    >
      <Link
        to={`/events/${event._id}`}
        state={{ event }}
        className="group relative flex h-full flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
      >
        {/* Image + overlays */}
        <div className="relative h-44 overflow-hidden bg-gray-100">
          <img
            src={event.imageUrl || IMG_FALLBACK}
            alt={event.title}
            loading="lazy"
            onError={(e) => { e.target.onerror = null; e.target.src = IMG_FALLBACK; }}
            className={cn("h-full w-full object-cover transition-transform duration-500 group-hover:scale-105", past && "grayscale-[35%]")}
          />
          <div className="absolute left-3 top-3 grid place-items-center bg-white/90 px-2.5 py-1 text-center leading-none backdrop-blur-sm">
            <span className="font-heading text-base font-bold text-primary">{new Date(event.date).getDate()}</span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-muted">{D(event.date, { month: "short" })}</span>
          </div>
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <span className="bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">{typeLabel(event)}</span>
            {event.featured && (
              <span className="inline-flex items-center gap-1 bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-accent backdrop-blur-sm">
                <Star className="h-3 w-3" /> Featured
              </span>
            )}
          </div>
          {past && <span className="absolute bottom-3 left-3 bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">Past event</span>}
          {event.status === "cancelled" && <span className="absolute bottom-3 left-3 bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">Cancelled</span>}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-heading text-lg font-bold text-primary transition-colors group-hover:text-accent">{event.title}</h3>

          <div className="mt-3 space-y-1.5">
            <MetaRow icon={Calendar}>{fmtDateRange(event.date, event.endDate)}</MetaRow>
            <MetaRow icon={Clock}>{timeOf(event)}</MetaRow>
            <MetaRow icon={MapPin}>{locationOf(event)}</MetaRow>
          </div>

          <p className="mt-3 line-clamp-2 flex-1 text-sm text-text-muted">{plainPreview(event.description)}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge tone={event.isPaid ? "muted" : "success"}>{event.isPaid ? <><Ticket className="h-3 w-3" /> {priceLabel(event)}</> : "Free"}</Badge>
            {!past && cap != null && (full ? <Badge tone="danger">Sold out</Badge> : spots != null && <Badge tone="muted"><Users className="h-3 w-3" /> {spots} left</Badge>)}
            {!past && event.registrationOpenNow && <Badge tone="accent">RSVP open</Badge>}
            {!past && event.registrationMode === "external" && event.registrationLink && <Badge tone="accent">Tickets</Badge>}
          </div>

          <span className="mt-4 flex w-full items-center justify-center gap-2 border border-gray-200 py-2.5 text-sm font-semibold text-primary transition-colors group-hover:border-accent group-hover:text-accent">
            View details <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
const Events = () => {
  const { content, loading: contentLoading } = usePageContent("events");
  const hero = content?.hero || {};
  const reduce = useReducedMotion();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthKey, setMonthKey] = useState("all");
  const [type, setType] = useState("all");

  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroBgY = useTransform(heroProgress, [0, 1], reduce ? ["0%", "0%"] : ["-12%", "12%"]);
  const heroScale = useTransform(heroProgress, [0, 1], reduce ? [1, 1] : [1, 1.08]);
  const heroContentY = useTransform(heroProgress, [0, 1], reduce ? [0, 0] : [0, -60]);
  const heroContentOpacity = useTransform(heroProgress, [0, 0.85], reduce ? [1, 1] : [1, 0]);
  const gridRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/events");
        setEvents(Array.isArray(res.data) ? res.data : []);
        setError(null);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("We couldn't load events right now. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Split + sort once (memoised).
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up = [];
    const pa = [];
    for (const e of events) {
      const end = e.endDate ? new Date(e.endDate) : new Date(e.date);
      if (e.status === "completed" || e.status === "cancelled" || end < now) pa.push(e);
      else up.push(e);
    }
    up.sort((a, b) => new Date(a.date) - new Date(b.date));
    pa.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { upcoming: up, past: pa };
  }, [events]);

  // Filter options derived from the upcoming events (calendar + type).
  const months = useMemo(() => {
    const m = new Map();
    for (const e of upcoming) {
      const key = monthKeyOf(e.date);
      if (!m.has(key)) m.set(key, D(e.date, { month: "short", year: "numeric" }));
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [upcoming]);

  const types = useMemo(() => [...new Set(upcoming.map((e) => e.eventType))], [upcoming]);

  const filteredUpcoming = useMemo(
    () => upcoming.filter((e) => (type === "all" || e.eventType === type) && (monthKey === "all" || monthKeyOf(e.date) === monthKey)),
    [upcoming, type, monthKey],
  );

  const scrollToGrid = () => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const clearFilters = () => { setMonthKey("all"); setType("all"); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <motion.div style={{ scaleX: progressX }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent" />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div ref={heroRef} className="relative overflow-hidden py-36 lg:py-44">
        <motion.div style={{ y: heroBgY, scale: heroScale }} className="absolute -inset-y-[16%] inset-x-0 will-change-transform">
          <img src={hero.image ?? "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80"} alt="" className="h-full w-full object-cover" />
          <HeroOverlay />
        </motion.div>
        <motion.div style={{ y: heroContentY, opacity: heroContentOpacity }} className="relative z-10 px-6 text-center">
          {contentLoading ? (
            <div className="mx-auto flex flex-col items-center gap-4">
              <div className="h-11 w-52 max-w-[80vw] animate-pulse bg-white/20 md:h-14" />
              <div className="h-4 w-80 max-w-[90vw] animate-pulse bg-white/15" />
            </div>
          ) : (
            <>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="font-heading text-4xl font-bold text-[#F5EDE0] md:text-5xl lg:text-6xl">
                {hero.title ?? "Events"}
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mx-auto mt-4 max-w-2xl font-body text-[#EDE4D3]/70">
                {hero.subtitle ?? "Join us at our upcoming gatherings and be part of the change."}
              </motion.p>
            </>
          )}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mt-8 flex justify-center">
            <motion.button type="button" onClick={scrollToGrid} whileHover={{ y: -3 }} className="inline-flex items-center gap-2 bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-accent-light">
              See what's on
              <motion.span animate={reduce ? {} : { y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
                <ArrowDown className="h-4 w-4" />
              </motion.span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      <section ref={gridRef} className="scroll-mt-24 px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          {/* Upcoming heading */}
          <motion.div {...reveal()} className="mb-6">
            <Eyebrow icon={Sparkles}>Upcoming</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary">Upcoming events</h2>
          </motion.div>

          {/* Calendar + type filters */}
          {!loading && !error && upcoming.length > 0 && (
            <motion.div {...reveal()} className="mb-8 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  <CalendarDays className="h-4 w-4 text-accent" /> Month
                </span>
                <Chip active={monthKey === "all"} onClick={() => setMonthKey("all")}>All dates</Chip>
                {months.map(([key, label]) => (
                  <Chip key={key} active={monthKey === key} onClick={() => setMonthKey(key)}>{label}</Chip>
                ))}
              </div>
              {types.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    <Tag className="h-4 w-4 text-accent" /> Type
                  </span>
                  <Chip active={type === "all"} onClick={() => setType("all")}>All types</Chip>
                  {types.map((t) => (
                    <Chip key={t} active={type === t} onClick={() => setType(t)}>{EVENT_TYPE_LABELS[t] || t}</Chip>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="border border-gray-100 bg-white shadow-sm">
                  <div className="h-44 animate-pulse bg-gray-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-2/3 animate-pulse bg-gray-100" />
                    <div className="h-4 w-full animate-pulse bg-gray-100" />
                    <div className="h-4 w-1/2 animate-pulse bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="border border-red-100 bg-red-50/60 px-6 py-10 text-center text-sm text-red-600">{error}</div>
          ) : upcoming.length === 0 ? (
            <div className="border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
              <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-xl bg-accent/10 text-accent">
                <Calendar className="h-7 w-7" />
              </span>
              <p className="font-heading text-lg font-semibold text-primary">No upcoming events right now</p>
              <p className="mt-1 text-sm text-text-muted">Check back soon — new gatherings are added regularly.</p>
            </div>
          ) : filteredUpcoming.length === 0 ? (
            <div className="border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
              <p className="font-heading text-base font-semibold text-primary">No events match this filter</p>
              <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUpcoming.map((ev, i) => (
                <EventCard key={ev._id} event={ev} index={i} />
              ))}
            </div>
          )}

          {/* Past */}
          {!loading && !error && past.length > 0 && (
            <>
              <motion.div {...reveal()} className="mb-8 mt-16">
                <Eyebrow icon={Clock}>Looking back</Eyebrow>
                <h2 className="mt-3 font-heading text-3xl font-bold text-primary">Past events</h2>
              </motion.div>
              <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((ev, i) => (
                  <EventCard key={ev._id} event={ev} index={i} past />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <NewsletterSection />
    </motion.div>
  );
};

export default Events;
