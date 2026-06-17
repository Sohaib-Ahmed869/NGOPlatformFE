import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Paintbrush } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAPageHeader from "../components/SAPageHeader";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";

const statusBadge = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

function tabClass(active) {
  return `rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
    active
      ? "bg-accent text-white"
      : "border border-gray-200 bg-white text-gray-600 hover:border-accent/40 hover:text-accent dark:border-white/10"
  }`;
}

const ColorSwatch = ({ label, current, requested }) => (
  <div className="flex items-center gap-2.5 text-xs">
    <span className="w-20 text-gray-400">{label}</span>
    <div className="h-6 w-6 rounded-md border border-gray-200" style={{ backgroundColor: current }} title={current} />
    <span className="text-gray-400">→</span>
    <div className="h-6 w-6 rounded-md border border-gray-200" style={{ backgroundColor: requested }} title={requested} />
    <span className="font-mono text-gray-600">{requested}</span>
  </div>
);

export default function BrandingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNote, setReviewNote] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await superadminService.getBrandingRequests(filter);
      setRequests(res.data);
    } catch (err) {
      console.error("Failed to fetch branding requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleApprove = async (id) => {
    try {
      await superadminService.approveBrandingRequest(id, reviewNote);
      toast.success("Approved — branding applied");
      setReviewModal(null);
      setReviewNote("");
      fetchRequests();
    } catch {
      toast.error("Failed to approve");
    }
  };
  const handleReject = async (id) => {
    try {
      await superadminService.rejectBrandingRequest(id, reviewNote);
      toast.success("Rejected");
      setReviewModal(null);
      setReviewNote("");
      fetchRequests();
    } catch {
      toast.error("Failed to reject");
    }
  };

  return (
    <div>
      <SAPageHeader eyebrow="Theming" title="Branding Requests" subtitle="Review and approve organisations' branding change requests." />

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={tabClass(filter === f)}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <SALoader />
      ) : requests.length === 0 ? (
        <div className={`${card} p-16 text-center`}>
          <Paintbrush className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No {filter} branding requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req, i) => (
            <motion.div
              key={req._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
              className={`${card} p-5 transition-shadow hover:shadow-lg hover:shadow-black/5`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Paintbrush className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">{req.organisationId?.name || "Unknown Org"}</h3>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400">
                      {req.organisationId?.slug} · {req.requestedBy?.name || req.requestedBy?.email} ·{" "}
                      {new Date(req.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${statusBadge[req.status] || ""}`}>{req.status}</span>
              </div>

              {/* Color comparison */}
              <div className="mb-4 space-y-2.5 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">Requested Changes</p>
                {req.requestedBranding?.primaryColor && <ColorSwatch label="Primary" current={req.currentBranding?.primaryColor || "#2C2418"} requested={req.requestedBranding.primaryColor} />}
                {req.requestedBranding?.accentColor && <ColorSwatch label="Accent" current={req.currentBranding?.accentColor || "#C9A84C"} requested={req.requestedBranding.accentColor} />}
                {req.requestedBranding?.backgroundColor && <ColorSwatch label="Background" current={req.currentBranding?.backgroundColor || "#FAF7F2"} requested={req.requestedBranding.backgroundColor} />}
                {req.requestedBranding?.theme && (
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="w-20 text-gray-400">Theme</span>
                    <span className="font-medium capitalize text-gray-800">{req.requestedBranding.theme}</span>
                  </div>
                )}
              </div>

              {req.message && (
                <p className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm italic text-gray-600">"{req.message}"</p>
              )}
              {req.reviewNote && <p className="mb-4 text-xs text-gray-400">Admin note: {req.reviewNote}</p>}

              {req.status === "pending" && (
                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewModal(req);
                      setReviewNote("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewModal(req);
                      setReviewNote("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Review modal */}
      <AnimatePresence>
        {reviewModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReviewModal(null)} />
            <motion.div
              className={`${card} relative w-full max-w-md p-6 shadow-xl`}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <h3 className="mb-1 text-lg font-semibold text-gray-900">Review Request</h3>
              <p className="mb-4 font-mono text-xs text-gray-400">{reviewModal.organisationId?.name}</p>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a note (optional)…"
                rows={3}
                className="mb-4 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setReviewModal(null)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">
                  Cancel
                </button>
                <button type="button" onClick={() => handleReject(reviewModal._id)} className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100">
                  Reject
                </button>
                <button type="button" onClick={() => handleApprove(reviewModal._id)} className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
                  Approve
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
