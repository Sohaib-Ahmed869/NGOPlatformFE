import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import Portal from "../../components/Portal";
import { Plus, Pencil, Trash2, X, HandCoins, LayoutGrid, List, Loader2, GripVertical } from "lucide-react";
import { toast } from "react-hot-toast";
import axiosInstance from "../../services/axios";
import donationTypeService from "../../services/donationtypeservice";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4 } }),
};

/* ── a draggable table row (handle-only drag) ── */
function TypeRow({ type, index, onEdit, onDelete, onDragEnd }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={type._id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      as="div"
      className="flex items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-gray-50/60"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="w-6 shrink-0 cursor-grab touch-none text-gray-300 transition-colors hover:text-gray-500 active:cursor-grabbing"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 shrink-0 text-center text-xs font-semibold text-text-muted">{index + 1}</span>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <HandCoins className="h-4 w-4" />
        </div>
        <span className="truncate text-sm font-medium text-primary">{type.donationType}</span>
      </div>
      <div className="flex w-[72px] shrink-0 items-center justify-end gap-1">
        <button onClick={() => onEdit(type)} title="Edit" className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={() => onDelete(type._id)} title="Delete" className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}

const DonationTypes = () => {
  // Start from the cached list (if any) so revisits render instantly — the
  // loader only shows on the very first, uncached open.
  const cached = donationTypeService.getCached();
  const [donationTypes, setDonationTypes] = useState(cached || []);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentType, setCurrentType] = useState({ id: null, donationType: "" });
  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState("list");

  // Keep a live ref to the current order so the drag-end handler persists the
  // latest arrangement.
  const typesRef = useRef(donationTypes);
  useEffect(() => { typesRef.current = donationTypes; });

  useEffect(() => {
    // Show the cached list instantly (if any) and always revalidate in the
    // background, so edits made elsewhere surface on revisit. The loader only
    // appears on a genuine cold open.
    fetchDonationTypes({ background: !!donationTypeService.getCached() });
  }, []);

  // Live reorder (on drag) — persists on drop.
  const reorderLocal = (ids) =>
    setDonationTypes((prev) => ids.map((id) => prev.find((t) => t._id === id)).filter(Boolean));

  const persistOrder = async () => {
    try {
      await donationTypeService.reorder(typesRef.current.map((t) => t._id));
    } catch {
      toast.error("Couldn't save the new order");
      fetchDonationTypes({ force: true });
    }
  };

  const fetchDonationTypes = async ({ force = false, background = false } = {}) => {
    try {
      if (!background) setLoading(true);
      // force/background always hit the network; a plain cold load uses the
      // cache-first path (which fetches when nothing's cached yet).
      const data = await withMinDelay(
        force || background ? donationTypeService.refresh() : donationTypeService.list(),
      );
      setDonationTypes(data);
    } catch (error) {
      if (!background) toast.error(error.response?.data?.message || "Error fetching donation types");
    } finally {
      if (!background) setLoading(false);
    }
  };

  const handleOpen = () => { setOpen(true); setEditMode(false); setCurrentType({ id: null, donationType: "" }); };
  const handleClose = () => { setOpen(false); setEditMode(false); setCurrentType({ id: null, donationType: "" }); };

  const handleEdit = (type) => {
    setCurrentType({ id: type._id, donationType: type.donationType });
    setEditMode(true);
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const response = await axiosInstance.delete(`/donationtypes/${deleteModal}`);
      if (response.data.success) {
        toast.success("Donation type deleted");
        setDeleteModal(null);
        fetchDonationTypes({ force: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting donation type");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editMode) {
        const res = await axiosInstance.put(`/donationtypes/${currentType.id}`, { donationType: currentType.donationType });
        if (res.data.success) { toast.success("Updated"); handleClose(); fetchDonationTypes({ force: true }); }
      } else {
        const res = await axiosInstance.post("/donationtypes", { donationType: currentType.donationType });
        if (res.data.success) { toast.success("Created"); handleClose(); fetchDonationTypes({ force: true }); }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving donation type");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <TabLoader label="Loading donation types…" />
    </div>
  );

  return (
    <motion.div className="w-full space-y-6" initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Donation Types</h1>
          <p className="mt-1 text-sm text-text-muted">
            The giving categories supporters choose from at checkout
            {donationTypes.length ? ` · ${donationTypes.length} configured` : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex shrink-0 border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid view"
              className={cn("grid h-9 w-9 place-items-center transition-colors", viewMode === "grid" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List view"
              className={cn("grid h-9 w-9 place-items-center transition-colors", viewMode === "list" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={handleOpen}
            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
          >
            <Plus className="h-4 w-4" /> Add type
          </button>
        </div>
      </motion.div>

      {/* Empty */}
      {donationTypes.length === 0 ? (
        <motion.div variants={fadeUp} custom={1} className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent">
            <HandCoins className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-primary">No donation types yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-text-muted">
            Add the giving categories supporters can choose — for example Zakat, Sadaqah or General.
          </p>
          <button onClick={handleOpen} className="mt-5 inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
            <Plus className="h-4 w-4" /> Add your first type
          </button>
        </motion.div>
      ) : viewMode === "list" ? (
        /* List — a reorderable table */
        <motion.div variants={fadeUp} custom={1} className="overflow-hidden border border-gray-100 bg-white shadow-sm">
          {/* header */}
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            <span className="w-6 shrink-0" />
            <span className="w-6 shrink-0 text-center">#</span>
            <span className="flex-1">Type</span>
            <span className="w-[72px] shrink-0 text-right">Actions</span>
          </div>
          {/* rows */}
          <Reorder.Group
            axis="y"
            values={donationTypes.map((t) => t._id)}
            onReorder={reorderLocal}
            as="div"
            className="divide-y divide-gray-50"
          >
            {donationTypes.map((type, i) => (
              <TypeRow
                key={type._id}
                type={type}
                index={i}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteModal(id)}
                onDragEnd={persistOrder}
              />
            ))}
          </Reorder.Group>
          <p className="border-t border-gray-100 bg-gray-50/40 px-4 py-2.5 text-[11px] text-text-muted">
            <GripVertical className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
            Drag the handle to set the order supporters see at checkout.
          </p>
        </motion.div>
      ) : (
        /* Grid */
        <motion.div variants={fadeUp} custom={1} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {donationTypes.map((type, i) => (
            <motion.div
              key={type._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className="group flex flex-col items-center border border-gray-100 bg-white p-5 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent">
                <HandCoins className="h-5 w-5" />
              </div>
              <span className="mb-3 line-clamp-2 text-sm font-semibold text-primary">{type.donationType}</span>
              <div className="mt-auto flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                <button onClick={() => handleEdit(type)} title="Edit" className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteModal(type._id)} title="Delete" className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create / Edit modal */}
      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
              <motion.div
                className="relative w-full max-w-md border border-gray-100 bg-white p-6 shadow-2xl"
                initial={{ scale: 0.96, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 16 }}
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
                      <HandCoins className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-semibold text-primary">{editMode ? "Edit donation type" : "New donation type"}</h3>
                  </div>
                  <button onClick={handleClose} className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Name</label>
                  <input
                    type="text"
                    value={currentType.donationType}
                    onChange={(e) => setCurrentType({ ...currentType, donationType: e.target.value })}
                    className="w-full border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                    required
                    maxLength={100}
                    autoFocus
                    placeholder="e.g. Zakat, Sadaqah, General"
                  />
                  <p className="mt-1.5 text-[11px] text-text-muted">{currentType.donationType.length}/100</p>
                  <div className="mt-5 flex gap-3">
                    <button type="button" onClick={handleClose} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {editMode ? "Update" : "Create"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Delete confirmation */}
      <Portal>
        <AnimatePresence>
          {deleteModal && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteModal(null)} />
              <motion.div
                className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl"
                initial={{ scale: 0.96, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 16 }}
              >
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="text-base font-semibold text-primary">Delete donation type?</h3>
                <p className="mt-1 text-sm text-text-muted">This action cannot be undone.</p>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => setDeleteModal(null)} disabled={deleting} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                  <button onClick={handleDelete} disabled={deleting} className="inline-flex flex-1 items-center justify-center gap-2 bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </motion.div>
  );
};

export default DonationTypes;
