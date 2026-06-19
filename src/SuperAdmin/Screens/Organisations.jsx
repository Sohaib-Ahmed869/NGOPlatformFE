import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

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

export default function Organisations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [view, setView] = useState("grid"); // "grid" | "table"
  const [planModal, setPlanModal] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [suspendModal, setSuspendModal] = useState(null);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (planFilter) params.plan = planFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await superadminService.getOrganisations(params);
      setOrgs(res.data.organisations);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Failed to fetch organisations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, planFilter, statusFilter]);
  useEffect(() => {
    const t = setTimeout(fetchOrgs, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Platform-wide totals for the summary band (same source as the dashboard).
  useEffect(() => {
    superadminService
      .getBillingStats()
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  // Dynamic plans for the Change-Plan modal (falls back to the legacy tiers
  // if the Plan collection hasn't been seeded yet).
  useEffect(() => {
    superadminService
      .getPlans()
      .then((res) => setPlans((res.data.plans || []).filter((p) => !p.archivedAt && p.isActive !== false)))
      .catch(() => {});
  }, []);

  const handleSuspend = async () => {
    if (!suspendModal) return;
    try {
      await superadminService.suspendOrg(suspendModal._id);
      toast.success("Organisation suspended");
      setSuspendModal(null);
      fetchOrgs();
    } catch {
      toast.error("Failed to suspend");
    }
  };

  const handleChangePlan = async () => {
    if (!planModal || !selectedPlan) return;
    try {
      await superadminService.updateOrgPlan(planModal._id, selectedPlan);
      toast.success("Plan updated");
      setPlanModal(null);
      fetchOrgs();
    } catch {
      toast.error("Failed to update plan");
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
      {org.subscriptionStatus !== "cancelled" && (
        <button
          type="button"
          title="Suspend"
          aria-label="Suspend"
          onClick={() => setSuspendModal(org)}
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
        { label: "Total tenants", value: (totalOrgs ?? 0).toLocaleString(), icon: Building2, color: "#6366f1" },
        { label: "Active", value: (stats.activeSubscriptions || 0).toLocaleString(), icon: Activity, color: "#10b981" },
        {
          label: "Needs attention",
          value: (stats.failedPayments || 0).toLocaleString(),
          icon: AlertTriangle,
          color: stats.failedPayments > 0 ? "#ef4444" : "#10b981",
        },
        { label: "Monthly revenue", value: `$${Number(stats.mrr || 0).toLocaleString()}`, icon: DollarSign, color: "#f59e0b" },
      ]
    : [];

  // Match each org's plan code to its priced plan (for the card's price line).
  const planByCode = plans.reduce((m, p) => ((m[p.code] = p), m), {});

  return (
    // Sharp-corner variant of this screen: square every descendant's corners
    // (cards, pills, buttons, inputs, avatars, modals) for an angular look.
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
            placeholder="Search by name or slug…"
            className={`${inputCls} rounded-xl pl-10 pr-4`}
          />
        </div>
        {[
          { val: planFilter, set: setPlanFilter, opts: [["", "All Plans"], ["basic", "Basic"], ["professional", "Professional"], ["enterprise", "Enterprise"]] },
          { val: statusFilter, set: setStatusFilter, opts: [["", "All Status"], ["active", "Active"], ["pending", "Pending"], ["past_due", "Past Due"], ["cancelled", "Cancelled"]] },
        ].map((f, i) => (
          <SASelect key={i} value={f.val} onChange={(v) => f.set(v)} options={f.opts} />
        ))}
        {/* View toggle — moved out of the hero into the filter row */}
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {[["grid", LayoutGrid], ["table", List]].map(([v, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-label={`${v} view`}
              className={`grid h-10 w-10 place-items-center transition-colors ${
                view === v ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SALoader />
      ) : orgs.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No organisations found</p>
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
              {orgs.map((org, i) => {
                const pc = planColors[org.plan] || "#10b981";
                const planPrice = planByCode[org.plan]?.price?.monthly;
                return (
                  <motion.div
                    key={org._id}
                    className={`${card} group relative flex cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
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
                      {org.subscriptionStatus !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => setSuspendModal(org)}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
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
                    {orgs.map((org) => {
                      const pc = planColors[org.plan] || "#10b981";
                      return (
                        <tr key={org._id} className="border-t border-gray-100 transition-colors hover:bg-gray-50/70">
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
      {pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between px-1">
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
        </div>
      )}

      {/* Change Plan Modal */}
      <AnimatePresence>
        {planModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPlanModal(null)} />
            <motion.div
              className={`${card} relative w-full max-w-sm p-6 shadow-xl`}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
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
                <button type="button" onClick={() => setPlanModal(null)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">
                  Cancel
                </button>
                <button type="button" onClick={handleChangePlan} className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
                  Update
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suspend Confirmation Modal */}
      <AnimatePresence>
        {suspendModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSuspendModal(null)} />
            <motion.div
              className={`${card} relative w-full max-w-sm p-6 shadow-xl`}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-red-50 ring-1 ring-red-100">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">Suspend Organisation</h3>
              <p className="mb-6 text-center text-sm text-gray-500">
                Are you sure you want to suspend <strong className="text-gray-800">{suspendModal.name}</strong>? Their portal will be deactivated.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSuspendModal(null)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">
                  Cancel
                </button>
                <button type="button" onClick={handleSuspend} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                  Suspend
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
