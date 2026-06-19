import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText,
  Building2,
  Search,
  List,
  AlignLeft,
  Clock,
  UserCog,
  Layers,
  Ticket,
  LifeBuoy,
  Activity,
  Info,
  Globe,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";
const inputCls =
  "w-full border border-gray-200 bg-white py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";

// Brand hero gradient — resolves to the platform palette (same vars as the
// sidebar), mirroring the Organisations / dashboard hero.
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

// Compact relative time for the "When" column / timeline timestamp.
function timeAgo(d) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// Common action codes worth filtering on; "all" shows everything.
const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "support.action", label: "Support write actions" },
  { value: "support.session_started", label: "Support — started" },
  { value: "support.session_ended", label: "Support — ended" },
  { value: "support.session_revoked", label: "Support — revoked" },
  { value: "org.suspended", label: "Org suspended" },
  { value: "plan.created", label: "Plan created" },
  { value: "plan.updated", label: "Plan updated" },
];

// Map an action's prefix to a category descriptor (icon + colour + group label).
// Prefix-matched so new sub-actions inherit sensible visuals automatically.
const CATEGORIES = {
  support: { label: "Support", color: "#8b5cf6", icon: LifeBuoy },
  plan: { label: "Plans", color: "#10b981", icon: Layers },
  coupon: { label: "Billing", color: "#f59e0b", icon: Ticket },
  org: { label: "Tenant", color: "#ef4444", icon: Building2 },
  default: { label: "System", color: "#6366f1", icon: Activity },
};
const categoryOf = (action = "") => CATEGORIES[action.split(".")[0]] || CATEGORIES.default;

// Friendly labels for known codes; everything else is prettified from the code.
const ACTION_LABELS = {
  "support.action": "Support write action",
  "support.session_started": "Support session started",
  "support.session_ended": "Support session ended",
  "support.session_revoked": "Support session revoked",
  "org.suspended": "Organisation suspended",
  "plan.created": "Plan created",
  "plan.updated": "Plan updated",
};
const prettyAction = (a = "") =>
  ACTION_LABELS[a] || a.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const detailOf = (a) => a.meta?.label || a.meta?.reason || a.meta?.path || a.targetType || "—";

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

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("timeline"); // "timeline" | "table"
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (action !== "all") params.action = action;
      const res = await superadminService.getAuditLog(params);
      setEntries(res.data.entries || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const pages = Math.ceil(total / limit) || 1;

  // Client-side search across the loaded page (the API filters by action only).
  const q = search.trim().toLowerCase();
  const visible = q
    ? entries.filter((a) =>
        [a.action, a.actorEmail, a.organisationId?.name, detailOf(a)]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q)),
      )
    : entries;

  // Stat strip — total is server-wide for the current filter; the rest describe
  // the loaded page (a 50-row window).
  const operators = new Set(entries.map((e) => e.actorEmail).filter(Boolean)).size;
  const tenants = new Set(entries.map((e) => e.organisationId?._id || e.organisationId?.name).filter(Boolean)).size;
  const statTiles = [
    { label: "Total events", value: (total || 0).toLocaleString(), icon: ScrollText, color: "#6366f1" },
    { label: "Operators", value: operators, icon: UserCog, color: "#10b981" },
    { label: "Tenants touched", value: tenants, icon: Building2, color: "#f59e0b" },
    { label: "Latest event", value: timeAgo(entries[0]?.createdAt), icon: Clock, color: "#06b6d4" },
  ];

  return (
    // Sharp-corner variant of this screen: square every descendant's corners
    // (cards, pills, buttons, inputs, icon chips) for an angular look — matches
    // the Organisations / Platform / Settings screens.
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
            <h1 className="mt-1 text-2xl font-bold text-white">Audit log</h1>
            <p className="mt-1 text-sm text-white/80">Every platform-operator action, append-only.</p>
          </div>
        </div>
        {!loading && entries.length > 0 && (
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
            placeholder="Search action, operator, tenant or detail…"
            className={`${inputCls} rounded-xl pl-10 pr-4`}
          />
        </div>
        <SASelect value={action} onChange={(v) => { setPage(1); setAction(v); }} options={ACTION_OPTIONS} />
        {/* View toggle — timeline / table */}
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {[["timeline", AlignLeft], ["table", List]].map(([v, Icon]) => (
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
      ) : entries.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <ScrollText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No audit entries</p>
        </div>
      ) : visible.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No entries match “{search}” on this page</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === "timeline" ? (
            <motion.div
              key="timeline"
              className={`${card} overflow-hidden`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <ul className="divide-y divide-gray-100 dark:divide-white/10">
                {visible.map((a, i) => {
                  const cat = categoryOf(a.action);
                  const Icon = cat.icon;
                  const detail = detailOf(a);
                  return (
                    <motion.li
                      key={a._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.3), ease: [0.2, 0.7, 0.2, 1] }}
                      className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${cat.color}1a`, color: cat.color }}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{prettyAction(a.action)}</span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${cat.color}14`, color: cat.color }}>{cat.label}</span>
                          <span className="font-mono text-[10px] text-gray-400">{a.action}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5 shrink-0 text-gray-400" />{a.actorEmail || "system"}</span>
                          <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />{a.organisationId?.name || "Platform"}</span>
                          {detail !== "—" && (
                            <span className="inline-flex min-w-0 items-center gap-1.5 text-gray-600"><Info className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="truncate">{detail}</span></span>
                          )}
                          {a.ip && (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-gray-400"><Globe className="h-3 w-3 shrink-0" />{a.ip}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-medium text-gray-500">{timeAgo(a.createdAt)}</p>
                        <p className="mt-0.5 text-[10px] text-gray-400">{fmt(a.createdAt)}</p>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
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
                      {["Action", "Category", "Operator", "Tenant", "Detail", "When"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => {
                      const cat = categoryOf(a.action);
                      const Icon = cat.icon;
                      return (
                        <tr key={a._id} className="border-t border-gray-100 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="grid h-8 w-8 shrink-0 place-items-center" style={{ background: `${cat.color}1a`, color: cat.color }}>
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{prettyAction(a.action)}</p>
                                <p className="font-mono text-[10px] text-gray-400">{a.action}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${cat.color}14`, color: cat.color }}>{cat.label}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-white/70">{a.actorEmail || "system"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500"><Building2 className="h-3 w-3 shrink-0 text-gray-400" />{a.organisationId?.name || "Platform"}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-white/70">{detailOf(a)}</td>
                          <td className="px-4 py-3 text-xs text-gray-400" title={fmt(a.createdAt)}>{timeAgo(a.createdAt)}</td>
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
    </div>
  );
}
