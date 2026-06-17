import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  HeartHandshake,
  Megaphone,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import programService from "../../services/program.service";
import { TabLoader } from "../../components/TabLoader";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";
const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—";

const STATUS_STYLE = {
  published: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  completed: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  hidden: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

const isCompleted = (p) =>
  p.status === "completed" || (p.goalAmount > 0 && p.raisedAmount >= p.goalAmount);

// Module-level opener wired by the page so the timeline thumbnails can pop the
// shared lightbox without threading a handler through every card.
let _openLightbox = () => {};

/* ── Integrated header stat (matches My Payments / Subscriptions) ──────── */
function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading text-lg font-bold leading-none text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function ImageThumb({ images, index }) {
  return (
    <button onClick={() => _openLightbox(images, index)} className="focus:outline-none">
      <img
        src={images[index]}
        alt=""
        className="h-20 w-20 cursor-zoom-in border border-gray-200 object-cover transition-all hover:ring-2 hover:ring-accent/40"
      />
    </button>
  );
}

/* ── One program card ─────────────────────────────────────────────────── */
function ProgramCard({ program, index, expanded, onToggle, onRequest }) {
  const pct =
    program.goalAmount > 0
      ? Math.min(100, Math.round((program.raisedAmount / program.goalAmount) * 100))
      : 0;
  const updates = program.followUpUpdates || [];
  const cover = program.images?.[program.coverImageIndex || 0];
  const done = isCompleted(program);
  const badgeKey = done ? "completed" : program.status;

  return (
    <motion.article
      className="overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(index * 0.03, 0.3) }}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Media */}
        <Link
          to={`/programs/${program._id}`}
          state={{ program }}
          className="relative block h-44 shrink-0 overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5 lg:h-auto lg:w-72"
        >
          {cover ? (
            <img
              src={cover.url}
              alt={program.title}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-accent/40">
              <Target className="h-10 w-10" />
            </span>
          )}
          <span
            className={cn(
              "absolute left-3 top-3 px-2.5 py-1 text-[11px] font-semibold capitalize",
              STATUS_STYLE[badgeKey] || STATUS_STYLE.hidden,
            )}
          >
            {done ? "Completed" : program.status}
          </span>
        </Link>

        {/* Body */}
        <div className="flex flex-1 flex-col p-6">
          <div className="min-w-0">
            <Link
              to={`/programs/${program._id}`}
              state={{ program }}
              className="font-heading text-lg font-bold text-primary transition-colors hover:text-accent"
            >
              {program.title}
            </Link>
            {program.description && (
              <p className="mt-1 text-sm leading-relaxed text-text-muted line-clamp-2">
                {program.description}
              </p>
            )}
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-end justify-between text-sm">
              <span className="font-heading text-lg font-bold text-primary">
                {money(program.raisedAmount)}
                <span className="ml-1 text-xs font-normal text-text-muted">raised</span>
              </span>
              {program.goalAmount > 0 && (
                <span className="text-xs text-text-muted">
                  of {money(program.goalAmount)} · <span className="font-semibold text-accent">{pct}%</span>
                </span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  done ? "bg-emerald-500" : "bg-gradient-to-r from-accent to-accent-light",
                )}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            {updates.length > 0 && (
              <button
                onClick={onToggle}
                className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
              >
                <Megaphone className="h-3.5 w-3.5" />
                {updates.length} update{updates.length !== 1 ? "s" : ""}
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}

            {program.status === "published" && !done && (
              <button
                onClick={() => onRequest(program)}
                disabled={program.hasPendingRequest}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors",
                  program.hasPendingRequest
                    ? "cursor-not-allowed bg-gray-100 text-text-muted"
                    : "bg-accent/10 text-accent hover:bg-accent/20",
                )}
              >
                {program.hasPendingRequest ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Request sent
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-3.5 w-3.5" /> Request follow-up
                  </>
                )}
              </button>
            )}

            <Link
              to={`/programs/${program._id}`}
              state={{ program }}
              className="group ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80"
            >
              View program
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Expandable updates timeline (full width, below both columns) */}
      <AnimatePresence initial={false}>
        {expanded && updates.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="bg-gray-50/60 p-6">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                Follow-up updates
              </p>
              <ol className="relative space-y-5 border-l-2 border-accent/20 pl-5">
                {[...updates]
                  .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
                  .map((update, j) => (
                    <li key={j} className="relative">
                      <span className="absolute -left-[27px] top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-accent ring-4 ring-gray-50" />
                      <p className="text-sm leading-relaxed text-primary">{update.text}</p>
                      {update.images?.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {update.images.map((img, k) => (
                            <ImageThumb key={k} images={update.images} index={k} />
                          ))}
                        </div>
                      )}
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(update.sentAt)}
                      </p>
                    </li>
                  ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default function MyPrograms() {
  const cached = programService.getMyDonatedCached();
  const [programs, setPrograms] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("active");
  const [expanded, setExpanded] = useState(null);
  const [requestModal, setRequestModal] = useState(null);
  const [requestMsg, setRequestMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { images: [], index: 0 }

  // wire the module-level opener used by ImageThumb
  _openLightbox = (images, index) => setLightbox({ images, index });

  const fetchPrograms = async ({ force = false } = {}) => {
    try {
      const data = await programService.myDonatedCached({ force });
      setPrograms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch my programs:", err);
      toast.error("Failed to load your programs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrograms({ force: true });
  }, []);

  const refresh = () => {
    setRefreshing(true);
    fetchPrograms({ force: true }).then(() => toast.success("Refreshed"));
  };

  const handleRequestFollowUp = async () => {
    setSubmitting(true);
    try {
      await programService.requestFollowUp(requestModal._id, { message: requestMsg });
      toast.success("Follow-up request sent");
      setRequestModal(null);
      setRequestMsg("");
      fetchPrograms({ force: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  };

  const { active, completed, stats } = useMemo(() => {
    const active = [];
    const completed = [];
    let updatesCount = 0;
    let raisedTotal = 0;
    for (const p of programs) {
      updatesCount += p.followUpUpdates?.length || 0;
      raisedTotal += p.raisedAmount || 0;
      (isCompleted(p) ? completed : active).push(p);
    }
    return {
      active,
      completed,
      stats: { supported: programs.length, updatesCount, raisedTotal },
    };
  }, [programs]);

  const list = tab === "completed" ? completed : active;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading programs…" />
      </div>
    );
  }

  const TABS = [
    { id: "active", label: "Active", count: active.length },
    { id: "completed", label: "Completed", count: completed.length },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header card with gradient band + integrated stats (My Payments style) */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Your impact</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-white">My Programs</h1>
            <p className="mt-1 text-sm text-white/80">The causes you've supported — track their progress and follow-up updates.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
            </button>
            <Link
              to="/programs"
              className="inline-flex items-center gap-1.5 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Browse all <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <HeaderStat icon={HeartHandshake} label="Programs supported" value={stats.supported} />
          <HeaderStat icon={Megaphone} label="Updates received" value={stats.updatesCount} />
          <HeaderStat icon={TrendingUp} label="Raised across them" value={money(stats.raisedTotal)} />
        </div>
      </div>

      {programs.length === 0 ? (
        <motion.div
          className="border border-gray-100 bg-white p-12 text-center shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent">
            <Target className="h-8 w-8" />
          </span>
          <p className="mb-1 font-semibold text-primary">No programs yet</p>
          <p className="mb-5 text-sm text-text-muted">Donate to a program and track its progress here.</p>
          <Link
            to="/programs"
            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
          >
            Browse Programs <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Active / Completed pills */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const activeTab = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative isolate inline-flex items-center gap-1.5 border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
                    activeTab
                      ? "border-accent text-accent"
                      : "border-gray-200 bg-white text-text-muted hover:border-accent/40 hover:text-primary",
                  )}
                >
                  {activeTab && (
                    <motion.span
                      layoutId="programsTabActive"
                      className="absolute inset-0 -z-10 bg-accent/10"
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    />
                  )}
                  {t.label}
                  <span className={cn("text-xs", activeTab ? "text-accent/70" : "text-gray-400")}>{t.count}</span>
                </button>
              );
            })}
          </div>

          {/* List */}
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
          {list.length === 0 ? (
            <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
                {tab === "completed" ? <CheckCircle2 className="h-6 w-6" /> : <Target className="h-6 w-6" />}
              </span>
              <p className="font-semibold text-gray-800">
                {tab === "completed" ? "No completed programs yet" : "No active programs"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
                {tab === "completed"
                  ? "Programs that reach their goal or are marked complete will appear here."
                  : "Programs you're currently supporting will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {list.map((program, i) => (
                <ProgramCard
                  key={program._id}
                  program={program}
                  index={i}
                  expanded={expanded === program._id}
                  onToggle={() => setExpanded(expanded === program._id ? null : program._id)}
                  onRequest={(p) => {
                    setRequestModal(p);
                    setRequestMsg("");
                  }}
                />
              ))}
            </div>
          )}
          </motion.div>
        </>
      )}

      {/* Image Lightbox — portaled to body to escape overflow clipping */}
      {createPortal(
        <AnimatePresence>
          {lightbox && (
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/85" onClick={() => setLightbox(null)} />
              <button
                onClick={() => setLightbox(null)}
                className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
              {lightbox.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setLightbox((l) => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length }))
                    }
                    className="absolute left-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setLightbox((l) => ({ ...l, index: (l.index + 1) % l.images.length }))}
                    className="absolute right-16 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
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
        </AnimatePresence>,
        document.body,
      )}

      {/* Request Follow-Up Modal (straight-edged, matches portal) */}
      <AnimatePresence>
        {requestModal && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRequestModal(null)} />
            <motion.div
              className="relative w-full max-w-md border border-gray-100 bg-white p-6 shadow-2xl"
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading text-lg font-bold text-gray-900">Request a follow-up</h3>
                  <p className="mt-0.5 truncate text-sm text-text-muted">{requestModal.title}</p>
                </div>
              </div>
              <textarea
                value={requestMsg}
                onChange={(e) => setRequestMsg(e.target.value)}
                className="w-full resize-none border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
                rows={3}
                placeholder="Optional message to the team…"
              />
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setRequestModal(null)}
                  className="border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestFollowUp}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : null} Send request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
