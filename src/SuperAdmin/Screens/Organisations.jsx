import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutGrid, List, Building2, Globe, Calendar, ArrowUpRight, AlertTriangle } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const V = {
  ink: "#1A0D2E", inkSoft: "#5B4A7A", inkFaint: "#9D90B5",
  primary: "#7C3AED", primary2: "#6D28D9", accent: "#DB2777",
  surface: "#FFFFFF", surface2: "#F2EDF8", bg: "#F7F4FB",
  line: "rgba(28,15,55,.08)",
};
const mono = "'JetBrains Mono', monospace";

const planColors = { basic: "#0891B2", professional: "#7C3AED", enterprise: "#DB2777" };
const statusStyles = {
  active: "bg-green-50 text-green-700 ring-1 ring-green-200",
  pending: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  past_due: "bg-red-50 text-red-700 ring-1 ring-red-200",
  cancelled: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

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
    } catch (err) { console.error("Failed to fetch organisations:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(); }, [page, planFilter, statusFilter]);
  useEffect(() => { const t = setTimeout(fetchOrgs, 300); return () => clearTimeout(t); }, [search]);

  const handleSuspend = async () => {
    if (!suspendModal) return;
    try { await superadminService.suspendOrg(suspendModal._id); toast.success("Organisation suspended"); setSuspendModal(null); fetchOrgs(); }
    catch { toast.error("Failed to suspend"); }
  };

  const handleChangePlan = async () => {
    if (!planModal || !selectedPlan) return;
    try { await superadminService.updateOrgPlan(planModal._id, selectedPlan); toast.success("Plan updated"); setPlanModal(null); fetchOrgs(); }
    catch { toast.error("Failed to update plan"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: V.ink }}>Organisations</h1>
          <p className="text-sm mt-1" style={{ color: V.inkFaint }}>Manage all registered organisations</p>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${V.line}`, background: V.surface }}>
          <button onClick={() => setView("grid")}
            className="p-2 transition-colors" style={{ background: view === "grid" ? V.primary : "transparent", color: view === "grid" ? "#fff" : V.inkFaint }}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView("table")}
            className="p-2 transition-colors" style={{ background: view === "table" ? V.primary : "transparent", color: view === "table" ? "#fff" : V.inkFaint }}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: V.inkFaint }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or slug..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.ink }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(124,58,237,.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,.1)"; }}
            onBlur={(e) => { e.target.style.borderColor = V.line; e.target.style.boxShadow = "none"; }}
          />
        </div>
        {[
          { val: planFilter, set: setPlanFilter, opts: [["", "All Plans"], ["basic", "Basic"], ["professional", "Professional"], ["enterprise", "Enterprise"]] },
          { val: statusFilter, set: setStatusFilter, opts: [["", "All Status"], ["active", "Active"], ["pending", "Pending"], ["past_due", "Past Due"], ["cancelled", "Cancelled"]] },
        ].map((f, i) => (
          <select key={i} value={f.val} onChange={(e) => f.set(e.target.value)}
            className="px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.ink }}>
            {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {loading ? <SALoader /> : orgs.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
          <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: V.inkFaint }} />
          <p style={{ color: V.inkSoft }}>No organisations found</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === "grid" ? (
            /* ══ GRID VIEW ══ */
            <motion.div key="grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {orgs.map((org, i) => {
                const pc = planColors[org.plan] || V.primary;
                return (
                  <motion.div key={org._id}
                    className="rounded-xl p-5 relative overflow-hidden group"
                    style={{
                      background: `linear-gradient(135deg, rgba(255,255,255,.75), rgba(255,255,255,.45))`,
                      backdropFilter: "blur(20px) saturate(140%)",
                      border: `1px solid ${V.line}`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(15,23,42,.04), 0 8px 24px -8px rgba(15,23,42,.06)`,
                    }}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}>
                    {/* Soft glow */}
                    <div className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${pc}15, transparent 70%)` }} />

                    <div className="flex items-start justify-between mb-4 relative">
                      <div className="w-11 h-11 rounded-xl grid place-items-center"
                        style={{ background: `${pc}12`, border: `1px solid ${pc}25` }}>
                        <span className="text-sm font-bold uppercase" style={{ color: pc }}>{org.name?.charAt(0)}</span>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${statusStyles[org.subscriptionStatus] || statusStyles.pending}`}>
                        {org.subscriptionStatus}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold mb-0.5" style={{ color: V.ink }}>{org.name}</h3>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Globe className="w-3 h-3" style={{ color: V.inkFaint }} />
                      <span className="text-[11px]" style={{ fontFamily: mono, color: V.inkFaint }}>{org.slug}.platform.com</span>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: `${pc}12`, color: pc, border: `1px solid ${pc}25` }}>{org.plan}</span>
                      {org.adminUserId?.email && (
                        <span className="text-[10px] truncate max-w-[140px]" style={{ color: V.inkFaint }}>{org.adminUserId.email}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${V.line}` }}>
                      <div className="flex items-center gap-1 text-[10px]" style={{ fontFamily: mono, color: V.inkFaint }}>
                        <Calendar className="w-3 h-3" />
                        {new Date(org.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setPlanModal(org); setSelectedPlan(org.plan); }}
                          className="text-[10px] px-2 py-1 rounded-md font-medium transition-colors"
                          style={{ background: `${V.primary}10`, color: V.primary, border: `1px solid ${V.primary}20` }}>
                          Change Plan
                        </button>
                        {org.subscriptionStatus !== "cancelled" && (
                          <button onClick={() => setSuspendModal(org)}
                            className="text-[10px] px-2 py-1 rounded-md font-medium bg-red-50 text-red-600 border border-red-200 transition-colors hover:bg-red-100">
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
            /* ══ TABLE VIEW ══ */
            <motion.div key="table" className="rounded-xl overflow-hidden"
              style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: V.surface2 }}>
                      {["Name", "Slug", "Plan", "Status", "Admin", "Created", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: V.inkFaint }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org) => (
                      <tr key={org._id} className="transition-colors hover:bg-[#F2EDF8]/30" style={{ borderTop: `1px solid ${V.line}` }}>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: V.ink }}>{org.name}</td>
                        <td className="px-4 py-3 text-[11px]" style={{ fontFamily: mono, color: V.inkFaint }}>{org.slug}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                            style={{ background: `${planColors[org.plan] || V.primary}12`, color: planColors[org.plan] || V.primary }}>
                            {org.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${statusStyles[org.subscriptionStatus] || ""}`}>{org.subscriptionStatus}</span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: V.inkSoft }}>{org.adminUserId?.email || "-"}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: V.inkFaint }}>{new Date(org.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button onClick={() => { setPlanModal(org); setSelectedPlan(org.plan); }}
                              className="text-[10px] px-2 py-1 rounded-md font-medium"
                              style={{ background: `${V.primary}10`, color: V.primary, border: `1px solid ${V.primary}20` }}>
                              Change Plan
                            </button>
                            {org.subscriptionStatus !== "cancelled" && (
                              <button onClick={() => setSuspendModal(org)}
                                className="text-[10px] px-2 py-1 rounded-md font-medium bg-red-50 text-red-600 border border-red-200">
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
        <div className="flex items-center justify-between mt-6 px-1">
          <span className="text-xs" style={{ fontFamily: mono, color: V.inkFaint }}>
            Page {pagination.page} of {pagination.pages} · {pagination.total} total
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-40 transition-colors"
              style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.ink }}>Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.pages}
              className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-40 transition-colors"
              style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.ink }}>Next</button>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      <AnimatePresence>
        {planModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPlanModal(null)} />
            <motion.div className="relative rounded-xl p-6 max-w-sm w-full"
              style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `0 24px 60px -12px rgba(15,23,42,.25)` }}
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <h3 className="text-lg font-semibold mb-1" style={{ color: V.ink }}>Change Plan</h3>
              <p className="text-xs mb-4" style={{ color: V.inkFaint }}>{planModal.name}</p>
              <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg mb-4 text-sm outline-none"
                style={{ background: V.bg, border: `1px solid ${V.line}`, color: V.ink }}>
                <option value="basic">Basic — $29/mo</option>
                <option value="professional">Professional — $79/mo</option>
                <option value="enterprise">Enterprise — $199/mo</option>
              </select>
              <div className="flex gap-3">
                <button onClick={() => setPlanModal(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                  style={{ border: `1px solid ${V.line}`, color: V.ink }}>Cancel</button>
                <button onClick={handleChangePlan}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 0 16px rgba(124,58,237,.3)` }}>
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
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSuspendModal(null)} />
            <motion.div className="relative rounded-xl p-6 max-w-sm w-full"
              style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `0 24px 60px -12px rgba(15,23,42,.25)` }}
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="w-12 h-12 rounded-xl mx-auto mb-4 grid place-items-center"
                style={{ background: "rgba(220,38,38,.1)", border: "1px solid rgba(220,38,38,.2)" }}>
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-1" style={{ color: V.ink }}>Suspend Organisation</h3>
              <p className="text-sm text-center mb-6" style={{ color: V.inkSoft }}>
                Are you sure you want to suspend <strong>{suspendModal.name}</strong>? Their portal will be deactivated.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setSuspendModal(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50"
                  style={{ border: `1px solid ${V.line}`, color: V.ink }}>Cancel</button>
                <button onClick={handleSuspend}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors hover:bg-red-700"
                  style={{ background: "#DC2626", boxShadow: "0 0 16px rgba(220,38,38,.25)" }}>
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
