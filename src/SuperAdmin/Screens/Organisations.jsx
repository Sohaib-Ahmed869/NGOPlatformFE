import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  Search,
  LayoutGrid,
  List,
  Building2,
  Globe,
  Calendar,
  AlertTriangle,
  Activity,
  DollarSign,
  Mail,
  ArrowUpRight,
  Layers,
  Settings,
  RefreshCw,
  Ban,
  Power,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

import AnimatedNumber from "../components/AnimatedNumber";
const planColors = { basic: "#06b6d4", professional: "#10b981", enterprise: "#f59e0b" };
const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  past_due: "bg-red-50 text-red-700 ring-1 ring-red-200",
  cancelled: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};
// Solid dot colour for the status pill (mirrors the reference card's dot).
const statusDot = {
  active: "#10b981",
  pending: "#f59e0b",
  past_due: "#ef4444",
  cancelled: "#9ca3af",
};

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";
const inputCls =
  "w-full border border-gray-200 bg-white py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";

// Tinted gradient for the avatar tile, built from the plan colour.
const avatarGradient = (pc) => `linear-gradient(135deg, ${pc}, ${pc}b3)`;

// Best logo for a small light tile: prefer the square mark, then the full logo.
// Empty string → fall back to the gradient initial badge.
const orgLogo = (org) =>
  org?.branding?.iconLogoDark ||
  org?.branding?.iconLogo ||
  org?.branding?.logoDark ||
  org?.branding?.logo ||
  "";

// Brand hero gradient — resolves to the platform palette (same vars as the
// sidebar), mirroring the org-admin dashboard hero.
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

/* Stat cell in the attached strip under the hero banner (dashboard look). */
function HeaderStat({ icon: Icon, label, value, color, prefix }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900">
          <AnimatedNumber value={value} prefix={prefix} />
        </p>
        <p className="mt-1 text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

/* Entrance choreography — the grid staggers its cards in, each card rising
   with the house cubic-bezier. Late-mounted cards (live updates) animate solo. */
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] } },
};

export default function Organisations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState("grid"); // "grid" | "table"
  const [planModal, setPlanModal] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [statusModal, setStatusModal] = useState(null); // { org, action: "suspend" | "reactivate" }
  const [acting, setActing] = useState(false); // a mutation is in flight — blocks double submits
  const [revalidating, setRevalidating] = useState(false); // background refresh of the current view
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();
  // Realtime nudge: bumps when any organisation changes anywhere (another
  // operator, a Stripe webhook, an activation) — caches are already invalidated.
  const { orgsVersion } = useSARealtime();

  // Debounce the search box into `debouncedSearch` and snap back to page 1.
  // Both setters run in the same tick (batched → one render → one fetch), and
  // on mount `search === debouncedSearch` so no duplicate initial request.
  useEffect(() => {
    const next = search.trim();
    if (next === debouncedSearch) return undefined;
    const t = setTimeout(() => {
      setDebouncedSearch(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  // Single fetch pipeline for the list, cache-first: a page/filter combo
  // already seen this session renders instantly with NO request (org mutations
  // and realtime events clear the cache in the service, so a re-run after a
  // change refetches). When we're refreshing the SAME view we're already
  // showing (mutation, socket nudge, manual refresh) the data updates silently
  // in place — the loader only shows for a view we haven't rendered yet.
  // Superseded live requests are aborted so a slow stale response can never
  // overwrite a newer one.
  const lastParamsKeyRef = useRef(null);
  useEffect(() => {
    const params = { page, limit: 20 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (planFilter) params.plan = planFilter;
    if (statusFilter) params.status = statusFilter;
    const paramsKey = JSON.stringify(params);

    const cached = superadminService.getOrganisationsCached(params);
    if (cached) {
      setOrgs(cached.organisations || []);
      setPagination(cached.pagination || {});
      setError(null);
      setLoading(false);
      lastParamsKeyRef.current = paramsKey;
      return undefined;
    }

    const sameView = lastParamsKeyRef.current === paramsKey;
    const controller = new AbortController();
    let alive = true;
    (async () => {
      if (sameView) setRevalidating(true);
      else setLoading(true);
      try {
        const data = await superadminService.loadOrganisations(params, { signal: controller.signal });
        if (!alive) return;
        const { organisations = [], pagination: pg = {} } = data || {};
        // A mutation or filter change can strand us past the last page — snap back.
        if (page > 1 && page > (pg.pages || 0)) {
          setPage(Math.max(1, pg.pages || 1));
          return;
        }
        setOrgs(organisations);
        setPagination(pg);
        setError(null);
        lastParamsKeyRef.current = paramsKey;
      } catch (err) {
        if (!alive || axios.isCancel(err)) return;
        console.error("Failed to fetch organisations:", err);
        const msg = err.response?.data?.error || "Couldn't load organisations. Please try again.";
        if (sameView) toast.error(msg); // background refresh failed — keep the grid up
        else setError(msg);
      } finally {
        if (alive) {
          setLoading(false);
          setRevalidating(false);
        }
      }
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [page, planFilter, statusFilter, debouncedSearch, refreshKey, orgsVersion]);

  // Platform-wide totals for the summary band (same source as the dashboard).
  // Session-cached in the service; org mutations and realtime events clear the
  // cache, and the orgsVersion dep re-runs this — a warm cache resolves
  // instantly with no request, a cleared one costs exactly one.
  const loadStats = useCallback(() => {
    superadminService
      .getBillingStats()
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadStats();
  }, [loadStats, orgsVersion]);

  // Dynamic plans for the plan filter + Change-Plan modal (falls back to the
  // legacy tiers if the Plan collection hasn't been seeded yet). Session-cached
  // in the service — shared with the detail screen, one request per session.
  useEffect(() => {
    superadminService
      .getPlansCached()
      .then((res) => setPlans((res.data.plans || []).filter((p) => !p.archivedAt && p.isActive !== false)))
      .catch(() => {});
  }, []);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    loadStats();
  };

  // Manual refresh — drop every org cache and revalidate the current view
  // silently (the spinner on the button is the only visual cue).
  const hardRefresh = () => {
    superadminService.invalidateOrgCaches();
    refresh();
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setPlanFilter("");
    setStatusFilter("");
    setPage(1);
  };
  const hasFilters = Boolean(search.trim() || debouncedSearch || planFilter || statusFilter);

  const handleStatusChange = async () => {
    if (!statusModal || acting) return;
    const { org, action } = statusModal;
    setActing(true);
    try {
      await superadminService.updateOrgStatus(org._id, action);
      toast.success(action === "suspend" ? "Organisation suspended" : "Organisation reactivated");
      setStatusModal(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActing(false);
    }
  };

  const handleChangePlan = async () => {
    if (!planModal || !selectedPlan || acting) return;
    if (selectedPlan === planModal.plan) {
      setPlanModal(null); // no-op — don't touch the API/Stripe
      return;
    }
    setActing(true);
    try {
      await superadminService.updateOrgPlan(planModal._id, selectedPlan);
      toast.success("Plan updated");
      setPlanModal(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update plan");
    } finally {
      setActing(false);
    }
  };

  // Action button cluster for the table rows — icon-only, theme-aware.
  const ActionButtons = ({ org }) => (
    <div className="flex gap-1.5">
      <button
        type="button"
        title="Manage"
        aria-label="Manage"
        onClick={() => navigate(`/organisations/${org._id}`)}
        className="grid h-8 w-8 place-items-center bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
      >
        <Settings className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Change plan"
        aria-label="Change plan"
        onClick={() => {
          setPlanModal(org);
          setSelectedPlan(org.plan);
        }}
        className="grid h-8 w-8 place-items-center transition-opacity hover:opacity-80"
        style={{
          backgroundColor: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.12)",
          color: "var(--tenant-accent, #047857)",
        }}
      >
        <RefreshCw className="h-4 w-4" />
      </button>
      {org.subscriptionStatus === "cancelled" ? (
        <button
          type="button"
          title="Reactivate"
          aria-label="Reactivate"
          onClick={() => setStatusModal({ org, action: "reactivate" })}
          className="grid h-8 w-8 place-items-center bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
        >
          <Power className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          title="Suspend"
          aria-label="Suspend"
          onClick={() => setStatusModal({ org, action: "suspend" })}
          className="grid h-8 w-8 place-items-center bg-red-50 text-red-600 transition-colors hover:bg-red-100"
        >
          <Ban className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const totalOrgs = stats?.totalOrganisations ?? pagination.total;
  const statTiles = stats
    ? [
        { label: "Total tenants", value: totalOrgs ?? 0, icon: Building2, color: "#6366f1" },
        { label: "Active", value: stats.activeSubscriptions || 0, icon: Activity, color: "#10b981" },
        {
          label: "Needs attention",
          value: stats.failedPayments || 0,
          icon: AlertTriangle,
          color: stats.failedPayments > 0 ? "#ef4444" : "#10b981",
        },
        { label: "Monthly revenue", value: Number(stats.mrr || 0), prefix: "$", icon: DollarSign, color: "#f59e0b" },
      ]
    : [];

  // Match each org's plan code to its priced plan (price line + pill colour).
  const planByCode = useMemo(() => plans.reduce((m, p) => ((m[p.code] = p), m), {}), [plans]);

  // Plan filter follows the dynamic Plan collection (orgs can sit on custom
  // codes beyond the 3 legacy tiers); falls back to the legacy tiers pre-seed.
  const planFilterOpts = useMemo(
    () => [
      ["", "All Plans"],
      ...(plans.length > 0
        ? plans.map((p) => [p.code, p.name])
        : [["basic", "Basic"], ["professional", "Professional"], ["enterprise", "Enterprise"]]),
    ],
    [plans],
  );

  // Pill/avatar colour for a plan — dynamic plan colour first, legacy map second.
  const planColor = (code) => planByCode[code]?.color || planColors[code] || "#10b981";

  return (
    // Sharp-corner variant of this screen: square every descendant's corners
    // (cards, pills, buttons, inputs, avatars, modals) for an angular look.
    // MotionConfig honours the OS "reduce motion" preference for every
    // animation inside.
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      {/* Hero — gradient banner + attached stat strip (mirrors the dashboard) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${card} mb-6 overflow-hidden`}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          {/* Editorial corner decoration — SVG circle (so the page-wide sharp-corner
              override can't square it) + dot grid. */}
          <svg
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white"
            viewBox="0 0 128 128"
            fill="none"
          >
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Tenants</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Organisations</h1>
            <p className="mt-1 text-sm text-white/80">Manage every registered organisation, plan and subscription.</p>
          </div>
        </div>
        {statTiles.length > 0 && (
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
            {statTiles.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease: "easeOut" }}
              >
                <HeaderStat {...t} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Filters — slides in just after the hero */}
      <motion.div
        className="mb-6 flex flex-wrap gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or slug…"
            className={`${inputCls} rounded-xl pl-10 pr-4`}
          />
        </div>
        {[
          { val: planFilter, set: setPlanFilter, opts: planFilterOpts },
          { val: statusFilter, set: setStatusFilter, opts: [["", "All Status"], ["active", "Active"], ["pending", "Pending"], ["past_due", "Past Due"], ["cancelled", "Cancelled"]] },
        ].map((f, i) => (
          <SASelect
            key={i}
            value={f.val}
            onChange={(v) => {
              f.set(v);
              setPage(1); // filter change always restarts from the first page
            }}
            options={f.opts}
          />
        ))}
        {/* Manual refresh — bypasses the session cache for the current view */}
        <button
          type="button"
          title="Refresh"
          aria-label="Refresh"
          onClick={hardRefresh}
          disabled={loading || revalidating}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${revalidating ? "animate-spin" : ""}`} />
        </button>
        {/* View toggle — the active pill slides between the two buttons */}
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {[["grid", LayoutGrid], ["table", List]].map(([v, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-label={`${v} view`}
              className={`relative grid h-10 w-10 place-items-center transition-colors ${
                view === v ? "text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {view === v && (
                <motion.span
                  layoutId="saOrgViewPill"
                  className="absolute inset-0 bg-accent"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative z-[1] h-4 w-4" />
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <SALoader />
        </motion.div>
      ) : error ? (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`${card} py-20 text-center`}
        >
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-300" />
          <p className="text-gray-600">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </motion.div>
      ) : orgs.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`${card} py-20 text-center`}
        >
          {/* the icon pops in with a little spring after the card lands */}
          <motion.span
            className="inline-block"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 }}
          >
            <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          </motion.span>
          <p className="text-gray-500">{hasFilters ? "No organisations match your filters" : "No organisations found"}</p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Clear filters
            </button>
          )}
        </motion.div>
      ) : view === "grid" ? (
            <motion.div
              key="grid"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              variants={gridVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              {orgs.map((org) => {
                const pc = planColor(org.plan);
                const planPrice = planByCode[org.plan]?.price?.monthly;
                return (
                  <motion.div
                    key={org._id}
                    layout
                    variants={cardVariants}
                    className={`${card} group relative flex cursor-pointer flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg hover:shadow-black/5`}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(`/organisations/${org._id}`)}
                  >
                    <div className="flex flex-1 flex-col p-5">
                      {/* header row: slug tag + status pill with dot */}
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <span className="inline-flex min-w-0 items-center gap-1.5 bg-gray-100 px-2 py-1 font-mono text-[10px] text-gray-500">
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{org.slug}</span>
                        </span>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyles[org.subscriptionStatus] || statusStyles.pending}`}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusDot[org.subscriptionStatus] || statusDot.pending }} />
                          {org.subscriptionStatus}
                        </span>
                      </div>

                      {/* identity: logo (or initial) + name + admin email */}
                      <div className="mb-4 flex items-center gap-3">
                        {orgLogo(org) ? (
                          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden">
                            <img src={orgLogo(org)} alt={org.name} className="h-full w-full object-contain" />
                          </span>
                        ) : (
                          <span
                            className="grid h-12 w-12 shrink-0 place-items-center text-lg font-bold uppercase text-white shadow-sm"
                            style={{ background: avatarGradient(pc) }}
                          >
                            {org.name?.charAt(0)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-1.5 truncate text-base font-bold text-gray-900">
                            <span className="truncate">{org.name}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                          </h3>
                          {org.adminUserId?.email ? (
                            <span className="flex min-w-0 items-center gap-1 text-[11px] text-gray-400">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{org.adminUserId.email}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">No admin linked</span>
                          )}
                        </div>
                      </div>

                      {/* focal block — accent stat tile: left bar + tint + icon chip */}
                      <div
                        className="relative mb-4 flex items-center justify-between gap-3 overflow-hidden py-3 pl-4 pr-3"
                        style={{ background: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.08)" }}
                      >
                        {/* colored left accent bar */}
                        <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: "var(--tenant-accent, #047857)" }} />
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold capitalize leading-tight text-gray-900">{org.plan}</p>
                          {planPrice != null && (
                            <p className="mt-0.5 text-xs font-semibold" style={{ color: "var(--tenant-accent, #047857)" }}>
                              ${Number(planPrice).toLocaleString()}
                              <span className="font-medium text-gray-400"> / month</span>
                            </p>
                          )}
                        </div>
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center"
                          style={{ background: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.16)", color: "var(--tenant-accent, #047857)" }}
                        >
                          <Layers className="h-5 w-5" />
                        </span>
                      </div>

                      {/* meta: tenant id + created */}
                      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Tenant ID</p>
                          <p className="mt-1 truncate font-mono text-xs font-medium text-gray-700">{org._id?.slice(-8)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Created</p>
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-700">
                            <Calendar className="h-3 w-3 shrink-0 text-gray-400" />
                            {new Date(org.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* segmented action footer — stop the card's navigate from firing */}
                    <div
                      className="flex items-stretch border-t border-gray-100 text-[11px] font-semibold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/organisations/${org._id}`)}
                        className="flex flex-1 items-center justify-center gap-1.5 py-3 transition-colors hover:bg-gray-50"
                        style={{ color: "var(--tenant-accent, #047857)" }}
                      >
                        <Settings className="h-3.5 w-3.5" /> Manage
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPlanModal(org);
                          setSelectedPlan(org.plan);
                        }}
                        className="flex flex-1 items-center justify-center gap-1.5 border-l border-gray-100 py-3 text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Plan
                      </button>
                      {org.subscriptionStatus === "cancelled" ? (
                        <button
                          type="button"
                          onClick={() => setStatusModal({ org, action: "reactivate" })}
                          className="flex flex-1 items-center justify-center gap-1.5 border-l border-gray-100 py-3 text-emerald-600 transition-colors hover:bg-emerald-50"
                        >
                          <Power className="h-3.5 w-3.5" /> Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStatusModal({ org, action: "suspend" })}
                          className="flex flex-1 items-center justify-center gap-1.5 border-l border-gray-100 py-3 text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Ban className="h-3.5 w-3.5" /> Suspend
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      className="border-b border-gray-100 text-left"
                      style={{ backgroundColor: "rgba(var(--tenant-accent-rgb, 16, 185, 129), 0.14)" }}
                    >
                      {["Name", "Slug", "Plan", "Status", "Admin", "Created", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org, i) => {
                      const pc = planColor(org.plan);
                      return (
                        <motion.tr
                          key={org._id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.03, 0.45), duration: 0.3, ease: "easeOut" }}
                          className="border-t border-gray-100 transition-colors hover:bg-gray-50/70"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {orgLogo(org) ? (
                                <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden">
                                  <img src={orgLogo(org)} alt={org.name} className="h-full w-full object-contain" />
                                </span>
                              ) : (
                                <span
                                  className="grid h-8 w-8 shrink-0 place-items-center text-[11px] font-bold uppercase text-white"
                                  style={{ background: avatarGradient(pc) }}
                                >
                                  {org.name?.charAt(0)}
                                </span>
                              )}
                              <span className="text-sm font-medium text-gray-900">{org.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{org.slug}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: `${pc}14`, color: pc }}>
                              {org.plan}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyles[org.subscriptionStatus] || statusStyles.pending}`}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusDot[org.subscriptionStatus] || statusDot.pending }} />
                              {org.subscriptionStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {org.adminUserId?.email ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                {org.adminUserId.email}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                              <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                              {new Date(org.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <ActionButtons org={org} />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <motion.div
          className="mt-6 flex items-center justify-between px-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <span className="font-mono text-xs text-gray-400">
            Page {pagination.page} of {pagination.pages} · {pagination.total} total
          </span>
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
              disabled={page >= pagination.pages}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10"
            >
              Next
            </button>
          </div>
        </motion.div>
      )}

      {/* Change Plan Modal */}
      <AnimatePresence>
        {planModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !acting && setPlanModal(null)} />
            <motion.div
              className={`${card} relative w-full max-w-sm p-6 shadow-xl`}
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <h3 className="mb-1 text-lg font-semibold text-gray-900">Change Plan</h3>
              <p className="mb-4 text-xs text-gray-400">{planModal.name}</p>
              <div className="mb-4">
                <SASelect
                  fullWidth
                  value={selectedPlan}
                  onChange={(v) => setSelectedPlan(v)}
                  options={plans.length === 0
                    ? [{ value: "basic", label: "Basic" }, { value: "professional", label: "Professional" }, { value: "enterprise", label: "Enterprise" }]
                    : plans.map((p) => ({ value: p.code, label: `${p.name} — $${Number(p.price?.monthly || 0).toLocaleString()}/mo` }))}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => setPlanModal(null)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={acting || selectedPlan === planModal.plan}
                  onClick={handleChangePlan}
                  className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {acting ? "Updating…" : "Update"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suspend / Reactivate Confirmation Modal */}
      <AnimatePresence>
        {statusModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !acting && setStatusModal(null)} />
            <motion.div
              className={`${card} relative w-full max-w-sm p-6 shadow-xl`}
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.08 }}
                className={`mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl ${
                  statusModal.action === "suspend" ? "bg-red-50 ring-1 ring-red-100" : "bg-emerald-50 ring-1 ring-emerald-100"
                }`}
              >
                {statusModal.action === "suspend" ? (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                ) : (
                  <Power className="h-6 w-6 text-emerald-600" />
                )}
              </motion.div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">
                {statusModal.action === "suspend" ? "Suspend Organisation" : "Reactivate Organisation"}
              </h3>
              <p className="mb-6 text-center text-sm text-gray-500">
                {statusModal.action === "suspend" ? (
                  <>
                    Are you sure you want to suspend <strong className="text-gray-800">{statusModal.org.name}</strong>? Their Stripe
                    subscription will be cancelled and their portal deactivated.
                  </>
                ) : (
                  <>
                    Reactivate <strong className="text-gray-800">{statusModal.org.name}</strong>? Their portal will be switched back on
                    and their subscription marked active.
                  </>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => setStatusModal(null)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={handleStatusChange}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                    statusModal.action === "suspend" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {acting
                    ? statusModal.action === "suspend"
                      ? "Suspending…"
                      : "Reactivating…"
                    : statusModal.action === "suspend"
                      ? "Suspend"
                      : "Reactivate"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
