import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Target, ArrowRight } from "lucide-react";
import programService from "../../services/program.service";
import PageLoader from "../../components/PageLoader";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await programService.getAll();
        setPrograms(res.data.filter((p) => p.status === "active"));
      } catch (err) {
        console.error("Failed to fetch programs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-14"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.span
            variants={fadeUp}
            className="inline-block text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3"
          >
            Our Programs
          </motion.span>
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-3xl md:text-4xl font-heading font-bold text-primary mb-3"
          >
            Support a cause you care about
          </motion.h1>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-text-muted max-w-xl mx-auto"
          >
            Every contribution makes a difference. Browse our active programs
            and help us reach our goals.
          </motion.p>
        </motion.div>

        {programs.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Target className="w-10 h-10 text-text-muted" />
            </div>
            <p className="text-text-muted text-lg">
              No active programs at the moment.
            </p>
            <p className="text-text-muted text-sm mt-1">
              Check back soon for new campaigns.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {programs.map((program, i) => {
              const pct =
                program.goalAmount > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (program.raisedAmount / program.goalAmount) * 100
                      )
                    )
                  : 0;
              return (
                <motion.div key={program._id} variants={fadeUp} custom={i}>
                  <Link
                    to={`/programs/${program._id}`}
                    className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-accent/20 transition-all duration-300 overflow-hidden group"
                  >
                    {/* Top accent bar */}
                    <div className="h-1 bg-gradient-to-r from-accent to-accent-light" />

                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent transition-colors">
                        {program.title}
                      </h3>
                      <p className="text-sm text-text-muted line-clamp-2 mb-5">
                        {program.description || "Help us reach our goal."}
                      </p>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-text-muted mb-1.5">
                          <span className="font-medium text-primary">
                            ${program.raisedAmount?.toLocaleString()} raised
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-xs text-text-muted">
                          <span>
                            Goal: ${program.goalAmount?.toLocaleString()}
                          </span>
                          <span className="mx-2">|</span>
                          <span>{program.donorCount || 0} donors</span>
                        </div>
                        <span className="text-xs text-accent font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                          Donate
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
