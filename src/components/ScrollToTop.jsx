import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scroll-to-top on navigation.
 *
 * React Router (BrowserRouter) preserves the window scroll position across
 * route changes, so navigating to a new page would otherwise keep you wherever
 * you were on the previous one. This resets to the top whenever the path
 * changes — but if the URL carries a #hash, it scrolls to that anchor instead
 * so in-page links still work.
 *
 * Uses useLayoutEffect (not useEffect) so the reset runs BEFORE the browser
 * paints the new route — otherwise a tall new page briefly renders at the old
 * scroll offset (e.g. you'd glimpse its footer for a frame before it jumps to
 * the top). Also pins history.scrollRestoration to "manual" so the browser's
 * own restoration can't fight it. SPA-only (no SSR), so useLayoutEffect is safe.
 *
 * Renders nothing; mounted once near the app root inside <Router>.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    // Jump instantly to the top (no smooth) so there's no visible travel.
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
