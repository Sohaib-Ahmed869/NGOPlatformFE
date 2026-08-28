import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

/**
 * List state for the email console — shared by the platform screen and a
 * charity's own portal, so the two can't drift.
 *
 * Five things this exists to get right:
 *
 *   Cache-first paint. The catalogue is 43 rows that change about once a month.
 *   If we already have it, render it immediately and revalidate behind the
 *   scenes; a spinner over data we're holding is a downgrade, not a loading
 *   state.
 *
 *   Revalidate on age, not on arrival. The cache used to be permanent for the
 *   page-load: mount, and whatever it held was shown forever. But the rows
 *   carry 30-day send and failure counters, so "we have it" is not the same as
 *   "it's current". A cached list older than the freshness window refreshes
 *   itself behind the paint — and one younger than it costs nothing at all, no
 *   matter how many times you cross the screen.
 *
 *   Only the newest response wins, and abandoned ones stop. Every fetch carries
 *   a generation number, so a slow first load can't overwrite a refresh that
 *   started later and finished sooner; and leaving the screen aborts what it
 *   was waiting for instead of making the server finish work for nobody.
 *
 *   Optimistic toggles. Switching an email off is a boolean we already know the
 *   answer to; waiting on a round-trip to move the switch makes the UI feel
 *   broken. It flips instantly and rolls back if the server disagrees — which
 *   it will for `required` templates, and that refusal is worth surfacing.
 *
 *   Refetch only when something changed. A save or reset drops the service's
 *   cached list; a mere visit to the editor doesn't. So coming back from
 *   reading a template repaints from memory, and coming back from saving one
 *   reloads — without this screen having to know which happened.
 */

// Older than this and a mounted screen quietly brings itself up to date.
const FRESH_FOR_MS = 60_000;

export default function useEmailConsole(service) {
  const [data, setData] = useState(() => service.getCachedList());
  const [loading, setLoading] = useState(() => !service.getCachedList());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyKeys, setBusyKeys] = useState(() => new Set());
  const [fetchedAt, setFetchedAt] = useState(() => service.getListFetchedAt());

  const gen = useRef(0);
  const alive = useRef(true);
  // One controller for whatever request is currently ours. Superseding a
  // request aborts it: the answer is already known to be unwanted.
  const abortRef = useRef(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const load = useCallback(
    (force = false) => {
      const mine = ++gen.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const cached = service.getCachedList();
      if (!cached) setLoading(true);
      else setRefreshing(true);
      setError("");

      return service
        .list({ force, signal: controller.signal })
        .then((res) => {
          if (mine !== gen.current || !alive.current) return;
          setData(res);
          setFetchedAt(service.getListFetchedAt());
        })
        .catch((err) => {
          // A cancelled request is not a failure — it's this screen deciding it
          // no longer wants the answer.
          if (mine !== gen.current || !alive.current || axios.isCancel(err)) return;
          setError(err?.response?.data?.error || "Couldn't load the email catalogue");
        })
        .finally(() => {
          if (mine !== gen.current || !alive.current) return;
          setLoading(false);
          setRefreshing(false);
        });
    },
    [service],
  );

  useEffect(() => {
    const cached = service.getCachedList();
    if (!cached) {
      load(false);
      return;
    }
    // Paint what we have, then quietly catch up if it has aged out.
    setData(cached);
    setFetchedAt(service.getListFetchedAt());
    setLoading(false);
    if (service.isListStale(FRESH_FOR_MS)) load(true);
  }, [service, load]);

  /**
   * Coming back to a tab you left open an hour ago should not show hour-old
   * failure counts. Gated on the same freshness window, so flicking between
   * windows costs nothing — at most one request per focus, and usually none.
   */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!alive.current || !service.getCachedList()) return;
      if (service.isListStale(FRESH_FOR_MS)) load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [service, load]);

  /**
   * For consoles that swap the editor in without unmounting this screen (the
   * tenant tab does). Cheap when nothing was saved — the cache is still there,
   * so this is a repaint rather than a round-trip.
   */
  const revalidate = useCallback(() => {
    const cached = service.getCachedList();
    if (!cached) {
      load(false);
      return;
    }
    setData(cached);
    setFetchedAt(service.getListFetchedAt());
    if (service.isListStale(FRESH_FOR_MS)) load(true);
  }, [service, load]);

  const setBusy = useCallback((key, on) => {
    setBusyKeys((s) => {
      if (s.has(key) === on) return s;
      const next = new Set(s);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const toggle = useCallback(
    async (t) => {
      const next = !t.enabled;
      const apply = (enabled) =>
        setData((d) =>
          d ? { ...d, templates: d.templates.map((x) => (x.key === t.key ? { ...x, enabled } : x)) } : d,
        );

      setBusy(t.key, true);
      apply(next); // optimistic

      try {
        const res = await service.toggle(t.key, next);
        const settled = res?.enabled ?? next;
        if (settled !== next) apply(settled);
        service.patchCachedTemplate?.(t.key, { enabled: settled });
        toast.success(settled ? `“${t.label}” switched on` : `“${t.label}” switched off`);
      } catch (err) {
        apply(t.enabled); // the server said no — put it back
        toast.error(err?.response?.data?.error || "Couldn't change that");
      } finally {
        if (alive.current) setBusy(t.key, false);
      }
    },
    [service, setBusy],
  );

  const templates = useMemo(() => data?.templates || [], [data]);
  const groups = useMemo(() => data?.groups || [], [data]);

  const stats = useMemo(() => {
    let customised = 0;
    let off = 0;
    let sent = 0;
    let failed = 0;
    for (const t of templates) {
      if (t.customised) customised += 1;
      if (!t.enabled) off += 1;
      sent += t.sent30d || 0;
      failed += t.failed30d || 0;
    }
    return { total: templates.length, customised, defaults: templates.length - customised, off, sent, failed };
  }, [templates]);

  const refresh = useCallback(() => load(true), [load]);

  return {
    data,
    templates,
    groups,
    stats,
    loading,
    refreshing,
    error,
    busyKeys,
    fetchedAt,
    toggle,
    revalidate,
    refresh,
  };
}
