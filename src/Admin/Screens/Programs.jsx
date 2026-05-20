import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, MessageSquare, Image as ImageIcon, X, Upload, Star, Bell, Check, Users, Target } from "lucide-react";
import programService from "../../services/program.service";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";

const statusColors = {
  published: "bg-green-50 text-green-700 ring-1 ring-green-200",
  hidden: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  completed: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4 } }),
};

// ── Image Upload Zone ──────────────────────────────────
function ImageUploadZone({ images, onAdd, onRemove, onSetCover, coverIndex, maxImages = 5 }) {
  const inputRef = useRef(null);
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 mb-2">
        {images.map((img, i) => (
          <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
            <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button type="button" onClick={() => onSetCover(i)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${coverIndex === i ? "bg-accent" : "bg-white/30 hover:bg-white/50"}`}
                title="Set as cover">
                <Star className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => onRemove(i)}
                className="w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
            {coverIndex === i && (
              <span className="absolute top-1 left-1 text-[9px] bg-accent text-white px-1.5 py-0.5 rounded font-medium">Cover</span>
            )}
          </div>
        ))}
        {images.length < maxImages && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-text-muted hover:border-accent/40 hover:text-accent transition-colors">
            <Upload className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Add</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { onAdd(Array.from(e.target.files)); e.target.value = ""; }} />
      <p className="text-[10px] text-text-muted">{images.length}/{maxImages} images. First image is cover by default.</p>
    </div>
  );
}

// ── Modal Wrapper ──────────────────────────────────────
function Modal({ children, onClose, title }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-primary font-heading">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ── Main ───────────────────────────────────────────────
export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [requests, setRequests] = useState([]);

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [followUpModal, setFollowUpModal] = useState(null);
  const [requestsPanel, setRequestsPanel] = useState(false);

  // Create form
  const [form, setForm] = useState({ title: "", description: "", goalAmount: "", status: "published" });
  const [formImages, setFormImages] = useState([]);
  const [formCover, setFormCover] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Follow-up form
  const [fuText, setFuText] = useState("");
  const [fuImages, setFuImages] = useState([]);

  const fetchPrograms = async () => {
    try {
      const res = await programService.getAll({ admin: "true" });
      setPrograms(res.data);
    } catch { toast.error("Failed to load programs"); }
    finally { setLoading(false); }
  };

  const fetchRequests = async () => {
    try {
      const res = await programService.getFollowUpRequests();
      setRequests(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchPrograms(); fetchRequests(); }, []);

  const filtered = filter === "all" ? programs : programs.filter((p) => p.status === filter);
  const pendingCount = requests.length;

  // ── Image helpers ────────────────────────────────────
  const addLocalImages = (files, setter) => {
    const newImgs = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setter((prev) => [...prev, ...newImgs].slice(0, 5));
  };

  const removeLocalImage = (idx, setter) => {
    setter((prev) => {
      const copy = [...prev];
      if (copy[idx]?.preview) URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      return copy;
    });
  };

  // ── Create ───────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title || !form.goalAmount) { toast.error("Title and goal amount are required"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("goalAmount", form.goalAmount);
      fd.append("status", form.status);
      formImages.forEach((img) => fd.append("images", img.file));
      await programService.create(fd);
      toast.success("Program created");
      setCreateModal(false);
      setForm({ title: "", description: "", goalAmount: "", status: "published" });
      setFormImages([]);
      setFormCover(0);
      fetchPrograms();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to create"); }
    finally { setSubmitting(false); }
  };

  // ── Edit ─────────────────────────────────────────────
  const openEdit = (prog) => {
    setEditModal(prog);
    setForm({
      title: prog.title,
      description: prog.description || "",
      goalAmount: String(prog.goalAmount),
      status: prog.status,
    });
    setFormImages((prog.images || []).map((img) => ({ url: img.url, key: img.key })));
    setFormCover(prog.coverImageIndex || 0);
  };

  const handleEdit = async () => {
    if (!form.title || !form.goalAmount) { toast.error("Title and goal amount are required"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("goalAmount", form.goalAmount);
      fd.append("status", form.status);
      fd.append("coverImageIndex", String(formCover));

      // Determine removed images (existing images that are no longer in the list)
      const existingKeys = (editModal.images || []).map((i) => i.key);
      const currentKeys = formImages.filter((i) => i.key).map((i) => i.key);
      const removed = existingKeys.filter((k) => !currentKeys.includes(k));
      if (removed.length) fd.append("removedImageKeys", JSON.stringify(removed));

      // Append new files
      formImages.filter((i) => i.file).forEach((img) => fd.append("images", img.file));

      await programService.update(editModal._id, fd);
      toast.success("Program updated");
      setEditModal(null);
      setFormImages([]);
      fetchPrograms();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to update"); }
    finally { setSubmitting(false); }
  };

  // ── Follow-up ────────────────────────────────────────
  const handleFollowUp = async () => {
    if (!fuText.trim()) { toast.error("Update text is required"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("text", fuText);
      fuImages.forEach((img) => fd.append("images", img.file));
      await programService.postFollowUp(followUpModal._id, fd);
      toast.success("Update posted & donors notified");
      setFollowUpModal(null);
      setFuText("");
      setFuImages([]);
      fetchPrograms();
      fetchRequests();
    } catch { toast.error("Failed to post update"); }
    finally { setSubmitting(false); }
  };

  // ── Acknowledge request ──────────────────────────────
  const handleAcknowledge = async (programId, requestId) => {
    try {
      await programService.acknowledgeRequest(programId, requestId);
      toast.success("Request acknowledged");
      fetchRequests();
    } catch { toast.error("Failed"); }
  };

  if (loading) return <Loader />;

  return (
    <motion.div initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Programs</h1>
          <p className="text-sm text-text-muted mt-0.5">{programs.length} total programs</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setRequestsPanel(true)}
            className="relative px-3 py-2 border border-gray-200 rounded-lg text-sm text-primary hover:bg-gray-50 flex items-center gap-1.5">
            <Bell className="w-4 h-4" />
            Requests
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button onClick={() => { setCreateModal(true); setForm({ title: "", description: "", goalAmount: "", status: "published" }); setFormImages([]); setFormCover(0); }}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Plus className="w-4 h-4" /> New Program
          </button>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <motion.div variants={fadeUp} custom={1} className="flex gap-2 mb-6">
        {["all", "published", "hidden", "completed"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === f
                ? "bg-accent text-white shadow-md"
                : "bg-white text-text-muted border border-gray-200 hover:border-accent/30"
            }`}>
            {f}
          </button>
        ))}
      </motion.div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <motion.div variants={fadeUp} custom={2} className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Target className="w-10 h-10 mx-auto mb-3 text-text-muted" />
          <p className="text-text-muted mb-4">No {filter === "all" ? "" : filter} programs</p>
          <button onClick={() => setCreateModal(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm">Create a program</button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((prog, i) => {
            const pct = prog.goalAmount > 0 ? Math.min(100, Math.round((prog.raisedAmount / prog.goalAmount) * 100)) : 0;
            const cover = prog.images?.[prog.coverImageIndex || 0];
            return (
              <motion.div key={prog._id} variants={fadeUp} custom={i * 0.5}
                initial="hidden" animate="visible"
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Cover image or gradient */}
                {cover ? (
                  <img src={cover.url} alt={prog.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="h-2 bg-gradient-to-r from-accent to-accent-light" />
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-primary text-sm leading-tight">{prog.title}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize flex-shrink-0 ml-2 ${statusColors[prog.status]}`}>
                      {prog.status}
                    </span>
                  </div>

                  {prog.description && (
                    <p className="text-xs text-text-muted line-clamp-2 mb-3">{prog.description}</p>
                  )}

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[11px] text-text-muted mb-1">
                      <span className="font-medium text-primary">${prog.raisedAmount?.toLocaleString()}</span>
                      <span>${prog.goalAmount?.toLocaleString()} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[11px] text-text-muted mb-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{prog.donorCount} donors</span>
                    {prog.images?.length > 0 && <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" />{prog.images.length}</span>}
                    {prog.pendingRequests > 0 && (
                      <span className="flex items-center gap-1 text-red-500 font-medium"><Bell className="w-3 h-3" />{prog.pendingRequests}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    <button onClick={() => openEdit(prog)}
                      className="flex-1 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 text-primary hover:bg-gray-50 flex items-center justify-center gap-1">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    {prog.status !== "completed" && (
                      <button onClick={() => { setFollowUpModal(prog); setFuText(""); setFuImages([]); }}
                        className="flex-1 py-1.5 text-[11px] font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 flex items-center justify-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Update
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {/* ── Create Modal ─────────────────────────────── */}
        {createModal && (
          <Modal title="New Program" onClose={() => setCreateModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                  placeholder="e.g., Build a Well" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none"
                  rows={3} placeholder="Describe your program..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Goal Amount ($) *</label>
                  <input type="number" value={form.goalAmount} onChange={(e) => setForm((f) => ({ ...f, goalAmount: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                    placeholder="5000" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none">
                    <option value="published">Published</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Images</label>
                <ImageUploadZone images={formImages} coverIndex={formCover}
                  onAdd={(files) => addLocalImages(files, setFormImages)}
                  onRemove={(idx) => { removeLocalImage(idx, setFormImages); if (formCover >= formImages.length - 1) setFormCover(0); }}
                  onSetCover={setFormCover} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCreateModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={handleCreate} disabled={submitting}
                className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {submitting ? "Creating..." : "Create Program"}
              </button>
            </div>
          </Modal>
        )}

        {/* ── Edit Modal ───────────────────────────────── */}
        {editModal && (
          <Modal title={`Edit: ${editModal.title}`} onClose={() => setEditModal(null)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none"
                  rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Goal Amount ($) *</label>
                  <input type="number" value={form.goalAmount} onChange={(e) => setForm((f) => ({ ...f, goalAmount: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                    disabled={editModal.status === "completed"}>
                    <option value="published">Published</option>
                    <option value="hidden">Hidden</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Images</label>
                <ImageUploadZone images={formImages} coverIndex={formCover}
                  onAdd={(files) => addLocalImages(files, setFormImages)}
                  onRemove={(idx) => { removeLocalImage(idx, setFormImages); if (formCover >= formImages.length - 1) setFormCover(0); }}
                  onSetCover={setFormCover} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={handleEdit} disabled={submitting}
                className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </Modal>
        )}

        {/* ── Follow-Up Modal ──────────────────────────── */}
        {followUpModal && (
          <Modal title={`Update: ${followUpModal.title}`} onClose={() => setFollowUpModal(null)}>
            <p className="text-xs text-text-muted mb-4">
              This update will be emailed to all {followUpModal.donorCount} donors.
            </p>
            <textarea value={fuText} onChange={(e) => setFuText(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none mb-4"
              rows={4} placeholder="Share progress with donors..." />
            <label className="block text-sm font-medium text-primary mb-2">Attach Images (optional)</label>
            <ImageUploadZone images={fuImages} coverIndex={0}
              onAdd={(files) => addLocalImages(files, setFuImages)}
              onRemove={(idx) => removeLocalImage(idx, setFuImages)}
              onSetCover={() => {}} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setFollowUpModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={handleFollowUp} disabled={submitting}
                className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {submitting ? "Posting..." : "Post & Notify Donors"}
              </button>
            </div>
          </Modal>
        )}

        {/* ── Follow-Up Requests Panel ─────────────────── */}
        {requestsPanel && (
          <Modal title={`Follow-Up Requests (${pendingCount})`} onClose={() => setRequestsPanel(false)}>
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                <p className="text-sm text-text-muted">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {requests.map((r) => (
                  <div key={r.requestId} className="p-3 bg-background rounded-xl border border-gray-100">
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <p className="text-sm font-medium text-primary">{r.user?.name || r.user?.email || "Donor"}</p>
                        <p className="text-[11px] text-text-muted">{r.programTitle}</p>
                      </div>
                      <button onClick={() => handleAcknowledge(r.programId, r.requestId)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-accent/10 text-accent rounded-lg hover:bg-accent/20 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Acknowledge
                      </button>
                    </div>
                    {r.message && <p className="text-xs text-text-muted italic">"{r.message}"</p>}
                    <p className="text-[10px] text-text-muted mt-1">{new Date(r.requestedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
