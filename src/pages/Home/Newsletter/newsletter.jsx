import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import axiosInstance from "../../../services/axios";
import { cn } from "../../../utils/cn";
import toast from "react-hot-toast";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const reduce = useReducedMotion();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await axiosInstance.post("/newsletter", { email });
      setSubscribed(true);
      setEmail("");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-background px-6 py-12 lg:py-14">
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-5xl overflow-hidden border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
      >
        {/* Decorative edge shapes — soft corner glows + outlined squares */}
        <span aria-hidden className="pointer-events-none absolute -left-14 -top-14 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 -right-12 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rotate-12 border-2 border-accent/25" />
        <span aria-hidden className="pointer-events-none absolute -bottom-9 -left-9 h-24 w-24 -rotate-12 border-2 border-accent/20" />

        <div className="relative flex flex-col items-center gap-5 text-center lg:flex-row lg:justify-between lg:gap-10 lg:text-left">
          {/* Left — copy */}
          <div>
            <h2 className="font-heading text-xl font-bold text-primary md:text-2xl">Stay Connected. Stay Inspired.</h2>
            <p className="mt-1 text-sm text-text-muted">
              Get monthly updates on our projects and the lives you&apos;re changing.
            </p>
          </div>

          {/* Right — form / success */}
          <div className="w-full lg:w-auto lg:min-w-[420px] lg:shrink-0">
            <AnimatePresence mode="wait">
              {subscribed ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">You&apos;re on the list — thanks for subscribing!</p>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Enter your email address…"
                      aria-invalid={!!error}
                      aria-label="Email address"
                      className={cn(
                        "min-w-0 flex-1 border bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400",
                        error ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-accent",
                      )}
                    />
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileHover={submitting || reduce ? undefined : { scale: 1.02 }}
                      whileTap={submitting || reduce ? undefined : { scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 24 }}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Subscribing…
                        </>
                      ) : (
                        <>
                          Subscribe
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </motion.button>
                  </form>
                  {error && <p className="mt-2 text-left text-xs text-red-500">{error}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default NewsletterSection;
