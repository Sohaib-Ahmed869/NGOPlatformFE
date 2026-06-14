import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  Tag,
  ExternalLink,
  Mail,
  Phone,
  Paperclip,
  CheckCircle2,
  Star,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import axiosInstance from "../../services/axios";
import NewsletterSection from "../Home/Newsletter/newsletter";
import HeroOverlay from "../../components/HeroOverlay";
import { cn } from "../../utils/cn";
import {
  IMG_FALLBACK,
  fmtDateRange,
  typeLabel,
  fullLocationOf,
  timeOf,
  processDescription,
  processHeadings,
} from "./eventHelpers";

const HERO_FALLBACK_BG = "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-primary-light, #4A3C2A))";

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
});

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <p className="text-sm text-primary">{value}</p>
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  // Event handed over via router state from the listing → instant render, no
  // network round-trip. Falls back to fetching on direct access / refresh.
  const passedEvent = location.state?.event?._id === id ? location.state.event : null;
  const [event, setEvent] = useState(passedEvent);
  const [loading, setLoading] = useState(!passedEvent);

  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroBgY = useTransform(heroProgress, [0, 1], reduce ? ["0%", "0%"] : ["-12%", "12%"]);
  const heroScale = useTransform(heroProgress, [0, 1], reduce ? [1, 1] : [1, 1.08]);
  const heroContentY = useTransform(heroProgress, [0, 1], reduce ? [0, 0] : [0, -60]);
  const heroContentOpacity = useTransform(heroProgress, [0, 0.85], reduce ? [1, 1] : [1, 0]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (passedEvent) return;
    let active = true;
    const fetchEvent = async () => {
      try {
        const res = await axiosInstance.get(`/events/${id}`);
        if (active) setEvent(res.data);
      } catch {
        console.error("Failed to fetch event");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchEvent();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const coverUrl = event?.imageUrl || "";
  const isPast = event && (event.status === "completed" || event.status === "cancelled" || new Date(event.endDate || event.date) < new Date());
  const canExternal = event?.registrationMode === "external" && event?.registrationLink;
  const internal = event?.registrationMode === "internal";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <motion.div style={{ scaleX: progressX }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent" />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div ref={heroRef} className="relative overflow-hidden py-32 lg:py-40">
        {coverUrl ? (
          <motion.div style={{ y: heroBgY, scale: heroScale }} className="absolute -inset-y-[16%] inset-x-0 will-change-transform">
            <img src={coverUrl} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = IMG_FALLBACK; }} />
            <HeroOverlay />
          </motion.div>
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: HERO_FALLBACK_BG }} />
            <div className="absolute inset-0 bg-black/30" />
          </>
        )}

        <motion.div style={{ y: heroContentY, opacity: heroContentOpacity }} className="relative z-10 mx-auto max-w-5xl px-6">
          <Link to="/events" className="group mb-6 flex w-fit items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Events
          </Link>

          {loading ? (
            <div className="space-y-4">
              <div className="h-6 w-28 animate-pulse bg-white/20" />
              <div className="h-12 w-3/4 max-w-2xl animate-pulse bg-white/20" />
              <div className="h-4 w-72 animate-pulse bg-white/15" />
            </div>
          ) : !event ? (
            <div>
              <h1 className="font-heading text-4xl font-bold text-warm-cream md:text-5xl">Event not found</h1>
              <p className="mt-3 font-body text-warm-beige/70">This event may have been removed or is no longer available.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-accent px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">{typeLabel(event)}</span>
                {event.featured && (
                  <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                    <Star className="h-3 w-3" /> Featured
                  </span>
                )}
                {event.status === "cancelled" && <span className="bg-red-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">Cancelled</span>}
                {isPast && event.status !== "cancelled" && <span className="bg-black/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">Past event</span>}
              </div>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-4 max-w-3xl font-heading text-3xl font-bold leading-tight text-warm-cream md:text-5xl"
              >
                {event.title}
              </motion.h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-warm-beige/80">
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {fmtDateRange(event.date, event.endDate)}</span>
                {timeOf(event) && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {timeOf(event)}</span>}
                {fullLocationOf(event) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {fullLocationOf(event)}</span>}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      {!loading && event && (
        <section className="bg-background px-6 py-16 lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-5">
            {/* Left — about + attachments */}
            <div className="space-y-10 lg:col-span-3">
              <motion.div {...reveal()}>
                <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                  <Sparkles className="h-3.5 w-3.5" /> About this event
                </span>
                {event.description ? (
                  <div className="prose prose-sm mt-4 w-full max-w-full text-gray-700">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        h1: (p) => <h1 className="my-3 font-bold" {...p} />,
                        h2: (p) => <h2 className="my-2 font-bold" {...p} />,
                        h3: (p) => <h3 className="my-2 font-bold" {...p} />,
                        p: (p) => <p className="my-2" {...p} />,
                        ul: (p) => <ul className="my-2 list-disc pl-5" {...p} />,
                        ol: (p) => <ol className="my-2 list-decimal pl-5" {...p} />,
                      }}
                    >
                      {processHeadings(processDescription(event.description))}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-text-muted">More details coming soon.</p>
                )}
              </motion.div>

              {event.attachments?.length > 0 && (
                <motion.div {...reveal()}>
                  <div className="mb-4 flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-accent" />
                    <h2 className="font-heading text-lg font-bold text-primary">Attachments</h2>
                  </div>
                  <div className="space-y-2">
                    {event.attachments.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-gray-100 bg-white p-3 text-sm text-text-muted shadow-sm transition-colors hover:border-accent/40 hover:text-accent">
                        <Paperclip className="h-4 w-4 shrink-0 text-accent" /> {a.name || "Download attachment"}
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right — sticky registration card */}
            <motion.div {...reveal(0.1)} className="lg:col-span-2">
              <div className="lg:sticky lg:top-24">
                <div className="border border-gray-100 bg-white shadow-sm">
                  {/* Fee */}
                  <div className="border-b border-gray-100 p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{event.isPaid ? "Entry fee" : "Entry"}</p>
                    <p className="mt-1 flex items-baseline gap-2 font-heading text-3xl font-bold text-primary">
                      {event.isPaid ? `$${event.price}` : "Free"}
                      {event.isPaid && <span className="text-sm font-normal text-text-muted">{event.currency || "AUD"} / person</span>}
                    </p>
                    {event.isPaid && (
                      <p className="mt-1.5 text-xs text-text-muted">
                        {canExternal ? "Payable when you register via the organiser." : "Payable at the event."}
                      </p>
                    )}
                  </div>

                  {/* Quick facts */}
                  <div className="space-y-3 border-b border-gray-100 p-6">
                    <InfoRow icon={Calendar} label="Date" value={fmtDateRange(event.date, event.endDate)} />
                    <InfoRow icon={Clock} label="Time" value={[timeOf(event), event.timezone].filter(Boolean).join(" · ")} />
                    <InfoRow icon={MapPin} label="Location" value={fullLocationOf(event)} />
                    <InfoRow icon={Tag} label="Type" value={typeLabel(event)} />
                    <InfoRow
                      icon={Users}
                      label="Capacity"
                      value={event.capacity == null ? "Unlimited" : event.isFull ? "Sold out" : `${event.spotsLeft} of ${event.capacity} spots left`}
                    />
                  </div>

                  {/* Registration */}
                  <div className="p-6">
                    {isPast ? (
                      <div className="flex items-center gap-2.5 text-sm text-text-muted">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-gray-400" /> This event has already taken place.
                      </div>
                    ) : canExternal ? (
                      <a
                        href={event.registrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 bg-accent py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
                      >
                        Register now <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : internal ? (
                      <div className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className={cn("h-5 w-5 shrink-0", event.registrationOpenNow ? "text-emerald-500" : "text-gray-400")} />
                        <span className="text-primary">
                          {event.registrationOpenNow
                            ? `Registration is open${event.spotsLeft != null ? ` · ${event.spotsLeft} spots left` : ""}.`
                            : event.isFull
                            ? "This event is fully booked."
                            : "Registration is currently closed."}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">This is an info-only event — no registration required.</p>
                    )}

                    {(event.contactEmail || event.contactPhone) && (
                      <div className="mt-5 space-y-2 border-t border-gray-100 pt-5 text-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Questions? Get in touch</p>
                        {event.contactEmail && (
                          <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-2 text-text-muted transition-colors hover:text-accent">
                            <Mail className="h-4 w-4 shrink-0 text-accent" /> {event.contactEmail}
                          </a>
                        )}
                        {event.contactPhone && (
                          <a href={`tel:${event.contactPhone}`} className="flex items-center gap-2 text-text-muted transition-colors hover:text-accent">
                            <Phone className="h-4 w-4 shrink-0 text-accent" /> {event.contactPhone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Link to="/events" className="mt-4 flex w-full items-center justify-center gap-2 border border-gray-200 bg-white py-2.5 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent">
                  <ArrowLeft className="h-4 w-4" /> All events
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {!loading && event && <NewsletterSection />}
    </motion.div>
  );
}
