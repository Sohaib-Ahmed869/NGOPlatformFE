import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Building2,
  Eye,
  Ban,
  Search,
  LayoutGrid,
  List,
  Globe,
  LayoutDashboard,
  UserCog,
  Activity,
  Radio,
  Calendar,
  Clock,
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  Lock,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";
const inputCls =
  "w-full border border-gray-200 bg-white py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";

// Brand hero gradient — resolves to the platform palette (same vars as the
// sidebar), mirroring the Organisations / Audit hero.
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  ended: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  revoked: "bg-red-50 text-red-700 ring-1 ring-red-200",
  expired: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};
const statusDot = { active: "#10b981", ended: "#9ca3af", revoked: "#ef4444", expired: "#f59e0b" };
const statusColor = { active: "#10b981", ended: "#6b7280", revoked: "#ef4444", expired: "#f59e0b" };

const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
const fmtShort = (d) =>
  d ? new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

// Tinted gradient for the tenant initial badge, built from the status colour.
const avatarGradient = (c) => `linear-gradient(135deg, ${c}, ${c}b3)`;

const surfaceMeta = (m) =>
  m === "website"
    ? { label: "Public website", icon: Globe }
    : { label: "Admin portal", icon: LayoutDashboard };

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
];

/* Stat cell in the attached strip under the hero banner (Organisations look). */
function HeaderStat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

/* Access pill — view-only (amber) vs full (gray). */
function AccessPill({ access }) {
  return access === "view_only" ? (
    <span className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
      <Eye className="h-3 w-3" /> View-only
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200">
      <Lock className="h-3 w-3" /> Full
    </span>
  );
}

/* Status pill with a solid dot (mirrors the Organisations status pill). */
function StatusPill({ status }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyles[status] || "bg-gray-100 text-gray-500 ring-1 ring-gray-200"}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusDot[status] || statusDot.ended }} />
      {status}
    </span>
  );
}

export default function SupportSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid"); // "grid" | "table"
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [revokeModal, setRevokeModal] = useState(null);
  const limit = 50;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (status !== "all") params.status = status;
      const res = await superadminService.getSupportSessions(params);
      setSessions(res.data.sessions || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error("Failed to load support sessions");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const revoke = async () => {
    const s = revokeModal;
    if (!s) return;
    setBusyId(s.sessionId);
    try {
      await superadminService.revokeSupportSession(s.sessionId);
      toast.success("Session revoked — the token is killed immediately");
      setRevokeModal(null);
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to revoke");
    } finally {
      setBusyId(null);
    }
  };

  const pages = Math.ceil(total / limit) || 1;

  // Client-side search across the loaded page (the API filters by status only).
  const q = search.trim().toLowerCase();
  const visible = q
    ? sessions.filter((s) =>
        [s.organisationId?.name, s.orgSlug, s.impersonatorEmail, s.targetEmail, s.reason]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    : sessions;

  // Stat strip — total is server-wide for the current filter; the rest describe
  // the loaded page (a 50-row window).
  const activeNow = sessions.filter((s) => s.status === "active").length;
  const operators = new Set(sessions.map((s) => s.impersonatorEmail).filter(Boolean)).size;
  const tenants = new Set(sessions.map((s) => s.organisationId?._id || s.orgSlug).filter(Boolean)).size;
  const statTiles = [
    { label: "Total sessions", value: (total || 0).toLocaleString(), icon: ShieldCheck, color: "#6366f1" },
    { label: "Active now", value: activeNow, icon: Radio, color: activeNow > 0 ? "#10b981" : "#9ca3af" },
    { label: "Operators", value: operators, icon: UserCog, color: "#f59e0b" },
    { label: "Tenants touched", value: tenants, icon: Building2, color: "#06b6d4" },
  ];

  return (
    // Sharp-corner variant of this screen: square every descendant's corners
    // (cards, pills, buttons, inputs, badges, modal) for an angular look — matches
    // the Organisations / Audit / Platform / Settings screens.
    <div className="[&_*]:!rounded-none">
      {/* Hero — gradient banner + attached stat strip (mirrors Organisations) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${card} mb-6 overflow-hidden`}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          {/* Editorial corner decoration — SVG circle (so the page-wide sharp-corner
              override can't square it) + dot grid. */}
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Security</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Support sessions</h1>
            <p className="mt-1 text-sm text-white/80">Every platform-support impersonation, with a live kill switch.</p>
          </div>
        </div>
        {!loading && sessions.length > 0 && (
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
            {statTiles.map((t) => (
              <HeaderStat key={t.label} {...t} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant, operator, acting-as or reason…"
            className={`${inputCls} rounded-xl pl-10 pr-4`}
          />
        </div>
        <SASelect value={status} onChange={(v) => { setPage(1); setStatus(v); }} capitalize options={STATUS_OPTIONS} />
        {/* View toggle — cards / table */}
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {[["grid", LayoutGrid], ["table", List]].map(([v, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-label={`${v} view`}
              className={`grid h-10 w-10 place-items-center transition-colors ${view === v ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SALoader />
      ) : sessions.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No support sessions yet</p>
        </div>
      ) : visible.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No sessions match “{search}” on this page</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === "grid" ? (
            <motion.div
              key="grid"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {visible.map((s, i) => {
                const sc = statusColor[s.status] || "#6b7280";
                const surf = surfaceMeta(s.mode);
                const SurfIcon = surf.icon;
                const tenantName = s.organisationId?.name || s.orgSlug || "—";
                return (
                  <motion.div
                    key={s.sessionId}
                    className={`${card} group relative flex cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4), ease: [0.2, 0.7, 0.2, 1] }}
                    onClick={() => navigate(`/support-sessions/${s.sessionId}`)}
                  >
                    {/* live accent stripe for active sessions */}
                    {s.status === "active" && <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: "#10b981" }} />}

                    <div className="flex flex-1 flex-col p-5">
                      {/* header row: slug tag + access & status pills */}
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <span className="inline-flex min-w-0 items-center gap-1.5 bg-gray-100 px-2 py-1 font-mono text-[10px] text-gray-500">
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.orgSlug || tenantName}</span>
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <AccessPill access={s.access} />
                          <StatusPill status={s.status} />
                        </div>
                      </div>

                      {/* identity: initial badge + tenant + reason/surface */}
                      <div className="mb-4 flex items-center gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center text-lg font-bold uppercase text-white shadow-sm" style={{ background: avatarGradient(sc) }}>
                          {tenantName.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-1.5 truncate text-base font-bold text-gray-900">
                            <span className="truncate">{tenantName}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                          </h3>
                          <span className="flex min-w-0 items-center gap-1 text-[11px] text-gray-400">
                            <SurfIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{s.reason || surf.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* focal block — operator → acting as */}
                      <div className="relative mb-4 overflow-hidden py-3 pl-4 pr-3" style={{ background: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.08)" }}>
                        <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: "var(--tenant-accent, #047857)" }} />
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Operator</p>
                            <p className="truncate text-xs font-semibold text-gray-900">{s.impersonatorEmail || "—"}</p>
                            <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                              <ArrowRight className="h-3 w-3" /> Acting as
                            </p>
                            <p className="truncate text-xs font-semibold" style={{ color: "var(--tenant-accent, #047857)" }}>
                              {s.targetEmail || "—"}
                              {s.targetRole ? <span className="font-medium text-gray-400"> · {s.targetRole}</span> : null}
                            </p>
                          </div>
                          <span className="grid h-10 w-10 shrink-0 place-items-center" style={{ background: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.16)", color: "var(--tenant-accent, #047857)" }}>
                            <UserCog className="h-5 w-5" />
                          </span>
                        </div>
                      </div>

                      {/* meta grid: surface · actions · started · ended/expires */}
                      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Surface</p>
                          <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-gray-700">
                            <SurfIcon className="h-3 w-3 shrink-0 text-gray-400" /> {surf.label}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Actions</p>
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-700">
                            <Activity className="h-3 w-3 shrink-0 text-gray-400" /> {s.actionCount || 0}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Started</p>
                          <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-gray-700">
                            <Calendar className="h-3 w-3 shrink-0 text-gray-400" /> {fmtShort(s.startedAt)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">{s.status === "active" ? "Expires" : "Ended"}</p>
                          <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-gray-700">
                            <Clock className="h-3 w-3 shrink-0 text-gray-400" /> {fmtShort(s.status === "active" ? s.expiresAt : s.endedAt || s.expiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* segmented action footer — stop the card's navigate from firing */}
                    <div className="flex items-stretch border-t border-gray-100 text-[11px] font-semibold" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => navigate(`/support-sessions/${s.sessionId}`)}
                        className="flex flex-1 items-center justify-center gap-1.5 py-3 transition-colors hover:bg-gray-50"
                        style={{ color: "var(--tenant-accent, #047857)" }}
                      >
                        <Eye className="h-3.5 w-3.5" /> View detail
                      </button>
                      {s.status === "active" && (
                        <button
                          type="button"
                          onClick={() => setRevokeModal(s)}
                          disabled={busyId === s.sessionId}
                          className="flex flex-1 items-center justify-center gap-1.5 border-l border-gray-100 py-3 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" /> Revoke
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="table"
              className={`${card} overflow-hidden`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-left" style={{ backgroundColor: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.14)" }}>
                      {["Tenant", "Operator", "Acting as", "Surface", "Access", "Status", "Actions", "Started", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((s) => {
                      const sc = statusColor[s.status] || "#6b7280";
                      const surf = surfaceMeta(s.mode);
                      const SurfIcon = surf.icon;
                      const tenantName = s.organisationId?.name || s.orgSlug || "—";
                      return (
                        <tr
                          key={s.sessionId}
                          onClick={() => navigate(`/support-sessions/${s.sessionId}`)}
                          className="cursor-pointer border-t border-gray-100 transition-colors hover:bg-gray-50/70"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="grid h-8 w-8 shrink-0 place-items-center text-[11px] font-bold uppercase text-white" style={{ background: avatarGradient(sc) }}>
                                {tenantName.charAt(0)}
                              </span>
                              <span className="text-sm font-medium text-gray-900">{tenantName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{s.impersonatorEmail || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{s.targetEmail || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500"><SurfIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />{surf.label}</span>
                          </td>
                          <td className="px-4 py-3"><AccessPill access={s.access} /></td>
                          <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                          <td className="px-4 py-3 text-xs font-semibold text-gray-700">{s.actionCount || 0}</td>
                          <td className="px-4 py-3 text-xs text-gray-400" title={fmt(s.startedAt)}>{fmtShort(s.startedAt)}</td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            {s.status === "active" && (
                              <button
                                type="button"
                                onClick={() => setRevokeModal(s)}
                                disabled={busyId === s.sessionId}
                                className="inline-flex items-center gap-1 border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                              >
                                <Ban className="h-3 w-3" /> Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between px-1">
          <span className="font-mono text-xs text-gray-400">Page {page} of {pages} · {total} total</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pages}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      <AnimatePresence>
        {revokeModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRevokeModal(null)} />
            <motion.div
              className={`${card} relative w-full max-w-sm p-6 shadow-xl`}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-red-50 ring-1 ring-red-100">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">Revoke support session</h3>
              <p className="mb-6 text-center text-sm text-gray-500">
                Kill <strong className="text-gray-800">{revokeModal.impersonatorEmail || "this operator"}</strong>’s live access to{" "}
                <strong className="text-gray-800">{revokeModal.organisationId?.name || revokeModal.orgSlug || "this tenant"}</strong>? The token is rejected on its very next request.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setRevokeModal(null)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">
                  Cancel
                </button>
                <button type="button" onClick={revoke} disabled={busyId === revokeModal.sessionId} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                  Revoke
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
