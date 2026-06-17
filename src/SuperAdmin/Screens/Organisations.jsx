import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutGrid, List, Building2, Globe, Calendar, AlertTriangle } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAPageHeader from "../components/SAPageHeader";
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

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";
const inputCls =
  "w-full border border-gray-200 bg-white py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";

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

  const viewBtn = (v, Icon) => (
    <button
      type="button"
      onClick={() => setView(v)}
      className={`grid h-9 w-9 place-items-center transition-colors ${
        view === v ? "bg-accent text-white" : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
      }`}
      aria-label={`${v} view`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div>
      <SAPageHeader
        eyebrow="Tenants"
        title="Organisations"
        subtitle="Manage every registered organisation, plan and subscription."
        actions={
          <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10">
            {viewBtn("grid", LayoutGrid)}
            {viewBtn("table", List)}
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or slug…"
            className={`${inputCls} pl-10 pr-4`}
          />
        </div>
        {[
          { val: planFilter, set: setPlanFilter, opts: [["", "All Plans"], ["basic", "Basic"], ["professional", "Professional"], ["enterprise", "Enterprise"]] },
          { val: statusFilter, set: setStatusFilter, opts: [["", "All Status"], ["active", "Active"], ["pending", "Pending"], ["past_due", "Past Due"], ["cancelled", "Cancelled"]] },
        ].map((f, i) => (
          <SASelect key={i} value={f.val} onChange={(v) => f.set(v)} options={f.opts} />
        ))}
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
                return (
                  <motion.div
                    key={org._id}
                    className={`${card} group p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-xl text-sm font-bold uppercase" style={{ background: `${pc}14`, color: pc }}>
                        {org.name?.charAt(0)}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${statusStyles[org.subscriptionStatus] || statusStyles.pending}`}>
                        {org.subscriptionStatus}
                      </span>
                    </div>

                    <h3 className="mb-0.5 truncate text-sm font-semibold text-gray-900">{org.name}</h3>
                    <div className="mb-3 flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-gray-400" />
                      <span className="truncate font-mono text-[11px] text-gray-400">{org.slug}</span>
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: `${pc}14`, color: pc }}>
                        {org.plan}
                      </span>
                      {org.adminUserId?.email && (
                        <span className="max-w-[150px] truncate text-[10px] text-gray-400">{org.adminUserId.email}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(org.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/organisations/${org._id}`)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPlanModal(org);
                            setSelectedPlan(org.plan);
                          }}
                          className="rounded-md border border-accent/20 bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/20"
                        >
                          Change Plan
                        </button>
                        {org.subscriptionStatus !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => setSuspendModal(org)}
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-100"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
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
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-left">
                      {["Name", "Slug", "Plan", "Status", "Admin", "Created", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org) => (
                      <tr key={org._id} className="border-t border-gray-100 transition-colors hover:bg-gray-50/70">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{org.name}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{org.slug}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: `${planColors[org.plan] || "#10b981"}14`, color: planColors[org.plan] || "#10b981" }}>
                            {org.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${statusStyles[org.subscriptionStatus] || ""}`}>{org.subscriptionStatus}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{org.adminUserId?.email || "-"}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{new Date(org.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/organisations/${org._id}`)}
                              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                            >
                              Manage
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPlanModal(org);
                                setSelectedPlan(org.plan);
                              }}
                              className="rounded-md border border-accent/20 bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/20"
                            >
                              Change Plan
                            </button>
                            {org.subscriptionStatus !== "cancelled" && (
                              <button
                                type="button"
                                onClick={() => setSuspendModal(org)}
                                className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-100"
                              >
                                Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
