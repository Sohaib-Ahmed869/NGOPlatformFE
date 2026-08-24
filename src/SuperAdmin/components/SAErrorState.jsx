import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Console-wide "this failed to load" panel.
 *
 * Screens used to swallow fetch errors into console.error and fall through to
 * their empty state — so a failed request read as "there's nothing here"
 * ("No invoices yet", "No active plans yet — create one first", a dashboard of
 * zeros). That's worse than an error: it invites the operator to act on data
 * that was never loaded. Render this instead whenever a load fails.
 *
 *   {loading ? <SALoader /> : error ? <SAErrorState message={error} onRetry={…} />
 *     : rows.length === 0 ? <EmptyState /> : <Table />}
 */
export default function SAErrorState({ message, onRetry, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`border border-gray-100 bg-white py-20 text-center shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)] ${className}`}
    >
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-300" />
      <p className="px-4 text-gray-600 dark:text-white/70">{message || "Something went wrong loading this page."}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white/80 dark:hover:bg-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </motion.div>
  );
}
