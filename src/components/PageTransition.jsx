import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useTenant } from "../context/TenantContext";

/**
 * Smooth fade-up transition between pages on navigation.
 *
 * Keyed by pathname so the enter animation replays on every route change.
 * Pairs with <ScrollToTop /> (scroll resets first, then the new page fades in
 * from the top).
 *
 * Deliberately NOT applied to the dashboard shells (admin / user / super-admin):
 * those render a persistent sidebar layout, and keying a transition on the full
 * path would remount that layout on every sub-route click. Also respects
 * prefers-reduced-motion.
 */
export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  const { tenantMode } = useTenant();
  const reduce = useReducedMotion();

  const hasPersistentShell =
    tenantMode === "superadmin" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/user");

  if (reduce || hasPersistentShell) return children;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
