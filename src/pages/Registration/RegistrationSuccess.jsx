import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, CheckCircle, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import tenantService from "../../services/tenant.service";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

export default function RegistrationSuccess() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("slug");
  const [status, setStatus] = useState("polling"); // polling | active | error
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (!slug) {
      setStatus("error");
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await tenantService.getOrgStatus(slug);
        if (res.data.isActive) {
          setOrgName(res.data.name);
          setStatus("active");
          clearInterval(interval);
          setTimeout(() => {
            window.location.href = `http://${slug}.charities.ltd/admin/login`;
          }, 5000);
        }
      } catch {
        // Keep polling
      }
    }, 2000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (status === "polling") setStatus("error");
    }, 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [slug]);

  if (status === "error") {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center px-4">
        <motion.div
          className="text-center max-w-md"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <motion.div
            className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          >
            <AlertCircle className="w-10 h-10 text-red-500" />
          </motion.div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 mb-3">
            Something went wrong
          </h1>
          <p className="text-slate-500 mb-8">
            We couldn't verify your registration. Please contact support if the
            issue persists.
          </p>
          <a
            href="/plans"
            className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-600-light transition-colors"
          >
            Try Again
          </a>
        </motion.div>
      </div>
    );
  }

  if (status === "polling") {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center px-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated rings */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-accent/20"
              animate={{ scale: [1, 1.4, 1.4], opacity: [0.5, 0, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-accent/20"
              animate={{ scale: [1, 1.4, 1.4], opacity: [0.5, 0, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.6,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-heading font-bold text-slate-900 mb-3">
            Setting up your organisation...
          </h1>
          <p className="text-slate-500 mb-3">
            We're creating your portal and admin account. This usually takes
            just a few seconds.
          </p>

          {/* Progress steps */}
          <div className="mt-8 space-y-3 text-left max-w-xs mx-auto">
            {[
              "Creating organisation",
              "Setting up admin account",
              "Configuring your portal",
            ].map((step, i) => (
              <motion.div
                key={step}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.8 }}
              >
                <motion.div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  initial={{ backgroundColor: "#e5e7eb" }}
                  animate={{ backgroundColor: "#6366F1" }}
                  transition={{ delay: 1 + i * 0.8, duration: 0.3 }}
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
                <span className="text-sm text-slate-500">{step}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // status === "active"
  const portalUrl = `http://${slug}.charities.ltd`;

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center px-4">
      <motion.div
        className="text-center max-w-md"
        initial="hidden"
        animate="visible"
      >
        {/* Success animation */}
        <motion.div
          className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          >
            <CheckCircle className="w-12 h-12 text-green-500" />
          </motion.div>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          custom={1}
          className="text-2xl font-heading font-bold text-slate-900 mb-2"
        >
          Welcome to {orgName}!
        </motion.h1>
        <motion.p
          variants={fadeUp}
          custom={2}
          className="text-slate-500 mb-6"
        >
          Your portal is live and ready for you. You'll be redirected to your
          admin login in a few seconds.
        </motion.p>

        <motion.div
          variants={fadeUp}
          custom={3}
          className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm mb-8"
        >
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">
            Your Portal URL
          </p>
          <a
            href={portalUrl}
            className="text-indigo-600 font-semibold text-lg hover:underline flex items-center justify-center gap-1"
          >
            {portalUrl}
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

        <motion.a
          variants={fadeUp}
          custom={4}
          href={`${portalUrl}/admin/login`}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
        >
          Go to Admin Dashboard
          <ExternalLink className="w-4 h-4" />
        </motion.a>

        {/* Redirect countdown */}
        <motion.p
          variants={fadeUp}
          custom={5}
          className="text-xs text-slate-500 mt-4"
        >
          Redirecting automatically in 5 seconds...
        </motion.p>
      </motion.div>
    </div>
  );
}
