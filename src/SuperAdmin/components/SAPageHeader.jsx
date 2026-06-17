import { motion } from "framer-motion";

/**
 * Shared platform-console page header — mono eyebrow, title, subtitle, and
 * right-aligned actions. Mirrors the admin portal's PageHeader. Gray utilities
 * are remapped by admin-theme.css in dark mode.
 */
export default function SAPageHeader({ title, subtitle, eyebrow, actions }) {
  return (
    <motion.div
      className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </motion.div>
  );
}
