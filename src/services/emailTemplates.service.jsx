import axiosInstance from "./axios";
import { sharedGet, sharedPost } from "./sharedRequest";

/**
 * Dynamic email templates.
 *
 * The SuperAdmin console and a tenant's own admin portal drive the SAME API
 * shape at two different mount points — the backend decides which layer a
 * request edits from the mount, never from anything sent here. So this module
 * is built once and bound to a base path, rather than duplicated.
 *
 *   emailTemplatesService            -> platform layer  (/superadmin/email)
 *   tenantEmailTemplatesService      -> tenant layer    (/admin/email-templates)
 *
 * ── What this module is actually for ──────────────────────────────────────
 * The console is read-heavy and repetitive: 43 catalogue rows that change about
 * once a month, one detail document per email, and a preview that re-renders on
 * a debounce while you type. Left alone that is a request per mount, per tab
 * hop, per keystroke-pause, per undo. Four mechanisms keep it to the requests
 * that can actually return something new:
 *
 *   De-duplication. Concurrent callers asking for the same thing share ONE
 *   request (./sharedRequest), and it is cancelled only when the last of them
 *   walks away — so a StrictMode double-mount, or two panels mounting at once,
 *   is one round trip, and an abandoned screen stops costing the server.
 *
 *   Caching with an age. The list, each detail document and the layout are held
 *   per page-load; every mutation drops what it invalidates. `fetchedAt` turns
 *   the cache from "have it or not" into "how old is it", which is what lets a
 *   screen repaint instantly AND still refresh a stale copy behind you.
 *
 *   Content-addressed previews. A preview is a pure function of (template,
 *   draft), so it is cached by a signature of the draft. Undo, redo, flipping
 *   Builder⇄HTML and back, or retyping a character you just deleted all land on
 *   a signature that has already been rendered — and cost nothing.
 *
 *   Short-TTL log pages. The send log is a moving target, so its pages expire
 *   rather than persist; paging back and forth inside half a minute is free,
 *   and anything older is refetched.
 *
 * The cached list also doubles as a freshness signal: anything that could
 * change what the list renders (a save creating an override, a reset removing
 * one) drops it, so its mere presence means "still current". That's what lets
 * the console repaint instantly when you come back from the editor without
 * having saved, instead of refetching 43 rows to learn nothing changed.
 */

// How long a cached catalogue stays authoritative before a screen showing it
// revalidates behind you. It carries 30-day send counters, so it does go off —
// just slowly.
const LIST_TTL_MS = 60_000;
// The send log moves; its pages are for paging back, not for keeping.
const LOG_TTL_MS = 30_000;
// Previews are keyed by content, so a hit is always correct — this bound is
// about memory, not staleness. Deep enough to cover a long undo run.
const PREVIEW_CACHE_MAX = 24;

/** Stable identity for a draft. Key order is fixed so `{a,b}` and `{b,a}` match. */
function draftSignature(draft) {
  if (!draft) return "-";
  const stable = (v) => {
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === "object") {
      return Object.keys(v)
        .sort()
        .reduce((acc, k) => {
          acc[k] = stable(v[k]);
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(stable(draft));
}

/** Insertion-ordered LRU: re-setting a key moves it to the end. */
function lruSet(map, key, value, max) {
  map.delete(key);
  map.set(key, value);
  if (map.size > max) map.delete(map.keys().next().value);
}

/**
 * Build the axios `(body, config)` pair for a send.
 *
 * With no attachments this is plain JSON, which keeps the common case a normal
 * request. With attachments it has to be multipart, and multipart carries only
 * strings — so the nested objects are JSON-encoded into single fields and the
 * server parses them back. Returned as a tuple so the call site stays one line
 * and the two shapes can never drift apart.
 */
function sendBody({ files, ...rest } = {}) {
  const list = Array.isArray(files) ? files.filter(Boolean) : [];
  if (!list.length) return [rest, undefined];

  const fd = new FormData();
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined || v === null || v === "") continue;
    fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  for (const f of list) fd.append("attachments", f);
  return [fd, { headers: { "Content-Type": "multipart/form-data" } }];
}

function makeService(base, { templatesPath = "/templates" } = {}) {
  const url = (p = "") => `${base}${p}`;
  const tpl = (key, p = "") => `${base}${templatesPath}/${encodeURIComponent(key)}${p}`;

  let _list = null;
  let _listAt = 0;
  const _detail = new Map();
  const _detailAt = new Map();
  let _layout = null;
  const _preview = new Map(); // signature -> rendered
  const _logs = new Map(); // params -> { at, value }

  // One registry per endpoint family: two different requests must never
  // collide on a key just because their ids look alike.
  const _listFlight = new Map();
  const _detailFlight = new Map();
  const _layoutFlight = new Map();
  const _previewFlight = new Map();
  const _logFlight = new Map();

  const invalidate = (key) => {
    _list = null;
    _listAt = 0;
    if (key) {
      _detail.delete(key);
      _detailAt.delete(key);
    } else {
      _detail.clear();
      _detailAt.clear();
    }
    // A preview renders the draft through the CURRENT saved layout and
    // defaults, so anything that changes those retires every cached render.
    _preview.clear();
  };

  return {
    getCachedList: () => _list,
    /** 0 when nothing is cached. Lets a screen show how old what it's showing is. */
    getListFetchedAt: () => _listAt,
    isListStale: (maxAge = LIST_TTL_MS) => !_list || Date.now() - _listAt > maxAge,

    /**
     * Fold a known change into the cached list without dropping it. Used by the
     * optimistic toggle: throwing away 43 cached rows to reflect one boolean we
     * already hold would cost a refetch and a flash of skeletons.
     */
    patchCachedTemplate: (key, patch) => {
      if (!_list?.templates) return null;
      _list = {
        ..._list,
        templates: _list.templates.map((t) => (t.key === key ? { ...t, ...patch } : t)),
      };
      return _list;
    },

    /**
     * `force` skips the cache but still joins a request already on the wire —
     * two Refresh clicks in a row are one round trip, and can't land out of
     * order and repaint the older answer.
     */
    list: ({ force = false, signal } = {}) => {
      if (_list && !force) return Promise.resolve(_list);
      return sharedGet(axiosInstance, _listFlight, "list", url(templatesPath), { signal }, (res) => {
        _list = res.data;
        _listAt = Date.now();
        return _list;
      });
    },

    /**
     * The detail document we already hold, if any. The editor paints from this
     * and revalidates behind it — but only adopts the fresher copy while the
     * draft is still untouched, so a background response can never overwrite
     * something half-typed.
     */
    getCachedTemplate: (key) => _detail.get(key) || null,

    /**
     * Our own saves and resets drop the cached copy outright, so a surviving
     * one can only go stale because ANOTHER operator edited the same email.
     * That's rare but not impossible, and editing on top of a stale base would
     * quietly overwrite their work — hence an age, rather than trusting the
     * cache forever or refetching every single time.
     */
    isTemplateStale: (key, maxAge = LIST_TTL_MS) =>
      !_detail.has(key) || Date.now() - (_detailAt.get(key) || 0) > maxAge,

    get: (key, { force = false, signal } = {}) => {
      if (!force && _detail.has(key)) return Promise.resolve(_detail.get(key));
      return sharedGet(axiosInstance, _detailFlight, key, tpl(key), { signal }, (res) => {
        _detail.set(key, res.data);
        _detailAt.set(key, Date.now());
        return res.data;
      });
    },

    save: async (key, body) => {
      const res = await axiosInstance.put(tpl(key), body);
      invalidate(key);
      return res.data;
    },

    reset: async (key) => {
      const res = await axiosInstance.post(tpl(key, "/reset"));
      invalidate(key);
      return res.data;
    },

    // Deliberately does NOT invalidate the list: the caller has already applied
    // the new value optimistically, and the server's echo is folded in below.
    toggle: async (key, enabled) => {
      const res = await axiosInstance.patch(tpl(key, "/toggle"), { enabled });
      _detail.delete(key);
      if (_list?.templates) {
        const next = res.data?.enabled ?? enabled;
        _list = {
          ..._list,
          templates: _list.templates.map((t) => (t.key === key ? { ...t, enabled: next } : t)),
        };
      }
      return res.data;
    },

    /**
     * Live preview of an unsaved draft.
     *
     * Content-addressed: the same draft always renders to the same email, so a
     * repeat is served from memory instead of the server. That is not a micro
     * optimisation — undo/redo, switching Builder⇄HTML to compare, and deleting
     * a character you just typed are the normal rhythm of editing, and every
     * one of them used to be a full server render.
     */
    preview: (key, draft, { signal, data } = {}) => {
      // `data` is the composer's real values. It joins the signature because a
      // preview is only content-addressed if the ADDRESS covers everything that
      // changes the render -- keying on the draft alone would serve one
      // recipient's email while showing another's name.
      const sig = `${key}|${draftSignature(draft)}|${draftSignature(data)}`;
      const hit = _preview.get(sig);
      if (hit) {
        // Touch it so an active editing session doesn't evict its own history.
        lruSet(_preview, sig, hit, PREVIEW_CACHE_MAX);
        return Promise.resolve(hit);
      }
      return sharedPost(
        axiosInstance,
        _previewFlight,
        sig,
        tpl(key, "/preview"),
        data ? { draft, data } : { draft },
        { signal },
        (res) => {
          lruSet(_preview, sig, res.data, PREVIEW_CACHE_MAX);
          return res.data;
        },
      );
    },

    /** Whether `preview` would answer from memory — lets the UI skip its spinner. */
    hasPreview: (key, draft, data) =>
      _preview.has(`${key}|${draftSignature(draft)}|${draftSignature(data)}`),

    sendTest: (key, { to, draft }) =>
      axiosInstance.post(tpl(key, "/test"), { to, draft }).then((r) => r.data),

    /* ── manual send ──
       The composer: a real email, to addresses someone typed, with the
       variables filled in by hand and files optionally attached.

       Not cached and not de-duplicated, unlike everything else here. A repeated
       preview is the same answer; a repeated send is a second email in
       somebody's inbox, and joining two of them into one would silently drop a
       deliberate re-send. The panel guards the double-click instead. */

    sendManual: (key, payload) =>
      axiosInstance.post(tpl(key, "/send"), ...sendBody(payload)).then((r) => r.data),

    /* ── free-form composer ──
       An email that isn't in the catalogue at all. Same envelope, same layout,
       same send log — the body is just written on the spot. */

    previewCustom: (body, { signal } = {}) => {
      const sig = `custom|${draftSignature(body)}`;
      const hit = _preview.get(sig);
      if (hit) {
        lruSet(_preview, sig, hit, PREVIEW_CACHE_MAX);
        return Promise.resolve(hit);
      }
      return sharedPost(axiosInstance, _previewFlight, sig, url("/custom/preview"), body, { signal }, (res) => {
        lruSet(_preview, sig, res.data, PREVIEW_CACHE_MAX);
        return res.data;
      });
    },

    sendCustom: (payload) =>
      axiosInstance.post(url("/custom/send"), ...sendBody(payload)).then((r) => r.data),

    /* ── shared layout ── */

    getLayout: ({ force = false, signal } = {}) => {
      if (_layout && !force) return Promise.resolve(_layout);
      return sharedGet(axiosInstance, _layoutFlight, "layout", url("/layout"), { signal }, (res) => {
        _layout = res.data;
        return _layout;
      });
    },

    saveLayout: async (body) => {
      const res = await axiosInstance.put(url("/layout"), body);
      _layout = null;
      // The layout wraps every email, so every cached preview is now stale.
      invalidate();
      return res.data;
    },

    resetLayout: async () => {
      const res = await axiosInstance.post(url("/layout/reset"));
      _layout = null;
      invalidate();
      return res.data;
    },

    /* ── send log ──
       Pages expire rather than persist: this is a live operational record, so
       "instant when you page back" is worth having and "still right in five
       minutes" is not something it can promise. */

    logs: (params, { signal, force = false } = {}) => {
      const key = JSON.stringify(params || {});
      const hit = _logs.get(key);
      if (!force && hit && Date.now() - hit.at < LOG_TTL_MS) return Promise.resolve(hit.value);
      return sharedGet(axiosInstance, _logFlight, `logs:${key}`, url("/logs"), { params, signal }, (res) => {
        lruSet(_logs, key, { at: Date.now(), value: res.data }, 40);
        return res.data;
      });
    },

    logStats: (params, { signal, force = false } = {}) => {
      const key = `stats:${JSON.stringify(params || {})}`;
      const hit = _logs.get(key);
      if (!force && hit && Date.now() - hit.at < LOG_TTL_MS) return Promise.resolve(hit.value);
      return sharedGet(
        axiosInstance,
        _logFlight,
        key,
        url("/logs/stats"),
        { params, signal },
        (res) => {
          lruSet(_logs, key, { at: Date.now(), value: res.data }, 40);
          return res.data;
        },
      );
    },

    /** Manual refresh on the log tab — drop every page, not just the one shown. */
    invalidateLogs: () => _logs.clear(),

    invalidate,
  };
}

const emailTemplatesService = makeService("/superadmin/email");

// The tenant mount has no "/templates" segment — its whole router IS templates.
export const tenantEmailTemplatesService = makeService("/admin/email-templates", {
  templatesPath: "",
});

export { draftSignature };
export default emailTemplatesService;
