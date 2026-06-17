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
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  X,
} from "lucide-react";
import axiosInstance from "../../services/axios";
import NewsletterSection from "../Home/Newsletter/newsletter";
import HeroOverlay from "../../components/HeroOverlay";
import usePageContent from "../../hooks/usePageContent";
import { useTenant } from "../../context/TenantContext";
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
  resolveAudience,
  hexToRgba,
  startOfWeek,
  addDays,
  isSameDay,
  weekDays,
  weekRangeLabel,
  eventOnDay,
  matchesQuery,
} from "./eventHelpers";

/* ── motion vocabulary (Hope / Contact / Programs) ────────────────────── */
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
});

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

// A small colour-coded audience tag (uses the tenant's configured colour).
function AudienceTag({ audience, className }) {
  if (!audience) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", className)}
      style={{ color: audience.color, backgroundColor: hexToRgba(audience.color, 0.12) }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: audience.color }} />
      {audience.label}
    </span>
  );
}

/* ── Event card (grid view) ───────────────────────────────────────────── */
function EventCard({ event, index, past, audiences }) {
  const reduce = useReducedMotion();
  const cap = event.capacity;
  const full = event.isFull;
  const spots = event.spotsLeft;
  const audience = resolveAudience(event, audiences);

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
        className="group relative flex h-full flex-col overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
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
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-lg font-bold text-primary transition-colors group-hover:text-accent">{event.title}</h3>
          </div>
          {audience && <div className="mt-2"><AudienceTag audience={audience} /></div>}

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

          <span className="mt-4 flex w-full items-center justify-center gap-2 rounded-token-btn border border-gray-200 py-2.5 text-sm font-semibold text-primary transition-colors group-hover:border-accent group-hover:text-accent">
            View details <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── List row (list view) ─────────────────────────────────────────────── */
function EventRow({ event, audiences, past }) {
  const audience = resolveAudience(event, audiences);
  const d = new Date(event.date);
  return (
    <Link
      to={`/events/${event._id}`}
      state={{ event }}
      className="group flex items-stretch gap-4 rounded-token border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-accent/30 hover:shadow-md sm:p-4"
    >
      {/* Date chip */}
      <div className="flex w-14 shrink-0 flex-col items-center justify-center bg-accent/5 py-2 text-center leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{D(d, { month: "short" })}</span>
        <span className="font-heading text-xl font-bold text-primary">{d.getDate()}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wide text-text-muted">{D(d, { weekday: "short" })}</span>
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-base font-bold text-primary transition-colors group-hover:text-accent">{event.title}</h3>
          {audience && <AudienceTag audience={audience} />}
          {past && <Badge>Past</Badge>}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
          {timeOf(event) && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-accent" /> {timeOf(event)}</span>}
          {locationOf(event) && <span className="inline-flex items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 text-accent" /> {locationOf(event)}</span>}
          <span className="inline-flex items-center gap-1.5"><Ticket className="h-3.5 w-3.5 text-accent" /> {priceLabel(event)}</span>
        </div>
      </div>

      {/* CTA */}
      <span className="hidden shrink-0 items-center self-center text-accent transition-transform group-hover:translate-x-0.5 sm:flex">
        <ArrowRight className="h-5 w-5" />
      </span>
    </Link>
  );
}

/* ── Single event block inside a calendar day ─────────────────────────── */
function CalEvent({ event, audiences, accent }) {
  const audience = resolveAudience(event, audiences);
  const color = audience?.color || accent;
  const cancelled = event.status === "cancelled";
  return (
    <Link
      to={`/events/${event._id}`}
      state={{ event }}
      className="block border-l-[3px] px-2 py-1.5 text-left transition-shadow hover:shadow-md"
      style={{ borderColor: color, backgroundColor: hexToRgba(color, 0.1) }}
    >
      {timeOf(event) && (
        <div className="text-[11px] font-semibold leading-tight" style={{ color }}>
          {timeOf(event)}
        </div>
      )}
      <div className={cn("text-xs font-medium leading-snug text-primary line-clamp-2", cancelled && "line-through opacity-60")}>
        {event.title}
      </div>
      {audience && (
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
          {audience.label}
        </div>
      )}
    </Link>
  );
}

/* ── Week-view calendar ───────────────────────────────────────────────── */
function WeekCalendar({ events, audiences, accent, weekStart, setWeekStart, onJumpToNext }) {
  const today = new Date();
  const days = weekDays(weekStart);
  const eventsByDay = days.map((day) => events.filter((e) => eventOnDay(e, day)));
  const total = events.filter((e) => days.some((day) => eventOnDay(e, day))).length;

  // Legend: only the configured audiences actually present in this week.
  const presentKeys = new Set(
    events
      .filter((e) => days.some((day) => eventOnDay(e, day)))
      .map((e) => e.audience)
      .filter(Boolean),
  );
  const legend = audiences.filter((a) => presentKeys.has(a.key));

  return (
    <div className="overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm">
      {/* Header: navigation + range + today */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label="Previous week"
            className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Next week"
            className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <h3 className="font-heading text-base font-bold text-primary sm:text-lg">{weekRangeLabel(weekStart)}</h3>
        <button
          type="button"
          onClick={() => setWeekStart(startOfWeek(new Date()))}
          className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Today
        </button>
      </div>

      {/* Desktop: 7-column grid */}
      <div className="hidden grid-cols-7 border-b border-gray-100 sm:grid">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="border-r border-gray-100 px-2 py-3 text-center last:border-r-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{DAY_NAMES[(day.getDay() + 6) % 7]}</div>
              <div className={cn(
                "mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-sm font-semibold",
                isToday ? "bg-accent text-white" : "text-primary",
              )}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden min-h-[18rem] grid-cols-7 sm:grid">
        {eventsByDay.map((dayEvents, i) => (
          <div key={days[i].toISOString()} className="space-y-1.5 border-r border-gray-100 p-2 last:border-r-0">
            {dayEvents.map((e) => (
              <CalEvent key={e._id} event={e} audiences={audiences} accent={accent} />
            ))}
          </div>
        ))}
      </div>

      {/* Mobile: agenda — only days that have events */}
      <div className="divide-y divide-gray-100 sm:hidden">
        {eventsByDay.every((d) => d.length === 0) ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <p className="text-sm text-text-muted">No sessions match your filters this week.</p>
            {onJumpToNext && (
              <button onClick={onJumpToNext} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                Jump to the next event <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          days.map((day, i) =>
            eventsByDay[i].length === 0 ? null : (
              <div key={day.toISOString()} className="flex gap-3 p-4">
                <div className="flex w-12 shrink-0 flex-col items-center leading-none">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{DAY_NAMES[(day.getDay() + 6) % 7]}</span>
                  <span className={cn("mt-1 grid h-8 w-8 place-items-center rounded-full text-sm font-bold", isSameDay(day, today) ? "bg-accent text-white" : "text-primary")}>{day.getDate()}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {eventsByDay[i].map((e) => (
                    <CalEvent key={e._id} event={e} audiences={audiences} accent={accent} />
                  ))}
                </div>
              </div>
            ),
          )
        )}
      </div>

      {/* Empty week (desktop) — offer a jump to the next event */}
      {total === 0 && (
        <div className="hidden flex-col items-center gap-3 px-6 py-10 text-center sm:flex">
          <p className="text-sm text-text-muted">No sessions match your filters this week.</p>
          {onJumpToNext && (
            <button onClick={onJumpToNext} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
              Jump to the next event <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Footer: legend + count */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {legend.map((a) => (
            <span key={a.key} className="inline-flex items-center gap-2 text-sm text-text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.color }} />
              {a.label}
            </span>
          ))}
        </div>
        <span className="text-sm font-medium text-text-muted">
          {total} {total === 1 ? "session" : "sessions"} this week
        </span>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
const Events = () => {
  const { content, loading: contentLoading } = usePageContent("events");
  const { organisation, branding } = useTenant();
  const hero = content?.hero || {};
  const intro = content?.intro || {};
  const reduce = useReducedMotion();

  const audiences = organisation?.eventAudiences || [];
  const accent = branding?.accentColor || "#C9A84C";

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters (shared across all views)
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [aud, setAud] = useState("all");
  const [view, setView] = useState("calendar"); // calendar | grid | list
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

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

  // Category options derived from all events (so past weeks filter too).
  const types = useMemo(() => [...new Set(events.map((e) => e.eventType).filter(Boolean))], [events]);

  // Shared predicate for the active filters.
  const passes = useMemo(
    () => (e) =>
      matchesQuery(e, query) &&
      (type === "all" || e.eventType === type) &&
      (aud === "all" || e.audience === aud),
    [query, type, aud],
  );

  const filteredUpcoming = useMemo(() => upcoming.filter(passes), [upcoming, passes]);
  const filteredPast = useMemo(() => past.filter(passes), [past, passes]);
  // Calendar shows every event (incl. past weeks you navigate to).
  const calendarEvents = useMemo(() => events.filter(passes), [events, passes]);

  const hasFilters = query.trim() !== "" || type !== "all" || aud !== "all";
  const clearFilters = () => { setQuery(""); setType("all"); setAud("all"); };

  // For the empty-week CTA: soonest upcoming event after the current week.
  const jumpToNext = () => {
    const next = filteredUpcoming.find((e) => startOfWeek(e.date) >= weekStart) || filteredUpcoming[0];
    if (next) setWeekStart(startOfWeek(next.date));
  };

  const scrollToGrid = () => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const VIEWS = [
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "grid", label: "Grid", icon: LayoutGrid },
    { id: "list", label: "List", icon: ListIcon },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <motion.div style={{ scaleX: progressX }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent" />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div ref={heroRef} data-hero className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden py-36 lg:py-44">
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
            <motion.button type="button" onClick={scrollToGrid} whileHover={{ y: -3 }} className="inline-flex items-center gap-2 rounded-token-btn bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-accent-light">
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
            <Eyebrow icon={Sparkles}>{intro.eyebrow ?? "What's on"}</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary">{intro.heading ?? "Events calendar"}</h2>
          </motion.div>

          {/* Filter bar */}
          {!loading && !error && events.length > 0 && (
            <motion.div {...reveal()} className="mb-8 space-y-4">
              {/* Row 1 — search + category pills + view toggle */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[15rem] flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search events…"
                    className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-11 pr-9 text-sm text-primary outline-none transition-colors focus:border-accent"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Category pills (eventType) */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setType("all")}
                    className={cn(
                      "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                      type === "all" ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-text-muted hover:border-accent/50 hover:text-primary",
                    )}
                  >
                    All events
                  </button>
                  {types.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                        type === t ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-text-muted hover:border-accent/50 hover:text-primary",
                      )}
                    >
                      {EVENT_TYPE_LABELS[t] || t}
                    </button>
                  ))}
                </div>

                {/* View toggle */}
                <div className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white p-1">
                  {VIEWS.map((v) => {
                    const Icon = v.icon;
                    const active = view === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setView(v.id)}
                        aria-pressed={active}
                        title={v.label}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                          active ? "bg-accent text-white" : "text-text-muted hover:text-primary",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{v.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2 — audience segmented filter (only when configured) */}
              {audiences.length > 0 && (
                <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setAud("all")}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                      aud === "all" ? "bg-accent text-white" : "text-text-muted hover:text-primary",
                    )}
                  >
                    All
                  </button>
                  {audiences.map((a) => {
                    const active = aud === a.key;
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => setAud(a.key)}
                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                        style={active ? { backgroundColor: a.color, color: "#fff" } : undefined}
                      >
                        {!active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />}
                        <span className={active ? "" : "text-text-muted"}>{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-token border border-gray-100 bg-white shadow-sm">
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
            <div className="rounded-token border border-red-100 bg-red-50/60 px-6 py-10 text-center text-sm text-red-600">{error}</div>
          ) : events.length === 0 ? (
            <div className="rounded-token border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
              <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-xl bg-accent/10 text-accent">
                <Calendar className="h-7 w-7" />
              </span>
              <p className="font-heading text-lg font-semibold text-primary">No events right now</p>
              <p className="mt-1 text-sm text-text-muted">Check back soon — new gatherings are added regularly.</p>
            </div>
          ) : (
            <>
              {/* CALENDAR */}
              {view === "calendar" && (
                <WeekCalendar
                  events={calendarEvents}
                  audiences={audiences}
                  accent={accent}
                  weekStart={weekStart}
                  setWeekStart={setWeekStart}
                  onJumpToNext={filteredUpcoming.length ? jumpToNext : null}
                />
              )}

              {/* GRID */}
              {view === "grid" && (
                filteredUpcoming.length === 0 ? (
                  <EmptyFilter hasFilters={hasFilters} onClear={clearFilters} />
                ) : (
                  <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredUpcoming.map((ev, i) => (
                      <EventCard key={ev._id} event={ev} index={i} audiences={audiences} />
                    ))}
                  </div>
                )
              )}

              {/* LIST */}
              {view === "list" && (
                filteredUpcoming.length === 0 ? (
                  <EmptyFilter hasFilters={hasFilters} onClear={clearFilters} />
                ) : (
                  <div className="space-y-3">
                    {filteredUpcoming.map((ev) => (
                      <EventRow key={ev._id} event={ev} audiences={audiences} />
                    ))}
                  </div>
                )
              )}

              {/* Past events (grid + list views only) */}
              {view !== "calendar" && filteredPast.length > 0 && (
                <>
                  <motion.div {...reveal()} className="mb-8 mt-16">
                    <Eyebrow icon={Clock}>Looking back</Eyebrow>
                    <h2 className="mt-3 font-heading text-3xl font-bold text-primary">Past events</h2>
                  </motion.div>
                  {view === "grid" ? (
                    <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredPast.map((ev, i) => (
                        <EventCard key={ev._id} event={ev} index={i} audiences={audiences} past />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPast.map((ev) => (
                        <EventRow key={ev._id} event={ev} audiences={audiences} past />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      <NewsletterSection />
    </motion.div>
  );
};

/* ── shared empty state for grid/list filters ─────────────────────────── */
function EmptyFilter({ hasFilters, onClear }) {
  return (
    <div className="rounded-token border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
      <p className="font-heading text-base font-semibold text-primary">
        {hasFilters ? "No events match your filters" : "No upcoming events right now"}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}

export default Events;
