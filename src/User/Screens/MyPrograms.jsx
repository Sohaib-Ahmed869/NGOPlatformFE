import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Calendar, ChevronDown, ChevronUp, ExternalLink, MessageSquare, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import programService from "../../services/program.service";
import Loader from "../../components/Loader";
import toast from "react-hot-toast";

const statusBadge = {
  published: "bg-green-50 text-green-700 ring-1 ring-green-100",
  completed: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  hidden: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

export default function MyPrograms() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [requestModal, setRequestModal] = useState(null);
  const [requestMsg, setRequestMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { images: [], index: 0 }

  const openLightbox = (images, index) => setLightbox({ images, index });

  const fetchPrograms = async () => {
    try {
      const res = await programService.getMyDonated();
      setPrograms(res.data);
    } catch (err) {
      console.error("Failed to fetch my programs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrograms(); }, []);

  const handleRequestFollowUp = async () => {
    setSubmitting(true);
    try {
      await programService.requestFollowUp(requestModal._id, { message: requestMsg });
      toast.success("Follow-up request sent");
      setRequestModal(null);
      setRequestMsg("");
      fetchPrograms();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">My Programs</h1>
        <Link to="/programs"
          className="text-sm text-accent hover:text-accent/80 font-medium flex items-center gap-1">
          Browse all <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {programs.length === 0 ? (
        <motion.div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-primary font-semibold mb-1">No programs yet</p>
          <p className="text-sm text-text-muted mb-4">Donate to a program and track its progress here.</p>
          <Link to="/programs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
            Browse Programs
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {programs.map((program, i) => {
            const pct = program.goalAmount > 0
              ? Math.min(100, Math.round((program.raisedAmount / program.goalAmount) * 100))
              : 0;
            const isExpanded = expanded === program._id;
            const updates = program.followUpUpdates || [];
            const cover = program.images?.[program.coverImageIndex || 0];

            return (
              <motion.div key={program._id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}>

                {/* Cover image strip */}
                {cover && (
                  <img src={cover.url} alt={program.title} className="w-full h-32 object-cover" />
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link to={`/programs/${program._id}`}
                        className="text-base font-semibold text-primary hover:text-accent transition-colors">
                        {program.title}
                      </Link>
                      {program.description && (
                        <p className="text-sm text-text-muted mt-0.5 line-clamp-1">{program.description}</p>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full capitalize ml-3 flex-shrink-0 ${statusBadge[program.status]}`}>
                      {program.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span className="font-medium text-primary">${program.raisedAmount?.toLocaleString()} raised</span>
                      <span>of ${program.goalAmount?.toLocaleString()} — {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {updates.length > 0 && (
                      <button onClick={() => setExpanded(isExpanded ? null : program._id)}
                        className="flex items-center gap-1.5 text-xs text-accent font-medium hover:text-accent/80 transition-colors">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {updates.length} update{updates.length !== 1 ? "s" : ""}
                      </button>
                    )}

                    {program.status === "published" && (
                      <button
                        onClick={() => { setRequestModal(program); setRequestMsg(""); }}
                        disabled={program.hasPendingRequest}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          program.hasPendingRequest
                            ? "bg-gray-100 text-text-muted cursor-not-allowed"
                            : "bg-accent/10 text-accent hover:bg-accent/20"
                        }`}>
                        {program.hasPendingRequest ? (
                          <><Check className="w-3 h-3" /> Request Sent</>
                        ) : (
                          <><MessageSquare className="w-3 h-3" /> Request Follow-Up</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable updates */}
                <AnimatePresence>
                  {isExpanded && updates.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                      className="overflow-hidden">
                      <div className="px-5 pb-5 pt-1 border-t border-gray-50">
                        <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-3">Follow-up Updates</p>
                        <div className="space-y-3">
                          {[...updates].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)).map((update, j) => (
                            <div key={j} className="pl-4 border-l-2 border-accent/30">
                              <p className="text-sm text-primary leading-relaxed">{update.text}</p>
                              {update.images?.length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {update.images.map((img, k) => (
                                    <button key={k} onClick={() => openLightbox(update.images, k)} className="focus:outline-none">
                                      <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:ring-2 hover:ring-accent/40 transition-all cursor-zoom-in" />
                                    </button>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(update.sentAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
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

      {/* Image Lightbox — portaled to body to escape overflow clipping */}
      {createPortal(
        <AnimatePresence>
          {lightbox && (
            <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/85" onClick={() => setLightbox(null)} />
              <button onClick={() => setLightbox(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                <X className="w-5 h-5" />
              </button>
              {lightbox.images.length > 1 && (
                <>
                  <button onClick={() => setLightbox((l) => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length }))}
                    className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setLightbox((l) => ({ ...l, index: (l.index + 1) % l.images.length }))}
                    className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              <motion.img
                key={lightbox.index}
                src={lightbox.images[lightbox.index]}
                alt=""
                className="relative max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
              {lightbox.images.length > 1 && (
                <div className="absolute bottom-4 text-white/60 text-sm">
                  {lightbox.index + 1} / {lightbox.images.length}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Request Follow-Up Modal */}
      <AnimatePresence>
        {requestModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRequestModal(null)} />
            <motion.div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <h3 className="text-base font-semibold text-primary mb-1">Request Follow-Up</h3>
              <p className="text-xs text-text-muted mb-4">{requestModal.title}</p>
              <textarea value={requestMsg} onChange={(e) => setRequestMsg(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none"
                rows={3} placeholder="Optional message to the admin..." />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setRequestModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={handleRequestFollowUp} disabled={submitting}
                  className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {submitting ? "Sending..." : "Send Request"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
