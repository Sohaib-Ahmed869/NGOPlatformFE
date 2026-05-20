import React, { useState, useEffect } from "react";
import { Plus, Eye, MessageSquare, XCircle } from "lucide-react";
import programService from "../../services/program.service";
import toast from "react-hot-toast";
import PageLoader from "../../components/PageLoader";

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(null);
  const [newProgram, setNewProgram] = useState({ title: "", description: "", goalAmount: "" });
  const [followUpText, setFollowUpText] = useState("");

  const fetchPrograms = async () => {
    try {
      const res = await programService.getAll();
      setPrograms(res.data);
    } catch (err) {
      console.error("Failed to fetch programs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleCreate = async () => {
    if (!newProgram.title || !newProgram.goalAmount) {
      toast.error("Title and goal amount are required");
      return;
    }
    try {
      await programService.create({
        ...newProgram,
        goalAmount: parseFloat(newProgram.goalAmount),
      });
      toast.success("Program created");
      setShowCreateModal(false);
      setNewProgram({ title: "", description: "", goalAmount: "" });
      fetchPrograms();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create program");
    }
  };

  const handleFollowUp = async () => {
    if (!followUpText.trim()) {
      toast.error("Update text is required");
      return;
    }
    try {
      await programService.postFollowUp(showFollowUpModal._id, {
        text: followUpText,
      });
      toast.success("Follow-up update posted and donors notified");
      setShowFollowUpModal(null);
      setFollowUpText("");
      fetchPrograms();
    } catch (err) {
      toast.error("Failed to post update");
    }
  };

  const handleClose = async (id) => {
    if (!confirm("Are you sure you want to close this program? All donors will be notified.")) return;
    try {
      await programService.closeProgram(id);
      toast.success("Program closed");
      fetchPrograms();
    } catch (err) {
      toast.error("Failed to close program");
    }
  };

  if (loading) {
    return (
      <PageLoader />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-primary">Programs</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Program
        </button>
      </div>

      {programs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <p className="text-text-muted mb-4">No programs yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm"
          >
            Create your first program
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Title</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Progress</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Donors</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => {
                const pct = program.goalAmount > 0
                  ? Math.min(100, Math.round((program.raisedAmount / program.goalAmount) * 100))
                  : 0;
                return (
                  <tr key={program._id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-primary">{program.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">
                          ${program.raisedAmount?.toLocaleString()} / ${program.goalAmount?.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          program.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {program.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{program.donorCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {program.status === "active" && (
                          <>
                            <button
                              onClick={() => setShowFollowUpModal(program)}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Post Update
                            </button>
                            <button
                              onClick={() => handleClose(program._id)}
                              className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Close
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-primary mb-4">New Program</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Title</label>
                <input
                  type="text"
                  value={newProgram.title}
                  onChange={(e) => setNewProgram((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="e.g., Clean Water Initiative"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Description</label>
                <textarea
                  value={newProgram.description}
                  onChange={(e) => setNewProgram((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  rows={3}
                  placeholder="Describe your program..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Goal Amount ($)</label>
                <input
                  type="number"
                  value={newProgram.goalAmount}
                  onChange={(e) => setNewProgram((p) => ({ ...p, goalAmount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="10000"
                  min="0"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2 bg-accent text-white rounded-lg text-sm"
              >
                Create Program
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-Up Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Post Update: {showFollowUpModal.title}
            </h3>
            <p className="text-xs text-text-muted mb-4">
              This update will be emailed to all {showFollowUpModal.donorCount} donors.
            </p>
            <textarea
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              rows={5}
              placeholder="Share progress updates with your donors..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowFollowUpModal(null);
                  setFollowUpText("");
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleFollowUp}
                className="flex-1 py-2 bg-accent text-white rounded-lg text-sm"
              >
                Post & Notify Donors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
