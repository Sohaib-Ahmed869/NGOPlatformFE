import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  Mail,
  Phone,
  Download,
  Search,
  Check,
  Trash2,
  ChevronDown,
  ChevronRight,
  Star,
  Loader2,
  Tag,
  Hash,
  ListChecks,
  DollarSign,
  ExternalLink,
  CheckCircle2,
  CalendarClock,
  AlertCircle,
  FileText,
  LayoutGrid,
  X,
} from "lucide-react";
import eventsService from "../../../services/events.service";
import { TabLoader } from "../../../components/TabLoader";
import { CustomSelect } from "../../../components/CustomSelect";
import { cn } from "../../../utils/cn";
import {
  STATUS_BADGE,
  STATUS_LABELS,
  eventTypeDisplay,
  QUESTION_TYPES,
  REGISTRATION_MODES,
} from "./eventConstants";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const QTYPE_LABEL = QUESTION_TYPES.reduce((a, t) => ((a[t.value] = t.label), a), {});
const modeLabel = (m) => REGISTRATION_MODES.find((x) => x.value === m)?.label || "No registration";
const ACCENT_GRADIENT = "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";

const RSVP_BADGE = {
  registered: "bg-green-100 text-green-700",
  waitlisted: "bg-amber-100 text-amber-700",
  cancelled: "bg-gray-100 text-gray-500",
};

/* ── overview building blocks ── */
function Card({ icon: Icon, title, children, className }) {
  return (
    <div className={cn("border border-gray-100 bg-white p-5 shadow-sm", className)}>
      <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-semibold text-primary">
        {Icon ? <Icon className="h-4 w-4 text-accent" /> : null}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = "accent" }) {
  const tones = {
    accent: "bg-accent/10 text-accent",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    gray: "bg-gray-100 text-gray-500",
  };
  return (
    <div className="flex items-center gap-3 border border-gray-100 bg-white p-3.5 shadow-sm">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", tones[tone])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-primary">{value}</p>
        <p className="mt-0.5 text-[11px] text-text-muted">{label}</p>
      </div>
    </div>
  );
}

const Bool = ({ on, yes = "Yes", no = "No" }) => (
  <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", on ? "text-green-600" : "text-text-muted")}>
    {on ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-300" />}
    {on ? yes : no}
  </span>
);

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <div className="text-sm font-medium text-primary">{children}</div>
      </div>
    </div>
  );
}

/* ── a single registration row (expandable for custom answers) ── */
function RegistrationRow({ reg, questions, onToggleAttended, onDelete, busy }) {
  const [open, setOpen] = useState(false);
  const hasAnswers = questions.length > 0 && reg.answers && Object.keys(reg.answers).length > 0;
  const display = (val) => (Array.isArray(val) ? val.join(", ") : String(val ?? "—"));

  return (
    <div className="border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50/60">
        <button
          type="button"
          onClick={() => hasAnswers && setOpen((v) => !v)}
          className={cn("grid h-6 w-6 shrink-0 place-items-center text-gray-300", hasAnswers ? "hover:text-primary" : "cursor-default opacity-0")}
          title={hasAnswers ? "Show answers" : ""}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-primary">
            {reg.name}
            {reg.numberOfGuests > 0 && <span className="ml-1.5 text-xs font-normal text-text-muted">+{reg.numberOfGuests}</span>}
            {reg.source === "volunteer" && (
              <span className="ml-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent" title="Came from a volunteer assignment">
                Volunteer
              </span>
            )}
          </p>
          <p className="truncate text-xs text-text-muted">
            {reg.email}
            {reg.phone ? ` · ${reg.phone}` : ""}
          </p>
        </div>

        <span className={cn("hidden shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full sm:inline", RSVP_BADGE[reg.rsvpStatus] || "bg-gray-100 text-gray-500")}>
          {reg.rsvpStatus}
        </span>

        <button
          type="button"
          onClick={() => onToggleAttended(reg)}
          disabled={busy}
          title={reg.attended ? "Mark as not attended" : "Mark as attended"}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            reg.attended ? "bg-green-100 text-green-700 hover:bg-green-200" : "border border-gray-200 text-text-muted hover:bg-gray-100"
          )}
        >
          <Check className="h-3.5 w-3.5" /> {reg.attended ? "Attended" : "Check in"}
        </button>

        <button type="button" onClick={() => onDelete(reg)} disabled={busy} title="Remove" className="grid h-7 w-7 shrink-0 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && hasAnswers && (
        <div className="bg-gray-50/70 px-12 py-3">
          <dl className="grid gap-2 sm:grid-cols-2">
            {questions.map((q) =>
              reg.answers[q.key] !== undefined ? (
                <div key={q.key}>
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-text-muted">{q.label}</dt>
                  <dd className="text-sm text-primary">{display(reg.answers[q.key])}</dd>
                </div>
              ) : null
            )}
          </dl>
          {reg.notes ? <p className="mt-2 text-xs text-text-muted">Note: {reg.notes}</p> : null}
        </div>
      )}
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const preset = location.state?.event || null;
  const [event, setEvent] = useState(preset);
  const [loading, setLoading] = useState(!preset);
  const [tab, setTab] = useState("overview");

  // registrations state
  const [regs, setRegs] = useState([]);
  const [regEvent, setRegEvent] = useState(null); // {capacity, registrationCount, registrationQuestions}
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [search, setSearch] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState("all");
  const [attendedFilter, setAttendedFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const isInternal = event?.registrationMode === "internal";

  useEffect(() => {
    if (!preset) fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const ev = await eventsService.getById(id);
      setEvent(ev);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load event");
      navigate("/admin/events");
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async () => {
    try {
      setLoadingRegs(true);
      const data = await eventsService.listRegistrations(id, {
        rsvpStatus: rsvpFilter,
        attended: attendedFilter,
        search,
      });
      setRegs(data.registrations || []);
      setRegEvent(data.event || null);
    } catch {
      toast.error("Failed to load registrations");
    } finally {
      setLoadingRegs(false);
    }
  };

  // (Re)load registrations when the tab opens or filters change.
  useEffect(() => {
    if (tab === "registrations" && isInternal) loadRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, rsvpFilter, attendedFilter, search]);

  const questions = regEvent?.registrationQuestions || event?.registrationQuestions || [];

  const toggleAttended = async (reg) => {
    setBusyId(reg._id);
    try {
      const res = await eventsService.updateRegistration(id, reg._id, { attended: !reg.attended });
      setRegs((prev) => prev.map((r) => (r._id === reg._id ? res.registration : r)));
    } catch {
      toast.error("Failed to update");
    } finally {
      setBusyId(null);
    }
  };

  const deleteReg = async (reg) => {
    setBusyId(reg._id);
    try {
      await eventsService.removeRegistration(id, reg._id);
      setRegs((prev) => prev.filter((r) => r._id !== reg._id));
      setRegEvent((p) => (p ? { ...p, registrationCount: Math.max(0, (p.registrationCount || 1) - 1) } : p));
      toast.success("Registration removed");
    } catch {
      toast.error("Failed to remove");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await eventsService.exportRegistrations(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrations-${event?.title || id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const count = regEvent?.registrationCount ?? event?.registrationCount ?? 0;
  const capacity = regEvent?.capacity ?? event?.capacity;
  const spotsLeft = capacity != null ? Math.max(0, capacity - count) : null;
  const isFull = capacity != null && count >= capacity;
  const deadlinePassed = !!event?.registrationDeadline && new Date() > new Date(event.registrationDeadline);
  const regOpen = event?.isRegistrationOpen !== false;
  const hasRegFilters = search.trim() !== "" || rsvpFilter !== "all" || attendedFilter !== "all";
  const clearRegFilters = () => {
    setSearch("");
    setRsvpFilter("all");
    setAttendedFilter("all");
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading event…" />
      </div>
    );
  }
  if (!event) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    ...(isInternal ? [{ id: "registrations", label: "Registrations", icon: Users, count }] : []),
  ];

  return (
    <div className="w-full space-y-5">
      {/* Back */}
      <Link to="/admin/events" className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      {/* Hero banner */}
      <div className="relative overflow-hidden border border-gray-100 shadow-sm">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: ACCENT_GRADIENT }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />

        <Link
          to={`/admin/events/edit/${event._id}`}
          state={{ event }}
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 bg-white/95 px-3.5 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur transition-colors hover:bg-white"
        >
          <Pencil className="h-4 w-4" /> Edit
        </Link>

        <div className="relative flex min-h-[210px] flex-col justify-end p-5 sm:min-h-[250px] sm:p-7">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_BADGE[event.status])}>{STATUS_LABELS[event.status] || event.status}</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm">{eventTypeDisplay(event)}</span>
            {event.featured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
                <Star className="h-3 w-3 fill-current" /> Featured
              </span>
            ) : null}
          </div>

          <h1 className="text-2xl font-bold text-white drop-shadow-sm sm:text-3xl">{event.title}</h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{fmtDate(event.date)}{event.startTime ? ` · ${event.startTime}` : ""}</span>
            {(event.location?.venue || event.location?.city) && (
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{[event.location?.venue, event.location?.city].filter(Boolean).join(", ")}</span>
            )}
            <span className="inline-flex items-center gap-1.5"><Ticket className="h-4 w-4" />{modeLabel(event.registrationMode)}</span>
            {isInternal && (
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{count}{capacity ? ` / ${capacity}` : ""} registered</span>
            )}
          </div>

          {isInternal && capacity ? (
            <div className="mt-3.5 max-w-sm">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(100, Math.round((count / capacity) * 100))}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-white/75">{count} of {capacity} registered · {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs — minimalist segmented control with a sliding active pill */}
      {tabs.length > 1 && (
        <div className="inline-flex items-center gap-1 border border-gray-100 bg-gray-50 p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn("relative inline-flex items-center px-3.5 py-2 text-sm font-medium transition-colors", active ? "text-primary" : "text-text-muted hover:text-primary")}
              >
                {active && (
                  <motion.span
                    layoutId="evtDetailTab"
                    className="absolute inset-0 bg-white shadow-sm ring-1 ring-gray-100"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-[1] inline-flex items-center gap-1.5">
                  <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-gray-400")} />
                  {t.label}
                  {t.count != null && (
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", active ? "bg-accent/10 text-accent" : "bg-gray-200 text-gray-500")}>{t.count}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Overview */}
      {tab === "overview" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* At-a-glance (internal events have the richest data) */}
          {isInternal && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={Users} label="Registered" value={count} tone="green" />
              <Stat icon={Hash} label={capacity ? "Spots left" : "Capacity"} value={capacity ? spotsLeft : "Unlimited"} tone={isFull ? "amber" : "accent"} />
              <Stat icon={DollarSign} label="Price" value={event.isPaid ? `${event.currency} ${Number(event.price || 0).toFixed(0)}` : "Free"} tone={event.isPaid ? "amber" : "gray"} />
              <Stat icon={ListChecks} label="Questions" value={(event.registrationQuestions || []).length} />
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Schedule */}
            <Card icon={CalendarClock} title="Schedule">
              <div className="space-y-3.5">
                <InfoRow icon={Calendar} label="Starts">{fmtDate(event.date)}{event.startTime ? ` · ${event.startTime}` : ""}</InfoRow>
                <InfoRow icon={Clock} label="Ends">
                  {event.endDate || event.endTime ? `${event.endDate ? fmtDate(event.endDate) : fmtDate(event.date)}${event.endTime ? ` · ${event.endTime}` : ""}` : "—"}
                </InfoRow>
                <InfoRow icon={Clock} label="Timezone">{event.timezone || "—"}</InfoRow>
              </div>
            </Card>

            {/* Location */}
            <Card icon={MapPin} title="Location">
              {event.location?.venue || event.location?.address || event.location?.city ? (
                <div className="space-y-3.5">
                  {event.location?.venue && <InfoRow icon={MapPin} label="Venue">{event.location.venue}</InfoRow>}
                  {event.location?.address && <InfoRow icon={MapPin} label="Address">{event.location.address}</InfoRow>}
                  {event.location?.city && <InfoRow icon={MapPin} label="City">{event.location.city}</InfoRow>}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No location set for this event.</p>
              )}
            </Card>

            {/* Registration */}
            <Card icon={Ticket} title="Registration">
              <div className="space-y-3.5">
                <InfoRow icon={Ticket} label="Mode">{modeLabel(event.registrationMode)}</InfoRow>

                {event.registrationMode === "none" && (
                  <p className="text-sm text-text-muted">This is an information-only event — visitors just see the details.</p>
                )}

                {event.registrationMode === "external" && (
                  <InfoRow icon={ExternalLink} label="Link">
                    {event.registrationLink ? (
                      <a href={event.registrationLink} target="_blank" rel="noreferrer" className="break-all text-accent hover:underline">{event.registrationLink}</a>
                    ) : "—"}
                  </InfoRow>
                )}

                {isInternal && (
                  <>
                    <InfoRow icon={Users} label="Registered">
                      {count}{capacity ? ` / ${capacity}` : ""}
                      {capacity ? <span className="ml-1.5 text-xs font-normal text-text-muted">({spotsLeft} left)</span> : <span className="ml-1.5 text-xs font-normal text-text-muted">(unlimited)</span>}
                    </InfoRow>
                    <InfoRow icon={Hash} label="Capacity">{capacity ? capacity : "Unlimited"}</InfoRow>
                    <InfoRow icon={CheckCircle2} label="Status">
                      {deadlinePassed ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-600"><AlertCircle className="h-4 w-4" /> Deadline passed</span>
                      ) : isFull ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-600"><AlertCircle className="h-4 w-4" /> Full</span>
                      ) : (
                        <Bool on={regOpen} yes="Open" no="Closed" />
                      )}
                    </InfoRow>
                    <InfoRow icon={CalendarClock} label="Deadline">{event.registrationDeadline ? fmtDateTime(event.registrationDeadline) : "None"}</InfoRow>
                    <InfoRow icon={Users} label="Guests allowed">
                      {event.allowGuests ? <span className="text-primary">Yes{event.maxGuestsPerRegistration ? ` · up to ${event.maxGuestsPerRegistration} each` : ""}</span> : <Bool on={false} />}
                    </InfoRow>
                  </>
                )}

                <InfoRow icon={DollarSign} label="Price">
                  {event.isPaid ? <span className="text-primary">{event.currency} {Number(event.price || 0).toFixed(2)}</span> : <span className="text-text-muted">Free</span>}
                </InfoRow>
              </div>
            </Card>

            {/* Details & contact */}
            <Card icon={Tag} title="Details">
              <div className="space-y-3.5">
                <InfoRow icon={Tag} label="Status">
                  <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full", STATUS_BADGE[event.status])}>{STATUS_LABELS[event.status] || event.status}</span>
                </InfoRow>
                <InfoRow icon={Star} label="Featured"><Bool on={!!event.featured} /></InfoRow>
                <InfoRow icon={Mail} label="Contact email">{event.contactEmail || "—"}</InfoRow>
                <InfoRow icon={Phone} label="Contact phone">{event.contactPhone || "—"}</InfoRow>
                {event.createdAt && <InfoRow icon={CalendarClock} label="Created">{fmtDateTime(event.createdAt)}</InfoRow>}
                {event.updatedAt && <InfoRow icon={CalendarClock} label="Last updated">{fmtDateTime(event.updatedAt)}</InfoRow>}
              </div>
            </Card>
          </div>

          {/* Registration questions */}
          {isInternal && questions.length > 0 && (
            <Card icon={ListChecks} title={`Registration questions (${questions.length})`}>
              <div className="space-y-2.5">
                {questions.map((q, i) => (
                  <div key={q.key || i} className="flex items-start gap-3 border border-gray-100 bg-gray-50/60 p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white text-[11px] font-semibold text-gray-400 ring-1 ring-gray-100">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-primary">{q.label}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{QTYPE_LABEL[q.type] || q.type}</span>
                        {q.required && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Required</span>}
                      </div>
                      {(q.options || []).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {q.options.map((o, oi) => (
                            <span key={oi} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-text-muted">{o}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* About */}
          {event.description ? (
            <Card icon={FileText} title="About this event">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{event.description}</p>
            </Card>
          ) : null}
        </motion.div>
      )}

      {/* Registrations */}
      {tab === "registrations" && isInternal && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* toolbar */}
          <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…" className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white" />
            </div>
            <CustomSelect
              value={rsvpFilter}
              onChange={setRsvpFilter}
              options={[
                { value: "all", label: "All RSVPs" },
                { value: "registered", label: "Registered" },
                { value: "waitlisted", label: "Waitlisted" },
                { value: "cancelled", label: "Cancelled" },
              ]}
              triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              className="sm:min-w-[140px]"
            />
            <CustomSelect
              value={attendedFilter}
              onChange={setAttendedFilter}
              options={[
                { value: "all", label: "Any attendance" },
                { value: "true", label: "Attended" },
                { value: "false", label: "Not attended" },
              ]}
              triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              className="sm:min-w-[150px]"
            />
            <button type="button" onClick={exportCsv} disabled={exporting || regs.length === 0} className="inline-flex shrink-0 items-center gap-1.5 border border-gray-200 px-3 py-2 text-sm font-medium text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
            </button>
          </div>

          {/* list */}
          <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
            {loadingRegs && regs.length === 0 ? (
              // Subtle skeleton — only on the very first load (no spinner).
              <div className="divide-y divide-gray-50">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
                      <div className="h-2.5 w-56 max-w-full animate-pulse rounded bg-gray-100" />
                    </div>
                    <div className="h-7 w-20 animate-pulse rounded-lg bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : regs.length === 0 ? (
              // Friendly empty state — distinguishes "none yet" from "no matches".
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-xl bg-accent/10 text-accent">
                  {hasRegFilters ? <Search className="h-7 w-7" /> : <Users className="h-7 w-7" />}
                </div>
                {hasRegFilters ? (
                  <>
                    <p className="text-sm font-semibold text-primary">No matching registrations</p>
                    <p className="mt-1 max-w-xs text-xs text-text-muted">No one matches your current search or filters.</p>
                    <button onClick={clearRegFilters} className="mt-4 inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-accent hover:text-accent">
                      <X className="h-3.5 w-3.5" /> Clear filters
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-primary">No registrations yet</p>
                    <p className="mt-1 max-w-xs text-xs text-text-muted">When people RSVP for this event they'll appear here — ready to check in and export.</p>
                  </>
                )}
              </div>
            ) : (
              <div className={cn("transition-opacity duration-200", loadingRegs && "opacity-50")}>
                {regs.map((reg) => (
                  <RegistrationRow key={reg._id} reg={reg} questions={questions} onToggleAttended={toggleAttended} onDelete={deleteReg} busy={busyId === reg._id} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
