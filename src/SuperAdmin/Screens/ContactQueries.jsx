import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Clock, CheckCircle, Eye, ChevronDown, Send } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const V = {
  ink: "#102A23", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "#047857", primary2: "#065F46", accent: "#F59E0B",
  surface: "#FFFFFF", surface2: "#E7F2EC", bg: "#F3F8F5",
  line: "rgba(6,40,30,.08)",
};
const mono = "'JetBrains Mono', monospace";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] } }),
};
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

const statusConfig = {
  new: { label: "New", bg: "bg-blue-50", text: "text-blue-700", icon: Mail },
  read: { label: "Read", bg: "bg-yellow-50", text: "text-yellow-700", icon: Eye },
  replied: { label: "Replied", bg: "bg-green-50", text: "text-green-700", icon: CheckCircle },
};

export default function ContactQueries() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(null);

  const fetchQueries = async () => {
    try {
      const res = await superadminService.getContactQueries(filter);
      setQueries(res.data.queries);
    } catch (err) {
      console.error("Failed to fetch queries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); fetchQueries(); }, [filter]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await superadminService.updateContactQueryStatus(id, { status, adminNote: note });
      toast.success(`Marked as ${status}`);
      setNote("");
      fetchQueries();
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const filters = ["all", "new", "read", "replied"];

  if (loading) {
    return <SALoader />;
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-2xl font-medium" style={{ color: V.ink }}>Contact Queries</h1>
        <p className="text-sm mt-1" style={{ color: V.inkFaint }}>Messages from the public contact form</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} custom={1} className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all"
            style={filter === f ? {
              background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, color: "#fff",
              boxShadow: `0 0 16px rgba(4,120,87,.25), inset 0 1px 0 rgba(255,255,255,.15)`,
            } : {
              background: V.surface, color: V.inkSoft, border: `1px solid ${V.line}`,
            }}
            onMouseEnter={(e) => { if (filter !== f) e.currentTarget.style.borderColor = "rgba(4,120,87,.2)"; }}
            onMouseLeave={(e) => { if (filter !== f) e.currentTarget.style.borderColor = V.line; }}>
            {f}
          </button>
        ))}
      </motion.div>

      {queries.length === 0 ? (
        <motion.div variants={fadeUp} custom={2} className="text-center py-16 rounded-xl"
          style={{ background: V.surface, border: `1px solid ${V.line}` }}>
          <Mail className="w-10 h-10 mx-auto mb-3" style={{ color: V.inkFaint }} />
          <p className="text-sm" style={{ color: V.inkSoft }}>No {filter === "all" ? "" : filter} queries found</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {queries.map((q, qi) => {
            const sc = statusConfig[q.status];
            const isExpanded = expanded === q._id;
            return (
              <motion.div key={q._id} layout className="rounded-xl overflow-hidden transition-shadow hover:shadow-lg"
                style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: qi * 0.05, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}>
                {/* Header row */}
                <button className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
                  onClick={() => { setExpanded(isExpanded ? null : q._id); setNote(q.adminNote || ""); }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-sm text-[#102A23] truncate">{q.name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg} ${sc.text}`}>
                        <sc.icon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#46685C]">
                      <span>{q.email}</span>
                      <span>·</span>
                      <span>{q.subject}</span>
                    </div>
                  </div>
                  <div className="text-xs text-[#8AA89C] whitespace-nowrap">
                    {new Date(q.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[#8AA89C] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden">
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                        {/* Message */}
                        <div className="bg-[#E7F2EC] rounded-lg p-4 mb-4">
                          <p className="text-xs font-medium text-[#8AA89C] uppercase tracking-wider mb-2">Message</p>
                          <p className="text-sm text-[#102A23] leading-relaxed whitespace-pre-wrap">{q.message}</p>
                        </div>

                        {/* Admin note */}
                        <div className="mb-4">
                          <label className="text-xs font-medium text-[#8AA89C] uppercase tracking-wider mb-2 block">Admin Note</label>
                          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#047857]/20 focus:border-[#047857] resize-none"
                            placeholder="Add an internal note..." />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {q.status !== "read" && (
                            <button onClick={() => updateStatus(q._id, "read")} disabled={updating === q._id}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50">
                              <Eye className="w-3.5 h-3.5" /> Mark as Read
                            </button>
                          )}
                          {q.status !== "replied" && (
                            <button onClick={() => updateStatus(q._id, "replied")} disabled={updating === q._id}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50">
                              <Send className="w-3.5 h-3.5" /> Mark as Replied
                            </button>
                          )}
                          {q.status !== "new" && (
                            <button onClick={() => updateStatus(q._id, "new")} disabled={updating === q._id}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50">
                              <Mail className="w-3.5 h-3.5" /> Mark as New
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
