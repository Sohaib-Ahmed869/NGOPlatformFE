import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Paintbrush } from "lucide-react";
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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] } }),
};
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

const statusBadge = {
  pending: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  approved: "bg-green-50 text-green-700 ring-1 ring-green-200",
  rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

/* Extracted to module scope to avoid recreation on every render */
const ColorSwatch = ({ label, current, requested }) => (
  <div className="flex items-center gap-2.5 text-xs">
    <span className="w-20" style={{ color: V.inkFaint }}>{label}</span>
    <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: current, borderColor: V.line }} title={current} />
    <span style={{ color: V.inkFaint }}>→</span>
    <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: requested, borderColor: V.line }} title={requested} />
    <span style={{ fontFamily: mono, color: V.inkSoft }}>{requested}</span>
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
    try { const res = await superadminService.getBrandingRequests(filter); setRequests(res.data); }
    catch (err) { console.error("Failed to fetch branding requests:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const handleApprove = async (id) => {
    try { await superadminService.approveBrandingRequest(id, reviewNote); toast.success("Approved — branding applied"); setReviewModal(null); setReviewNote(""); fetchRequests(); }
    catch { toast.error("Failed to approve"); }
  };
  const handleReject = async (id) => {
    try { await superadminService.rejectBrandingRequest(id, reviewNote); toast.success("Rejected"); setReviewModal(null); setReviewNote(""); fetchRequests(); }
    catch { toast.error("Failed to reject"); }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: V.ink }}>Branding Requests</h1>
          <p className="text-sm mt-1" style={{ color: V.inkFaint }}>Review and approve branding change requests</p>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <motion.div variants={fadeUp} custom={1} className="flex gap-2 mb-6 relative">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all"
            style={filter === f ? {
              background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, color: "#fff",
              boxShadow: `0 0 16px rgba(124,58,237,.25), inset 0 1px 0 rgba(255,255,255,.15)`,
            } : {
              background: V.surface, color: V.inkSoft, border: `1px solid ${V.line}`,
            }}
            onMouseEnter={(e) => { if (filter !== f) e.currentTarget.style.borderColor = "rgba(124,58,237,.2)"; }}
            onMouseLeave={(e) => { if (filter !== f) e.currentTarget.style.borderColor = V.line; }}
          >{f}</button>
        ))}
      </motion.div>

      {loading ? <SALoader /> : requests.length === 0 ? (
        <motion.div variants={fadeUp} custom={2} className="rounded-xl p-16 text-center"
          style={{ background: V.surface, border: `1px solid ${V.line}` }}>
          <Paintbrush className="w-10 h-10 mx-auto mb-3" style={{ color: V.inkFaint }} />
          <p style={{ color: V.inkSoft }}>No {filter} branding requests</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {requests.map((req, i) => (
            <motion.div key={req._id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="rounded-xl p-5 transition-shadow hover:shadow-lg"
              style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl grid place-items-center"
                    style={{ background: `${V.primary}10`, border: `1px solid ${V.primary}20` }}>
                    <Paintbrush className="w-5 h-5" style={{ color: V.primary }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: V.ink }}>{req.organisationId?.name || "Unknown Org"}</h3>
                    <p className="text-[11px] mt-0.5" style={{ fontFamily: mono, color: V.inkFaint }}>
                      {req.organisationId?.slug} · {req.requestedBy?.name || req.requestedBy?.email} · {new Date(req.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full capitalize ${statusBadge[req.status] || ""}`}>{req.status}</span>
              </div>

              {/* Color comparison */}
              <div className="rounded-lg p-4 space-y-2.5 mb-4" style={{ background: V.bg, border: `1px solid ${V.line}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ fontFamily: mono, color: V.inkFaint }}>Requested Changes</p>
                {req.requestedBranding?.primaryColor && <ColorSwatch label="Primary" current={req.currentBranding?.primaryColor || "#2C2418"} requested={req.requestedBranding.primaryColor} />}
                {req.requestedBranding?.accentColor && <ColorSwatch label="Accent" current={req.currentBranding?.accentColor || "#C9A84C"} requested={req.requestedBranding.accentColor} />}
                {req.requestedBranding?.backgroundColor && <ColorSwatch label="Background" current={req.currentBranding?.backgroundColor || "#FAF7F2"} requested={req.requestedBranding.backgroundColor} />}
                {req.requestedBranding?.theme && (
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="w-20" style={{ color: V.inkFaint }}>Theme</span>
                    <span className="capitalize font-medium" style={{ color: V.ink }}>{req.requestedBranding.theme}</span>
                  </div>
                )}
              </div>

              {req.message && (
                <p className="text-sm italic rounded-lg p-3 mb-4" style={{ background: V.bg, border: `1px solid ${V.line}`, color: V.inkSoft }}>"{req.message}"</p>
              )}
              {req.reviewNote && (
                <p className="text-xs mb-4" style={{ color: V.inkFaint }}>Admin note: {req.reviewNote}</p>
              )}

              {req.status === "pending" && (
                <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${V.line}` }}>
                  <button onClick={() => { setReviewModal(req); setReviewNote(""); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => { setReviewModal(req); setReviewNote(""); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
                    <X className="w-3.5 h-3.5" /> Reject
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
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReviewModal(null)} />
            <motion.div className="relative rounded-xl p-6 max-w-md w-full"
              style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `0 24px 60px -12px rgba(15,23,42,.25)` }}
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <h3 className="text-lg font-semibold mb-1" style={{ color: V.ink }}>Review Request</h3>
              <p className="text-xs mb-4" style={{ fontFamily: mono, color: V.inkFaint }}>{reviewModal.organisationId?.name}</p>
              <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a note (optional)..." rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm mb-4 outline-none resize-none"
                style={{ background: V.bg, border: `1px solid ${V.line}`, color: V.ink }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(124,58,237,.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = V.line; e.target.style.boxShadow = "none"; }} />
              <div className="flex gap-3">
                <button onClick={() => setReviewModal(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: `1px solid ${V.line}`, color: V.ink }}>Cancel</button>
                <button onClick={() => handleReject(reviewModal._id)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">Reject</button>
                <button onClick={() => handleApprove(reviewModal._id)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: `linear-gradient(180deg, #059669, #047857)`, boxShadow: `0 0 16px rgba(5,150,105,.3)` }}>
                  Approve
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
