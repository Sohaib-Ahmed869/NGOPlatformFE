import { createPortal } from "react-dom";

/**
 * Renders children into the admin shell element (`[data-admin-theme]`) so overlay
 * modals' `fixed inset-0` covers the ENTIRE viewport — including the top bar —
 * instead of being clamped to the content panel. Targeting the themed element
 * (rather than raw document.body) keeps admin dark-mode styling intact. Falls
 * back to document.body, then renders inline if neither exists (SSR-safe).
 */
export default function Portal({ children }) {
  const target =
    (typeof document !== "undefined" &&
      (document.querySelector("[data-admin-theme]") || document.body)) ||
    null;
  return target ? createPortal(children, target) : null;
}
