import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Search, Megaphone, Clock, CheckCircle, DollarSign, TrendingUp, User, Calendar,
  AlertTriangle, Eye, Users, BarChart3, X, Check, XCircle, Loader2, Trash2,
  ChevronLeft, ChevronRight, ExternalLink, Mail, CreditCard,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import Portal from "../../components/Portal";
import { cn } from "../../utils/cn";
import GoFundMeService from "../../services/goFundMeService";
import GoFundMeAnalytics from "./goFundMeAnalytics";

const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  completed: "bg-blue-50 text-blue-700",
  deactivated: "bg-gray-100 text-gray-600",
};
const URGENCY = { low: "text-emerald-600", medium: "text-amber-600", high: "text-orange-600", critical: "text-red-600" };

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border border-gray-100 bg-white p-3.5 shadow-sm">
      <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent"><Icon className="h-[18px] w-[18px]" /></span>
      <div className="min-w-0"><p className="truncate text-lg font-bold leading-none text-primary">{value}</p><p className="mt-1 text-xs text-text-muted">{label}</p></div>
    </div>
  );
}

const GoFundMeAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const [reviewing, setReviewing] = useState(null); // campaign in review modal
  const [action, setAction] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [donorsFor, setDonorsFor] = useState(null);
  const [donors, setDonors] = useState(null);

  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        GoFundMeService.getAdminRequests({ status: filter, page, limit: 10, search }),
        GoFundMeService.getAdminStats(),
      ]);
      setRequests(r.goFundMes || []);
      setPagination(r.pagination || {});
      setStats(s.stats || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  useEffect(() => {
    const t = setTimeout(fetchAll, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchAll, search]);

  useEffect(() => { setPage(1); }, [filter, search]);

  const openReview = (c, a = "") => { setReviewing(c); setAction(a); setNotes(c.adminNotes || ""); };
  const submitReview = async () => {
    if (!action) return toast.error("Choose approve or reject");
    if (action === "rejected" && !notes.trim()) return toast.error("Please provide a reason for rejection");
    setSubmitting(true);
    try {
      await GoFundMeService.reviewRequest(reviewing._id, { status: action, adminNotes: notes.trim() });
      toast.success(`Fundraiser ${action}`);
      setReviewing(null); setAction(""); setNotes("");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to review");
    } finally {
      setSubmitting(false);
    }
  };

  const openDonors = async (c) => {
    setDonorsFor(c); setDonors(null);
    try { const r = await GoFundMeService.getCampaignDonors(c._id); setDonors(r.donors || []); }
    catch { setDonors([]); }
  };

  const openAnalytics = async (c) => {
    setAnalyticsOpen(true); setAnalytics(null); setAnalyticsLoading(true);
    try { setAnalytics(await GoFundMeService.getCampaignAnalytics(c._id)); }
    catch { toast.error("Failed to load analytics"); }
    finally { setAnalyticsLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await GoFundMeService.remove(deleteTarget._id);
      toast.success("Fundraiser deleted");
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading && requests.length === 0) {
    return <div className="flex h-[60vh] items-center justify-center"><TabLoader label="Loading fundraisers…" /></div>;
  }

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-primary">P2P Campaigns</h1>
        <p className="mt-1 text-sm text-text-muted">Review and manage supporter-created fundraisers.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Megaphone} label="Total requests" value={stats.totalRequests || 0} />
        <StatCard icon={Clock} label="Pending review" value={stats.pendingRequests || 0} />
        <StatCard icon={CheckCircle} label="Approved" value={stats.approvedCampaigns || 0} />
        <StatCard icon={TrendingUp} label="Total raised (net)" value={money(stats.totalAmountRaised)} />
      </div>

      <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or category…" className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-accent focus:bg-white" />
        </div>
        <CustomSelect
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All status" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "completed", label: "Completed" },
          ]}
          triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          className="sm:min-w-[150px]"
        />
      </div>

      {requests.length === 0 ? (
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <p className="text-text-muted">No fundraisers match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((c) => (
            <div key={c._id} className="flex flex-col gap-4 border border-gray-100 bg-white p-4 shadow-sm lg:flex-row">
              <img src={c.image} alt="" className="h-24 w-full shrink-0 rounded object-cover lg:w-32" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-primary">{c.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {c.userId?.name || "Unknown"}</span>
                      <span className="inline-flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {money(c.targetAmount)}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(c.createdAt).toLocaleDateString()}</span>
                      <span className={cn("inline-flex items-center gap-1 font-medium", URGENCY[c.urgencyLevel])}><AlertTriangle className="h-3.5 w-3.5" /> {c.urgencyLevel}</span>
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize", STATUS_BADGE[c.status])}>{c.status}</span>
                </div>
                <p className="line-clamp-2 text-sm text-text-muted">{c.description}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="bg-gray-100 px-2 py-0.5 text-gray-700">{c.category}</span>
                  {c.status === "approved" && <span className="bg-emerald-50 px-2 py-0.5 text-emerald-700">Raised: {money(c.currentAmount)}</span>}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => openReview(c)} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><Eye className="h-3.5 w-3.5" /> Details</button>
                  {(c.status === "approved" || c.status === "completed") && (
                    <>
                      <button onClick={() => openDonors(c)} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><Users className="h-3.5 w-3.5" /> Donors</button>
                      <button onClick={() => openAnalytics(c)} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><BarChart3 className="h-3.5 w-3.5" /> Analytics</button>
                    </>
                  )}
                  {c.status === "pending" && (
                    <>
                      <button onClick={() => openReview(c, "approved")} className="inline-flex items-center gap-1.5 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"><Check className="h-3.5 w-3.5" /> Approve</button>
                      <button onClick={() => openReview(c, "rejected")} className="inline-flex items-center gap-1.5 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                    </>
                  )}
                  {c.status === "approved" && (
                    <a href={`/p2p-campaigns/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><ExternalLink className="h-3.5 w-3.5" /> View live</a>
                  )}
                  <button onClick={() => setDeleteTarget(c)} className="inline-flex items-center gap-1.5 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                </div>
                {c.adminNotes && <p className="mt-1 bg-gray-50 p-2 text-xs text-text-muted"><strong className="text-primary">Notes:</strong> {c.adminNotes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex items-center gap-1 border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Prev</button>
          <span className="px-2 text-sm text-text-muted">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="inline-flex items-center gap-1 border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {/* Review / details modal */}
      <Portal>
        <AnimatePresence>
          {reviewing && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && setReviewing(null)} />
              <motion.div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl" initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
                  <h3 className="text-base font-semibold text-primary">Review fundraiser</h3>
                  <button onClick={() => setReviewing(null)} className="grid h-8 w-8 place-items-center text-text-muted hover:bg-gray-100"><X className="h-4 w-4" /></button>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                  <img src={reviewing.image} alt="" className="aspect-video w-full rounded object-cover" />
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-text-muted">Title:</span> <span className="font-medium text-primary">{reviewing.title}</span></div>
                    <div><span className="text-text-muted">Category:</span> {reviewing.category}{reviewing.customCategory ? ` (${reviewing.customCategory})` : ""}</div>
                    <div><span className="text-text-muted">Goal:</span> {money(reviewing.targetAmount)}</div>
                    <div><span className="text-text-muted">Urgency:</span> <span className={URGENCY[reviewing.urgencyLevel]}>{reviewing.urgencyLevel}</span></div>
                    <div><span className="text-text-muted">By:</span> {reviewing.userId?.name} ({reviewing.userId?.email})</div>
                    <div><span className="text-text-muted">Raised:</span> {money(reviewing.currentAmount)}</div>
                  </div>
                  {[["Description", reviewing.description], ["Personal story", reviewing.personalStory], ["Financial situation", reviewing.financialSituation], ["Reason for funding", reviewing.reasonForFunding]].map(([h, b]) => (
                    <div key={h}>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">{h}</p>
                      <p className="whitespace-pre-line bg-gray-50 p-3 text-sm text-gray-700">{b}</p>
                    </div>
                  ))}

                  {reviewing.status === "pending" && (
                    <div className="space-y-3 border-t border-gray-100 pt-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-primary">Decision</label>
                        <CustomSelect value={action} onChange={setAction} options={[{ value: "", label: "Select…" }, { value: "approved", label: "Approve" }, { value: "rejected", label: "Reject" }]} triggerClassName="w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-primary">Notes {action === "rejected" && <span className="text-red-500">*</span>}</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full resize-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent" placeholder={action === "rejected" ? "Reason for rejection (emailed to the supporter)…" : "Optional notes for the supporter…"} />
                      </div>
                    </div>
                  )}
                </div>
                {reviewing.status === "pending" && (
                  <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button onClick={() => setReviewing(null)} disabled={submitting} className="border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                    <button onClick={submitReview} disabled={submitting || !action} className="inline-flex items-center gap-2 bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Submit review
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Donors modal */}
      <Portal>
        <AnimatePresence>
          {donorsFor && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDonorsFor(null)} />
              <motion.div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl" initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
                  <div><h3 className="text-base font-semibold text-primary">Donors</h3><p className="truncate text-xs text-text-muted">{donorsFor.title}</p></div>
                  <button onClick={() => setDonorsFor(null)} className="grid h-8 w-8 place-items-center text-text-muted hover:bg-gray-100"><X className="h-4 w-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {donors === null ? (
                    <div className="flex h-24 items-center justify-center text-text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : donors.length === 0 ? (
                    <p className="py-8 text-center text-sm text-text-muted">No donations yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-text-muted"><th className="px-3 py-2">Donor</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Method</th><th className="px-3 py-2">Date</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {donors.map((d, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">
                              <p className="font-medium text-primary">{d.isAnonymous ? "Anonymous" : d.donorName}</p>
                              {!d.isAnonymous && <p className="flex items-center gap-1 text-xs text-text-muted"><Mail className="h-3 w-3" /> {d.donorEmail}</p>}
                            </td>
                            <td className="px-3 py-2"><span className="font-semibold text-emerald-600">${d.amount.toFixed(2)}</span><p className="text-xs text-text-muted">net ${d.netAmount.toFixed(2)}</p></td>
                            <td className="px-3 py-2"><span className="inline-flex items-center gap-1 capitalize text-text-muted"><CreditCard className="h-3.5 w-3.5" /> {d.paymentMethod}</span></td>
                            <td className="px-3 py-2 text-text-muted">{new Date(d.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Analytics */}
      <GoFundMeAnalytics open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} loading={analyticsLoading} data={analytics} />

      {/* Delete confirm */}
      <Portal>
        <AnimatePresence>
          {deleteTarget && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
              <motion.div className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl" initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50"><Trash2 className="h-5 w-5 text-red-500" /></div>
                <h3 className="text-base font-semibold text-primary">Delete this fundraiser?</h3>
                <p className="mt-1 text-sm text-text-muted"><span className="font-medium text-primary">{deleteTarget.title}</span> will be permanently removed. Donation records are kept.</p>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleDelete} className="flex-1 bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600">Delete</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
};

export default GoFundMeAdmin;
