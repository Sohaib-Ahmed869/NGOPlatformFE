import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Heart, LayoutGrid, List } from "lucide-react";
import { toast } from "react-hot-toast";
import axiosInstance from "../../services/axios";
import Loader from "../../components/Loader";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4 } }),
};

const DonationTypes = () => {
  const [donationTypes, setDonationTypes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentType, setCurrentType] = useState({ id: null, donationType: "" });
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => { fetchDonationTypes(); }, []);

  const fetchDonationTypes = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/donationtypes");
      if (response.data.success) setDonationTypes(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching donation types");
    } finally {
      setLoading(false);
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
    try {
      const response = await axiosInstance.delete(`/donationtypes/${deleteModal}`);
      if (response.data.success) {
        toast.success("Donation type deleted");
        setDeleteModal(null);
        fetchDonationTypes();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting donation type");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        const res = await axiosInstance.put(`/donationtypes/${currentType.id}`, { donationType: currentType.donationType });
        if (res.data.success) { toast.success("Updated"); handleClose(); fetchDonationTypes(); }
      } else {
        const res = await axiosInstance.post("/donationtypes", { donationType: currentType.donationType });
        if (res.data.success) { toast.success("Created"); handleClose(); fetchDonationTypes(); }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving donation type");
    }
  };

  if (loading) return <Loader />;

  return (
    <motion.div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen" initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Donation Types</h1>
          <p className="text-sm text-text-muted mt-0.5">{donationTypes.length} types configured</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-accent"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-accent"
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button onClick={handleOpen}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Type
          </button>
        </div>
      </motion.div>

      {donationTypes.length === 0 ? (
        <motion.div variants={fadeUp} custom={1}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Heart className="w-10 h-10 mx-auto mb-3 text-text-muted" />
          <p className="text-text-muted">No donation types yet</p>
        </motion.div>
      ) : viewMode === "list" ? (
        <motion.div variants={fadeUp} custom={1}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {donationTypes.map((type, i) => (
              <motion.div key={type._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between px-5 py-4 hover:bg-background/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-primary">{type.donationType}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(type)}
                    className="p-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent/5 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteModal(type._id)}
                    className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} custom={1}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {donationTypes.map((type, i) => {
            const palette = [
              { bg: "bg-emerald-50", border: "border-emerald-200", icon: "bg-emerald-100 text-emerald-600", bar: "bg-emerald-400" },
              { bg: "bg-violet-50", border: "border-violet-200", icon: "bg-violet-100 text-violet-600", bar: "bg-violet-400" },
              { bg: "bg-amber-50", border: "border-amber-200", icon: "bg-amber-100 text-amber-600", bar: "bg-amber-400" },
              { bg: "bg-pink-50", border: "border-pink-200", icon: "bg-pink-100 text-pink-600", bar: "bg-pink-400" },
              { bg: "bg-sky-50", border: "border-sky-200", icon: "bg-sky-100 text-sky-600", bar: "bg-sky-400" },
              { bg: "bg-rose-50", border: "border-rose-200", icon: "bg-rose-100 text-rose-600", bar: "bg-rose-400" },
            ];
            const c = palette[i % palette.length];
            return (
              <motion.div key={type._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`${c.bg} rounded-2xl border ${c.border} overflow-hidden hover:shadow-md transition-all duration-300 group`}>
                <div className="p-5 flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center mb-3`}>
                    <Heart className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-primary mb-4 line-clamp-2">{type.donationType}</span>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(type)}
                      className="p-2 rounded-lg text-text-muted hover:text-accent hover:bg-white/80 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteModal(type._id)}
                      className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-white/80 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
            <motion.div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-semibold text-primary">
                  {editMode ? "Edit Donation Type" : "New Donation Type"}
                </h3>
                <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-primary mb-1">Name</label>
                  <input type="text" name="donationType" value={currentType.donationType}
                    onChange={(e) => setCurrentType({ ...currentType, donationType: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                    required maxLength={100} placeholder="e.g., Sadaqah, Zakat" />
                  <p className="mt-1 text-[11px] text-text-muted">{currentType.donationType.length}/100</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={handleClose}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                  <button type="submit"
                    className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90">
                    {editMode ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal(null)} />
            <motion.div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-primary mb-1">Delete Donation Type?</h3>
              <p className="text-sm text-text-muted mb-5">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DonationTypes;
