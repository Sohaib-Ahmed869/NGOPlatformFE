import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Calendar, Users, Loader2 } from "lucide-react";
import programService from "../../services/program.service";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import PageLoader from "../../components/PageLoader";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

export default function ProgramDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donateAmount, setDonateAmount] = useState("");
  const [donating, setDonating] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await programService.getById(id);
        setProgram(res.data);
      } catch (err) {
        console.error("Failed to fetch program:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleDonate = async () => {
    if (!user) {
      toast.error("Please log in to donate");
      navigate("/login");
      return;
    }
    if (!donateAmount || parseFloat(donateAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setDonating(true);
    try {
      await programService.donateToProgram(id, {
        amount: parseFloat(donateAmount),
        donorEmail: user.email,
      });
      toast.success("Thank you for your donation!");
      setDonateAmount("");
      const res = await programService.getById(id);
      setProgram(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Donation failed");
    } finally {
      setDonating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-muted">Program not found</p>
      </div>
    );
  }

  const pct =
    program.goalAmount > 0
      ? Math.min(
          100,
          Math.round((program.raisedAmount / program.goalAmount) * 100)
        )
      : 0;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.button
          onClick={() => navigate("/programs")}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary mb-6 group"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Programs
        </motion.button>

        <motion.div
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          initial="hidden"
          animate="visible"
        >
          {/* Top accent */}
          <div className="h-1.5 bg-gradient-to-r from-accent to-accent-light" />

          <div className="p-8">
            {/* Header */}
            <motion.div
              className="flex items-start justify-between mb-5"
              variants={fadeUp}
              custom={0}
            >
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">
                {program.title}
              </h1>
              <span
                className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                  program.status === "active"
                    ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {program.status}
              </span>
            </motion.div>

            {program.description && (
              <motion.p
                variants={fadeUp}
                custom={1}
                className="text-text-muted mb-8 leading-relaxed"
              >
                {program.description}
              </motion.p>
            )}

            {/* Progress */}
            <motion.div
              variants={fadeUp}
              custom={2}
              className="bg-background rounded-xl p-6 mb-8"
            >
              <div className="flex justify-between text-sm mb-3">
                <span className="text-primary font-semibold text-lg">
                  ${program.raisedAmount?.toLocaleString()}
                </span>
                <span className="text-text-muted">
                  of ${program.goalAmount?.toLocaleString()} goal
                </span>
              </div>
              <div className="h-3.5 bg-gray-200 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center gap-6 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {program.donors?.length || 0} donors
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(program.createdAt).toLocaleDateString()}
                </span>
                <span className="font-medium text-accent">{pct}% funded</span>
              </div>
            </motion.div>

            {/* Donate section */}
            {program.status === "active" && (
              <motion.div
                variants={fadeUp}
                custom={3}
                className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl p-6 mb-8 border border-accent/15"
              >
                <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-accent" />
                  Make a Donation
                </h3>

                {/* Quick amounts */}
                <div className="flex gap-2 mb-4">
                  {[25, 50, 100, 250].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setDonateAmount(String(amt))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        donateAmount === String(amt)
                          ? "bg-accent text-white shadow-sm"
                          : "bg-white text-primary border border-gray-200 hover:border-accent/30"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={donateAmount}
                      onChange={(e) => setDonateAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                      placeholder="Custom amount"
                      min="1"
                    />
                  </div>
                  <button
                    onClick={handleDonate}
                    disabled={donating}
                    className="px-8 py-3 bg-gradient-to-r from-[#8B6914] to-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {donating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4" />
                    )}
                    {donating ? "Processing..." : "Donate"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Follow-up updates */}
            {program.followUpUpdates?.length > 0 && (
              <motion.div variants={fadeUp} custom={4}>
                <h3 className="text-lg font-semibold text-primary mb-5">
                  Updates
                </h3>
                <div className="space-y-4">
                  {[...program.followUpUpdates]
                    .sort(
                      (a, b) => new Date(b.sentAt) - new Date(a.sentAt)
                    )
                    .map((update, i) => (
                      <motion.div
                        key={i}
                        className="border-l-3 border-accent pl-5 py-3"
                        style={{ borderLeftWidth: 3 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                      >
                        <p className="text-sm text-primary leading-relaxed">
                          {update.text}
                        </p>
                        <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(update.sentAt).toLocaleDateString()}
                        </p>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
