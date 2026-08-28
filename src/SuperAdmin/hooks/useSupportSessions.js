import { useCallback, useEffect, useReducer, useRef } from "react";
import axios from "axios";
import superadminService from "../../services/superadmin.service";

/**
 * The data lifecycle behind the Support Sessions screen.
 *
 * The screen used to carry eight separate pieces of fetch state (`loading`,
 * `revalidating`, `error`, `sessions`, `total`, `summary`, a key ref and a
 * refresh counter) that were only ever meaningful in certain combinations —
 * nothing stopped it rendering "no sessions" and an error at the same time, and
 * a failed background refresh could leave the spinner running forever. One
 * reducer with a single `phase` makes those states mutually exclusive by
 * construction, and keeps the component to markup.
 *
 * It also does three things the old screen didn't:
 *
 *  - **Never trusts a cached live list.** A cached page paints instantly, but if
 *    it claims anything is still active we re-check in the background. A stale
 *    kill switch is the one failure this screen cannot have.
 *  - **Polls while something is live**, pausing on a hidden tab and catching up
 *    the moment it comes back. The websocket is the fast path; this is the net
 *    under it for when the socket is down.
 *  - **Applies revokes optimistically**, so the row and the "Active now" tile
 *    move the instant the operator confirms, and a failure re-reads the truth
 *    rather than leaving a lie on screen.
 */

const EMPTY_SUMMARY = { activeNow: 0, liveNow: 0, operators: 0, tenants: 0 };

const INITIAL = {
  phase: "loading", // "loading" | "ready" | "error"
  revalidating: false,
  sessions: [],
  total: 0,
  summary: EMPTY_SUMMARY,
  serverTime: null,
  error: null,
};

// While a session is live the list is a live view of who is inside a tenant, so
// it re-reads often; otherwise it just guards against a dropped websocket.
const POLL_LIVE_MS = 15000;
const POLL_IDLE_MS = 60000;

function reducer(state, action) {
  switch (action.type) {
    case "load":
      // A background refresh must never blank the rows already on screen.
      return action.silent
        ? { ...state, revalidating: true }
        : { ...state, phase: "loading", revalidating: false, error: null };

    case "ready":
      return {
        phase: "ready",
        revalidating: false,
        error: null,
        sessions: action.data.sessions || [],
        total: action.data.total || 0,
        summary: { ...EMPTY_SUMMARY, ...(action.data.summary || {}) },
        serverTime: action.data.serverTime || null,
      };

    case "failed":
      // A failed *background* refresh keeps the last known rows (the caller
      // toasts). A failed first load must not fall through to an empty state:
      // "no sessions" when the request never landed would hide a live one.
      return action.silent
        ? { ...state, revalidating: false }
        : { ...INITIAL, phase: "error", error: action.message };

    case "patch": {
      const ids = new Set(action.ids);
      let closed = 0;
      const sessions = state.sessions.map((s) => {
        if (!ids.has(s.sessionId) || s.status !== "active") return s;
        closed += 1;
        return { ...s, ...action.changes };
      });
      if (!closed) return state;
      const stillActive = action.changes.status === "active";
      return {
        ...state,
        sessions,
        summary: stillActive
          ? state.summary
          : {
              ...state.summary,
              activeNow: Math.max(0, state.summary.activeNow - closed),
              liveNow: Math.max(0, state.summary.liveNow - closed),
            },
      };
    }

    default:
      return state;
  }
}

/**
 * @param {object}   opts
 * @param {object}   opts.params   query params (page/limit/status/search) — the identity of the view
 * @param {number}   opts.version  bump to force a silent re-read (websocket events)
 * @param {Function} opts.onError  called with a message when a BACKGROUND refresh fails
 */
export default function useSupportSessions({ params, viewKey, version = 0, onError }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [nonce, bump] = useReducer((n) => n + 1, 0);

  // The view's identity. Deriving the params back out of it inside the effect
  // keeps the dependency list honest without memoising an object.
  const key = JSON.stringify(params);
  // What makes this a DIFFERENT view rather than the same one re-ordered or
  // re-paged. Without it, sorting counted as new content and blanked the table
  // for the full-screen loader — which read as a page reload. Defaults to the
  // full param set, so a caller that doesn't distinguish behaves as before.
  const view = viewKey ?? key;
  const lastKeyRef = useRef(null);
  const lastViewRef = useRef(null);
  const skipCacheRef = useRef(false);
  const lastReadRef = useRef(0);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const query = JSON.parse(key);
    const controller = new AbortController();
    let alive = true;

    const forced = skipCacheRef.current;
    skipCacheRef.current = false;
    const cached = forced ? null : superadminService.getSupportSessionsCached(query);
    // Same filters as last time → a refresh, so keep the rows and spin quietly.
    // Different filters → the rows on screen answer a different question.
    // Re-ordering or paging counts as the SAME view: the rows still answer the
    // question you asked, just in a different order or window.
    const sameView = lastViewRef.current === view || lastKeyRef.current === key;

    let needsRevalidate = true;
    if (cached) {
      dispatch({ type: "ready", data: cached });
      lastKeyRef.current = key;
      lastViewRef.current = view;
      const claimsLive =
        (cached.summary?.liveNow || 0) > 0 || (cached.sessions || []).some((s) => s.status === "active");
      needsRevalidate = claimsLive;
    }
    if (!needsRevalidate) return () => controller.abort();

    const silent = Boolean(cached) || sameView;
    dispatch({ type: "load", silent });

    (async () => {
      try {
        const data = await superadminService.loadSupportSessions(query, { signal: controller.signal });
        if (!alive) return;
        lastReadRef.current = Date.now();
        dispatch({ type: "ready", data });
        lastKeyRef.current = key;
        lastViewRef.current = view;
      } catch (err) {
        if (!alive || axios.isCancel(err)) return;
        const message = err?.response?.data?.error || "Couldn't load support sessions.";
        dispatch({ type: "failed", silent, message });
        if (silent) onErrorRef.current?.(message);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [key, view, nonce, version]);

  /** Re-read from the server, keeping the rows on screen while it happens. */
  const refresh = useCallback(() => {
    skipCacheRef.current = true;
    bump();
  }, []);

  /** Optimistically rewrite rows we just acted on. */
  const patch = useCallback((ids, changes) => {
    dispatch({ type: "patch", ids: [].concat(ids), changes });
  }, []);

  const anyLive =
    state.summary.liveNow > 0 || state.sessions.some((s) => s.status === "active");

  // Poll — fast while something is live, slow otherwise, never while hidden,
  // and immediately on the way back so a backgrounded tab is never the reason
  // an operator is looking at an hour-old answer.
  useEffect(() => {
    if (state.phase === "error") return undefined;
    const every = anyLive ? POLL_LIVE_MS : POLL_IDLE_MS;
    const tick = () => {
      if (document.hidden) return;
      // A websocket bump or a manual refresh may have just re-read the list.
      // The interval runs on its own clock and knew nothing about those, so it
      // would fire a second read seconds behind the first. Poll from the last
      // ACTUAL read, whoever caused it.
      if (Date.now() - lastReadRef.current < every - 1000) return;
      refresh();
    };
    const id = setInterval(tick, Math.min(every, 5000));
    // Coming back to the tab catches up immediately — but clicking between
    // windows shouldn't fire a request per click.
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastReadRef.current > 5000) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [anyLive, state.phase, refresh]);

  return { ...state, anyLive, refresh, patch };
}
