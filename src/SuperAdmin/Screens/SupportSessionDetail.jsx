import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShieldCheck, Eye, Ban, Building2, Clock, Lock, Globe, LayoutDashboard,
  UserCog, ArrowRight, Activity, LogOut, Pencil, Ticket,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";
import { useConfirm } from "../components/ConfirmProvider";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
// Brand hero gradient — the platform palette (same vars as the sidebar).
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700",
  ended: "bg-gray-100 text-gray-600",
  revoked: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
};
const statusDot = { active: "#10b981", ended: "#9ca3af", revoked: "#ef4444", expired: "#f59e0b" };
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
};
// Per-event icon + colour for the activity timeline.
function actionMeta(action) {
  switch (action) {
    case "support.session_started": return { icon: ShieldCheck, color: "#10b981" };
    case "support.session_ended": return { icon: LogOut, color: "#64748b" };
    case "support.session_revoked": return { icon: Ban, color: "#ef4444" };
    case "support.action": return { icon: Pencil, color: "#0ea5e9" };
    default: return { icon: Activity, color: "#6366f1" };
  }
}
const surfaceMeta = (m) => (m === "website" ? { label: "Public website", icon: Globe } : { label: "Admin portal", icon: LayoutDashboard });

const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
function timeAgo(d) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
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

export default function SupportSessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superadminService.getSupportSession(sessionId);
      setData(res.data);
    } catch {
      toast.error("Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async () => {
    const ok = await confirm({
      title: "Revoke support session",
      message: "The operator's live access is killed immediately — the token is rejected on its very next request.",
      confirmText: "Revoke",
      tone: "danger",
      icon: Ban,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await superadminService.revokeSupportSession(sessionId);
      toast.success("Session revoked");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to revoke");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <SALoader />;

  const s = data?.session;
  if (!s) {
    return (
      <div className={`${card} py-20 text-center`}>
        <p className="mb-4 text-gray-500">Support session not found</p>
        <button onClick={() => navigate("/support-sessions")} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light">Back to sessions</button>
      </div>
    );
  }
  const actions = data.actions || [];
  const writes = actions.filter((a) => a.action === "support.action").length;
  const surf = surfaceMeta(s.mode);
  const SurfIcon = surf.icon;

  return (
    // Sharp-corner variant: square every descendant's corners — matches the rest.
    <div className="pb-6 [&_*]:!rounded-none">
      <button onClick={() => navigate("/support-sessions")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-white/60 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to sessions
      </button>

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
              <p className="flex items-center gap-1.5 font-mono text-[11px] text-white/70"><Building2 className="h-3 w-3" />{s.organisationId?.name || s.orgSlug || "—"}</p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold leading-tight text-white"><ShieldCheck className="h-6 w-6" /> Support session</h1>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold capitalize", statusStyles[s.status] || "bg-gray-100 text-gray-600")}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusDot[s.status] || statusDot.ended }} />{s.status}
                </span>
                {s.access === "view_only" ? (
                  <span className="inline-flex items-center gap-1 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"><Eye className="h-3 w-3" /> View-only</span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-1 text-[10px] font-semibold text-white ring-1 ring-white/20"><Lock className="h-3 w-3" /> Full access</span>
                )}
                <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-1 text-[10px] font-semibold text-white ring-1 ring-white/20"><SurfIcon className="h-3 w-3" /> {surf.label}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2.5">
              <span className="whitespace-nowrap text-xs text-white/70">Started {timeAgo(s.startedAt)}</span>
              {s.status === "active" && (
                <button onClick={revoke} disabled={busy} className="inline-flex items-center gap-1.5 bg-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50">
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
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Clock className="h-4 w-4 text-gray-400" /> Activity <span className="text-gray-400">({actions.length})</span></h2>
            {actions.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">No activity recorded</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-white/10">
                {actions.map((a) => {
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
                              <span className={cn("px-1.5 py-0.5 text-[10px] font-bold", METHOD[a.meta.method] || "bg-gray-100 text-gray-600")}>{a.meta.method}</span>
                              <span className="font-mono text-[11px] text-gray-400">{a.meta.path}</span>
                              {a.meta.status ? <span className="font-mono text-[10px] text-gray-400">· {a.meta.status}</span> : null}
                            </>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-gray-400">{a.actorEmail || "system"} · {fmt(a.createdAt)}</p>
                        {a.action === "support.action" && a.meta?.changes && Object.keys(a.meta.changes).length > 0 ? (
                          <details className="mt-1.5">
                            <summary className="cursor-pointer text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-white/70">What changed</summary>
                            <pre className="mt-1 max-h-60 overflow-auto bg-gray-50 p-3 text-[11px] text-gray-700 dark:bg-white/5 dark:text-white/80">{JSON.stringify(a.meta.changes, null, 2)}</pre>
                          </details>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Operator → Acting as */}
          <div className={`${card} p-5`}>
            <SectionTitle>Impersonation</SectionTitle>
            <div className="relative overflow-hidden py-3 pl-4 pr-3" style={{ background: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.08)" }}>
              <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: "var(--tenant-accent, #047857)" }} />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Operator</p>
                  <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">{s.impersonatorEmail || "—"}</p>
                  <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400"><ArrowRight className="h-3 w-3" /> Acting as</p>
                  <p className="truncate text-xs font-semibold" style={{ color: "var(--tenant-accent, #047857)" }}>
                    {s.targetEmail || "—"}{s.targetRole ? <span className="font-medium text-gray-400"> · {s.targetRole}</span> : null}
                  </p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center" style={{ background: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.16)", color: "var(--tenant-accent, #047857)" }}>
                  <UserCog className="h-5 w-5" />
                </span>
              </div>
            </div>
          </div>

          {/* Session details */}
          <div className={`${card} p-5`}>
            <SectionTitle>Session details</SectionTitle>
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              <PropRow label="Surface"><span className="inline-flex items-center gap-1.5"><SurfIcon className="h-3.5 w-3.5 text-gray-400" />{surf.label}</span></PropRow>
              <PropRow label="Access">{s.access === "view_only" ? "View-only" : "Full access"}</PropRow>
              <PropRow label="Write actions">{writes}</PropRow>
              <PropRow label="Total events">{actions.length}</PropRow>
              <PropRow label="Started">{fmt(s.startedAt)}</PropRow>
              <PropRow label="Expires">{fmt(s.expiresAt)}</PropRow>
              <PropRow label="Ended">{fmt(s.endedAt)}</PropRow>
              {s.reason ? <PropRow label="Reason">{s.reason}</PropRow> : null}
              {s.ticketId ? (
                <PropRow label="Ticket">
                  <button onClick={() => navigate(`/tickets/${s.ticketId}`)} className="inline-flex items-center gap-1 text-accent hover:underline"><Ticket className="h-3.5 w-3.5" /> View ticket</button>
                </PropRow>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
