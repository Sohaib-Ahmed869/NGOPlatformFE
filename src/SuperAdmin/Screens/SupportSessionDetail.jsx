import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShieldCheck, Ban, Building2, Clock, UserCog, Activity, LogOut, Pencil,
  Ticket, RefreshCw, Copy, Check, SearchX, Filter, AlertTriangle,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAErrorState from "../components/SAErrorState";
import SALoader from "../SALoader";
import { useConfirm } from "../components/ConfirmProvider";
import { useSARealtime } from "../context/SARealtimeContext";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";
import {
  effectiveStatus, fmt, fmtDay, timeAgo, duration, accessLabel, surfaceLabel, tenantName,
} from "./supportSessionUtils";
import {
  AccessPill, CARD as card, ExpiryCountdown, HEADER_GRADIENT, ImpersonationBlock,
  StatusPill, SurfacePill, surfaceIcon, useServerClock,
} from "./supportSessionShared";

const METHOD = {
  POST: "bg-emerald-50 text-emerald-700",
  PUT: "bg-sky-50 text-sky-700",
  PATCH: "bg-sky-50 text-sky-700",
  DELETE: "bg-red-50 text-red-700",
};
const ACTION_TITLES = {
  "support.session_started": "Session started",
  "support.session_ended": "Session ended",
  "support.session_revoked": "Session revoked",
  "support.sessions_revoked_all": "All sessions revoked",
};
// Per-event icon + colour for the activity timeline.
function actionMeta(action) {
  switch (action) {
    case "support.session_started": return { icon: ShieldCheck, color: "#10b981" };
    case "support.session_ended": return { icon: LogOut, color: "#64748b" };
    case "support.session_revoked":
    case "support.sessions_revoked_all": return { icon: Ban, color: "#ef4444" };
    case "support.action": return { icon: Pencil, color: "#0ea5e9" };
    default: return { icon: Activity, color: "#6366f1" };
  }
}

const EMPTY = { session: null, actions: [], actionTotal: 0, writeTotal: 0, truncated: false, serverTime: null };
const INITIAL = { phase: "loading", refreshing: false, error: null, data: EMPTY };

/**
 * The same shape as the list's reducer, and for the same reason: `loading`,
 * `error` and `data` used to be three independent pieces of state, so a 404
 * rendered as a retryable "something went wrong" (retrying a session that does
 * not exist never succeeds) and every refresh after a revoke blanked the whole
 * page back to the loader.
 */
function reducer(state, action) {
  switch (action.type) {
    case "load":
      return action.silent
        ? { ...state, refreshing: true }
        : { ...INITIAL, phase: "loading" };
    case "ready":
      return { phase: "ready", refreshing: false, error: null, data: action.data };
    case "missing":
      return { ...INITIAL, phase: "missing" };
    case "failed":
      return action.silent
        ? { ...state, refreshing: false }
        : { ...INITIAL, phase: "error", error: action.message };
    case "patchSession":
      return { ...state, data: { ...state.data, session: { ...state.data.session, ...action.changes } } };
    default:
      return state;
  }
}

function SectionTitle({ children }) {
  return <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{children}</p>;
}
function PropRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="shrink-0 text-xs font-medium text-gray-400">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-medium text-gray-800 dark:text-white/85">{children}</span>
    </div>
  );
}

/** Session ids are what you paste into a support ticket, so make them copyable. */
function CopyableId({ value }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      toast.error("Couldn't copy to the clipboard");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={value}
      className="inline-flex max-w-full items-center gap-1.5 font-mono text-[11px] text-gray-500 transition-colors hover:text-gray-800 dark:text-white/60 dark:hover:text-white"
    >
      <span className="truncate">{value}</span>
      {copied ? <Check className="h-3 w-3 shrink-0 text-emerald-500" /> : <Copy className="h-3 w-3 shrink-0" />}
    </button>
  );
}

const FILTERS = [
  { value: "all", label: "Everything" },
  { value: "writes", label: "Writes only" },
];

export default function SupportSessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { sessionsVersion } = useSARealtime();

  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [nonce, bump] = useReducer((n) => n + 1, 0);
  const [filter, setFilter] = useState("all");
  const skipCacheRef = useRef(false);
  const { phase, refreshing, error, data } = state;
  // Read inside the fetch effect without being one of its dependencies — a
  // refresh has to tell "first load" from "re-read" without restarting itself.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const { session, actions, actionTotal, writeTotal, truncated, serverTime } = data;

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    const forced = skipCacheRef.current;
    skipCacheRef.current = false;

    // A finished session never changes again, so it comes back from cache
    // instantly. A live one is always re-read — it is the thing being killed.
    const cached = forced ? null : superadminService.getSupportSessionCached(sessionId);
    if (cached) {
      dispatch({ type: "ready", data: cached });
      return () => controller.abort();
    }

    const silent = phaseRef.current === "ready";
    dispatch({ type: "load", silent });
    (async () => {
      try {
        const res = await superadminService.loadSupportSession(sessionId, { signal: controller.signal });
        if (!alive) return;
        dispatch({ type: "ready", data: res });
      } catch (err) {
        if (!alive || axios.isCancel(err)) return;
        // "Never existed" and "couldn't load" must not look the same here — one
        // is a dead end, the other is worth retrying.
        if (err?.response?.status === 404) {
          dispatch({ type: "missing" });
          return;
        }
        const message = err?.response?.data?.error || "Couldn't load this support session.";
        dispatch({ type: "failed", silent, message });
        if (silent) toast.error(message);
      }
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [sessionId, nonce, sessionsVersion]);

  const refresh = useCallback(() => {
    skipCacheRef.current = true;
    bump();
  }, []);

  const live = session ? effectiveStatus(session, Date.now()) === "active" : false;
  const { now, sync } = useServerClock(live);
  useEffect(() => {
    sync(serverTime);
  }, [serverTime, sync]);

  const status = session ? effectiveStatus(session, now) : null;
  const isLiveNow = status === "active";

  // Poll while the session is live: its action count and status move on their
  // own, and this is where an operator watches what an impersonator is doing.
  useEffect(() => {
    if (!isLiveNow) return undefined;
    const tick = () => {
      if (!document.hidden) refresh();
    };
    const id = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [isLiveNow, refresh]);

  const revoke = () =>
    confirm({
      title: "Revoke support session",
      message: "The operator's live access is killed immediately — the token is rejected on its very next request.",
      confirmText: "Revoke",
      tone: "danger",
      icon: Ban,
      onConfirm: async () => {
        try {
          const res = await superadminService.revokeSupportSession(sessionId);
          dispatch({ type: "patchSession", changes: res.data?.session || { status: "revoked", endedAt: new Date().toISOString() } });
          toast.success("Session revoked");
          refresh();
        } catch (err) {
          const already = err?.response?.status === 409 ? err.response.data?.status : null;
          if (already) {
            dispatch({ type: "patchSession", changes: { status: already } });
            toast(`Session was already ${already}`, { icon: "ℹ️" });
            refresh();
            return;
          }
          toast.error(err?.response?.data?.error || "Failed to revoke");
          throw err; // keep the dialog open so it can be retried
        }
      },
    });

  // Group the timeline by day — a session that ran across midnight, or an audit
  // trail read weeks later, is unreadable as one flat list of full timestamps.
  const shown = useMemo(
    () => (filter === "writes" ? actions.filter((a) => a.action === "support.action") : actions),
    [actions, filter],
  );
  const grouped = useMemo(() => {
    const out = [];
    for (const a of shown) {
      const day = fmtDay(a.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(a);
      else out.push({ day, items: [a] });
    }
    return out;
  }, [shown]);

  if (phase === "loading") return <SALoader />;
  if (phase === "error") return <SAErrorState message={error} onRetry={refresh} />;
  if (phase === "missing" || !session) {
    return (
      <div className={`${card} py-20 text-center [&_*]:!rounded-none`}>
        <SearchX className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-gray-500 dark:text-white/70">No support session with that id</p>
        <p className="mt-1 px-4 font-mono text-[11px] text-gray-400">{sessionId}</p>
        <button
          onClick={() => navigate("/support-sessions")}
          className="mt-4 bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light"
        >
          Back to sessions
        </button>
      </div>
    );
  }

  const SurfIcon = surfaceIcon(session.mode);
  const endedByEmail = session.endedBy?.email || session.endedBy?.name || null;

  return (
    // Sharp-corner variant: square every descendant's corners — matches the rest.
    <div className="pb-6 [&_*]:!rounded-none">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/support-sessions"))}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-white/60 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sessions
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          title="Refresh"
          aria-label="Refresh"
          className="grid h-9 w-9 place-items-center border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Hero — gradient banner with session identity, status/access/surface and
          the revoke kill switch. Light chips pop on the dark gradient. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${card} relative mb-5 overflow-hidden`}
      >
        <div className="relative overflow-hidden px-6 py-6 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => session.organisationId?._id && navigate(`/organisations/${session.organisationId._id}`)}
                disabled={!session.organisationId?._id}
                className="flex items-center gap-1.5 font-mono text-[11px] text-white/70 transition-colors hover:text-white disabled:cursor-default disabled:hover:text-white/70"
              >
                <Building2 className="h-3 w-3" />
                {tenantName(session)}
              </button>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold leading-tight text-white">
                <ShieldCheck className="h-6 w-6" /> Support session
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatusPill status={status} />
                <AccessPill access={session.access} onDark />
                <SurfacePill mode={session.mode} onDark />
                {isLiveNow ? <ExpiryCountdown session={session} now={now} onDark /> : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2.5">
              <span className="whitespace-nowrap text-xs text-white/70">
                Started {timeAgo(session.startedAt, now)} · ran {duration(session.startedAt, session.endedAt, now)}
              </span>
              {isLiveNow && (
                <button
                  onClick={revoke}
                  className="inline-flex items-center gap-1.5 bg-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
                >
                  <Ban className="h-4 w-4" /> Revoke now
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {/* Main — activity timeline */}
        <div className="lg:col-span-2">
          <div className={`${card} p-5 sm:p-6`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Clock className="h-4 w-4 text-gray-400" /> Activity <span className="text-gray-400">({actionTotal})</span>
              </h2>
              {/* Only worth offering once there is something to hide. */}
              {actionTotal > 0 && writeTotal > 0 && writeTotal < actionTotal && (
                <div className="flex items-center overflow-hidden border border-gray-200 text-[11px] font-semibold dark:border-white/10">
                  <Filter className="mx-2 h-3 w-3 text-gray-400" />
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFilter(f.value)}
                      aria-pressed={filter === f.value}
                      className={cn(
                        "px-2.5 py-1.5 transition-colors",
                        filter === f.value
                          ? "bg-accent text-white"
                          : "text-gray-500 hover:bg-gray-50 dark:text-white/60 dark:hover:bg-white/5",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {truncated && (
              <p className="mb-4 flex items-start gap-2 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                Showing the {actions.length} most recent of {actionTotal} recorded events. The full trail is in the audit log.
              </p>
            )}

            {shown.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                {actionTotal === 0 ? "No activity recorded" : "No write actions in this session"}
              </p>
            ) : (
              <div className="space-y-5">
                {grouped.map((group) => (
                  <div key={group.day}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.day}</p>
                    <ul className="divide-y divide-gray-100 dark:divide-white/10">
                      {group.items.map((a) => {
                        const m = actionMeta(a.action);
                        const Icon = m.icon;
                        const title = a.meta?.label || ACTION_TITLES[a.action] || a.action;
                        return (
                          <li key={a._id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${m.color}1a`, color: m.color }}>
                              <Icon className="h-[18px] w-[18px]" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                                {a.meta?.method && (
                                  <>
                                    <span className={cn("px-1.5 py-0.5 text-[10px] font-bold", METHOD[a.meta.method] || "bg-gray-100 text-gray-600")}>
                                      {a.meta.method}
                                    </span>
                                    <span className="font-mono text-[11px] text-gray-400">{a.meta.path}</span>
                                    {a.meta.status ? <span className="font-mono text-[10px] text-gray-400">· {a.meta.status}</span> : null}
                                  </>
                                )}
                              </div>
                              <p className="mt-0.5 font-mono text-[10px] text-gray-400" title={fmt(a.createdAt)}>
                                {a.actorEmail || "system"} · {new Date(a.createdAt).toLocaleTimeString()}
                              </p>
                              {a.action === "support.action" && a.meta?.changes && Object.keys(a.meta.changes).length > 0 ? (
                                <details className="mt-1.5">
                                  <summary className="cursor-pointer text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-white/70">What changed</summary>
                                  <pre className="mt-1 max-h-60 overflow-auto bg-gray-50 p-3 text-[11px] text-gray-700 dark:bg-white/5 dark:text-white/80">
                                    {JSON.stringify(a.meta.changes, null, 2)}
                                  </pre>
                                </details>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Operator → Acting as */}
          <div className={`${card} p-5`}>
            <SectionTitle>Impersonation</SectionTitle>
            <ImpersonationBlock session={session} />
          </div>

          {/* Session details */}
          <div className={`${card} p-5`}>
            <SectionTitle>Session details</SectionTitle>
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              <PropRow label="Surface">
                <span className="inline-flex items-center gap-1.5"><SurfIcon className="h-3.5 w-3.5 text-gray-400" />{surfaceLabel(session.mode)}</span>
              </PropRow>
              <PropRow label="Access">{accessLabel(session.access)}</PropRow>
              <PropRow label="Write actions">{writeTotal}</PropRow>
              <PropRow label="Total events">{actionTotal}</PropRow>
              <PropRow label="Started">{fmt(session.startedAt)}</PropRow>
              <PropRow label={isLiveNow ? "Expires" : "Expired"}>{fmt(session.expiresAt)}</PropRow>
              {session.endedAt ? <PropRow label="Ended">{fmt(session.endedAt)}</PropRow> : null}
              {endedByEmail ? <PropRow label="Ended by">{endedByEmail}</PropRow> : null}
              {session.reason ? <PropRow label="Reason">{session.reason}</PropRow> : null}
              {session.ticketId ? (
                <PropRow label="Ticket">
                  <button onClick={() => navigate(`/tickets/${session.ticketId}`)} className="inline-flex items-center gap-1 text-accent hover:underline">
                    <Ticket className="h-3.5 w-3.5" /> View ticket
                  </button>
                </PropRow>
              ) : null}
            </div>
          </div>

          {/* Where it came from — the forensic half. */}
          <div className={`${card} p-5`}>
            <SectionTitle>Origin</SectionTitle>
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              <PropRow label="Session id"><CopyableId value={session.sessionId} /></PropRow>
              {session.ip ? <PropRow label="IP"><span className="font-mono text-xs">{session.ip}</span></PropRow> : null}
              {session.userAgent ? (
                <PropRow label="Client"><span className="text-[11px] leading-snug text-gray-500 dark:text-white/60">{session.userAgent}</span></PropRow>
              ) : null}
              <PropRow label="Operator">
                <span className="inline-flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5 text-gray-400" />{session.impersonatorEmail || "—"}</span>
              </PropRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
