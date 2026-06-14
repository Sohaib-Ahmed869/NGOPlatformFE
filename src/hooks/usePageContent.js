import { useState, useEffect, useMemo } from "react";
import siteService from "../services/site.service";

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
// Overlay `over` onto `base` recursively (objects merge; arrays/values replace).
function deepMerge(base, over) {
  if (!isObj(base) || !isObj(over)) return over;
  const out = { ...base };
  for (const k of Object.keys(over)) {
    out[k] = isObj(base[k]) && isObj(over[k]) ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}

/**
 * Fetch a tenant page's content by key (e.g. "home", "about").
 *
 * The backend returns content already merged over template defaults, so the
 * returned object is complete. Content is cached (memory + localStorage, per
 * tenant) and served stale-while-revalidate: a cached copy renders instantly
 * (so `loading` is false and there's no skeleton flash on revisits/refresh),
 * then the page revalidates in the background and silently updates if the saved
 * content changed. `loading` is only true on a genuine cold load (no cache).
 *
 * Preview mode: when the page is opened with `?preview=1` (the admin editor's
 * iframe), it also accepts draft content over `postMessage` and overlays it on
 * top of the fetched content — so the page renders exactly as it will look,
 * live, as the admin types.
 */
export default function usePageContent(key) {
  // Hydrate synchronously from cache so the first paint already has content.
  const cached = siteService.getCachedPageContent(key);
  const [content, setContent] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [draft, setDraft] = useState(null);

  const isPreview = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1",
    [],
  );

  useEffect(() => {
    let active = true;
    const have = siteService.getCachedPageContent(key);
    if (have) {
      setContent(have);
      setLoading(false); // show cached immediately — no loading state
    } else {
      setContent(null);
      setLoading(true);
    }
    // Always revalidate in the background (stale-while-revalidate).
    siteService
      .fetchPageContent(key)
      .then((fresh) => {
        if (!active) return;
        // Only replace if it actually changed, to avoid a needless re-render.
        setContent((prev) => (prev && JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh));
      })
      .catch(() => {
        if (active && !have) setContent({});
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key]);

  useEffect(() => {
    if (!isPreview) return;
    const onMsg = (e) => {
      const d = e.data;
      if (d && d.type === "cms-preview" && (!d.key || d.key === key)) setDraft(d.content || {});
    };
    window.addEventListener("message", onMsg);
    // Tell the parent editor we're mounted so it sends the current draft.
    try {
      window.parent?.postMessage({ type: "cms-preview-ready", key }, "*");
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener("message", onMsg);
  }, [isPreview, key]);

  const merged = isPreview && draft ? deepMerge(content || {}, draft) : content;
  return { content: merged, loading };
}
