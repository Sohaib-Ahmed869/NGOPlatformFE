import axiosInstance from "./axios";
import { sharedGet as sharedRequestGet } from "./sharedRequest";

// ── Contact-queries session cache ────────────────────────────────────────────
// The inbox list + staff list are cached per page-load with in-flight de-dupe,
// so revisiting the screen is instant (no loader flash). It's a real-time inbox,
// so the screen still revalidates in the background and the cache is kept in
// sync by sockets/optimistic updates via setContactQueriesCache. `null` means
// "not loaded yet"; an array (even empty) means "loaded".
let _cqCache = null;
let _cqInFlight = null;
// Same story as the ticket caches: the screen used to force a request on every
// mount, so the cache only saved the loader flash. This flag — set by the
// realtime layer and by local mutations — lets an unchanged revisit skip the
// request entirely.
let _cqStale = false;
let _cqStaffCache = null;
let _cqStaffInFlight = null;
// Per-conversation detail cache (keyed by id) so reopening a thread is instant.
// `_cqDetailStale` flags threads that changed while closed (via sockets) so the
// next open knows to revalidate; otherwise an unchanged reopen makes no request.
const _cqDetailCache = new Map();
const _cqDetailInFlight = new Map();
const _cqDetailStale = new Set();

// Kanban board (bugs/features × columns) — session cache + in-flight de-dupe so
// revisiting the board is instant. No sockets here, so the screen still
// revalidates in the background and optimistic drag-moves keep the cache fresh.
let _boardCache = null;
let _boardInFlight = null;
let _boardStale = false;

// ── Leads session cache ──────────────────────────────────────────────────────
// Same shape as the contact-queries cache above: list + pipeline board + staff
// + per-lead detail, kept in sync by sockets (lead:*) and by local mutations
// via the set*Cache helpers below.
let _leadsCache = null;
let _leadsInFlight = null;
let _leadsStale = false;
let _leadBoardCache = null;
let _leadBoardInFlight = null;
let _leadBoardStale = false;
let _leadStaffCache = null;
let _leadStaffInFlight = null;
const _leadDetailCache = new Map();
const _leadDetailInFlight = new Map();
const _leadDetailStale = new Set();

// ── CRM tasks session cache ──────────────────────────────────────────────────
// Board + stats + per-task detail. The LIST is deliberately not cached: unlike
// the leads table, a task list is almost never viewed unfiltered — every visit
// carries a status/assignee/due combination — so a single-slot cache would miss
// on nearly every mount while still costing the staleness bookkeeping.
let _taskBoardCache = null;
let _taskBoardInFlight = null;
let _taskBoardStale = false;
let _taskStatsCache = null;
let _taskStatsInFlight = null;
let _taskStatsStale = false;
const _taskDetailCache = new Map();
const _taskDetailInFlight = new Map();
const _taskDetailStale = new Set();

// Everything a task mutation makes untrue. Tasks show up on the leads table and
// the pipeline board too (the follow-up column is joined server-side), so a
// status change has to invalidate those as well — otherwise closing the last
// open task leaves the lead row still claiming one is outstanding.
const invalidateTaskViews = () => {
  _taskBoardStale = true;
  _taskStatsStale = true;
  _leadsStale = true;
  _leadBoardStale = true;
};

/**
 * The browser's UTC offset, sent with every task query.
 *
 * "Due today" and "overdue" are questions about the operator's wall clock, and
 * the server runs in UTC — ten hours away from the Australian team this is
 * built for. Without this the day boundary would be wrong for most of the day,
 * every day. See localDayBounds() in crmTaskController.
 */
const tzOffset = () => new Date().getTimezoneOffset();

// Audit log + support sessions — params-keyed caches. Declared up here because
// almost every other invalidator below clears the audit cache: the platform
// audit log is append-only and gains an entry for practically every operator
// action, so anything that mutates also makes the audit view stale.
// Keyed by page+filter combo → { data, at }. Bounded, because an operator can
// page a long way through an append-only log in one session.
const _auditCache = new Map();
const _auditInFlight = new Map();
const AUDIT_CACHE_MAX = 24;
const invalidateAuditCache = () => _auditCache.clear();
const _sessionCache = new Map();
// One support session + its audit trail, keyed by sessionId, so going back to
// the list and reopening a session doesn't re-fetch. A LIVE session is never
// served from here (its status, action count and countdown all move on their
// own) — see `getSupportSessionCached`.
const _sessionDetailCache = new Map();
const _sessionInFlight = new Map();
const _sessionDetailInFlight = new Map();
const SESSION_CACHE_MAX = 16;

/**
 * De-duping identical requests is only safe if one caller going away can't
 * cancel the request the others are still waiting on — React StrictMode makes
 * that the normal case, not an edge case. The refcounted implementation lives
 * in ./sharedRequest so the email console shares the same tested one; this
 * binds it to the axios instance and keeps the call sites below unchanged.
 *
 * @param {Map}      store  in-flight registry for this endpoint
 * @param {string}   key    identity of the request (id, or serialised params)
 * @param {string}   url
 * @param {object}   config axios config; its `signal` is the CALLER's
 * @param {Function} map    runs once, on the shared response (cache writes)
 */
const sharedGet = (store, key, url, config = {}, map = (res) => res.data) =>
  sharedRequestGet(axiosInstance, store, key, url, config, map);
const invalidateSupportSessionsCache = (sessionId) => {
  _sessionCache.clear();
  if (sessionId) _sessionDetailCache.delete(sessionId);
  else _sessionDetailCache.clear();
  invalidateAuditCache(); // starting/revoking a session writes an audit entry
};

// Plans — session cache + in-flight de-dupe. Plans change rarely and several
// screens need them (Organisations list, org detail, plan pickers), so one
// request serves the whole session; plan mutations below invalidate it. The
// in-flight de-dupe also collapses StrictMode's dev double-mount into a single
// network request.
let _plansCache = null;
let _plansInFlight = null;
const invalidatePlansCache = () => {
  _plansCache = null;
  // Plan price changes move the MRR / plan breakdown on both roll-up screens.
  _billingCache = null;
  _dashboardCache = null;
  _auditCache.clear(); // plan edits are audited too
};

// The feature catalog is a server-side CONFIG file (config/featureCatalog.js) —
// it cannot change while the app is running, so one fetch serves the session
// with no invalidation path.
let _catalogCache = null;
let _catalogInFlight = null;

// Pricing-card bullet library — session cache, invalidated by its own save.
let _bulletsCache = null;
let _bulletsInFlight = null;
const invalidateBulletsCache = () => {
  _bulletsCache = null;
};

// Billing stats — session cache + in-flight de-dupe. Every event that can move
// these numbers already flows through `invalidateOrgCaches` (org mutations,
// Stripe webhooks via the realtime layer) or `invalidatePlansCache` (price
// changes), and both clear this cache — so between changes, one request serves
// the whole session.
let _billingCache = null;
let _billingInFlight = null;

// Dashboard stats — same story as billing (they overlap heavily), so the same
// events clear both.
let _dashboardCache = null;
let _dashboardInFlight = null;

// Coupons — session cache, cleared by its own mutations and by the realtime
// `coupon:updated` event.
let _couponsCache = null;
let _couponsInFlight = null;
const invalidateCouponsCache = () => {
  _couponsCache = null;
  _auditCache.clear(); // coupon create/archive/replace/delete are audited
};

// Invoices — keyed by the query params (page/status/search) like the org list,
// so any page or filter already viewed re-renders with no request. Cleared by
// the realtime `invoice:updated` event (Stripe mirrors arrive by webhook).
const _invoiceCache = new Map();
const invalidateInvoicesCache = () => {
  _invoiceCache.clear();
  // A paid invoice moves "lifetime collected" on both roll-up screens, and a
  // failed one moves the past-due count. Without this the dashboard kept
  // showing pre-webhook totals until something org-related happened to touch it.
  _billingCache = null;
  _dashboardCache = null;
};


// Organisations — list + per-org detail session caches (tickets pattern).
// The list cache is keyed by the query params (page/search/filters), so any
// previously seen page/filter combo re-renders instantly with NO request.
// Detail is cached per org id; every org mutation below clears the list cache
// and marks that org stale, so the next look at it revalidates (screens show
// the cached copy immediately and refresh silently). An unchanged revisit
// makes no network call at all.
const _orgListCache = new Map(); // paramsKey -> response data
const _orgDetailCache = new Map(); // orgId -> response data
const _orgDetailStale = new Set();
const invalidateOrgCaches = (id) => {
  _orgListCache.clear();
  // Org lifecycle changes move the billing + dashboard totals.
  _billingCache = null;
  _dashboardCache = null;
  // Every one of these actions writes a platform audit entry.
  _auditCache.clear();
  if (id) _orgDetailStale.add(String(id));
  // No id → flag every cached org (keep the copies so screens still render
  // instantly and revalidate silently instead of dropping to a loader).
  else for (const key of _orgDetailCache.keys()) _orgDetailStale.add(key);
};

// Support tickets — list cache (SWR, real-time list) + per-ticket detail cache
// (keyed by id) so reopening a ticket is instant. `_ticketDetailStale` flags
// tickets that changed while their detail was closed → the next open revalidates.
let _ticketsCache = null;
let _ticketsInFlight = null;
// The list and board used to force a network request on EVERY mount, so a warm
// cache only saved the loader flash, never the call. These flags let a mount
// skip the request entirely unless something actually changed — set by the
// realtime layer and by local mutations (triage / comment).
let _ticketsStale = false;
const _ticketDetailCache = new Map();
const _ticketDetailInFlight = new Map();
const _ticketDetailStale = new Set();

const superadminService = {
  getStats: () => axiosInstance.get("/superadmin/stats"),

  getOrganisations: (params, signal) =>
    axiosInstance.get("/superadmin/organisations", { params, signal }),

  getOrganisation: (id, signal) =>
    axiosInstance.get(`/superadmin/organisations/${id}`, { signal }),

  // — Cached organisations list —
  // Synchronous peek for a params combo (null until fetched this session).
  getOrganisationsCached: (params) => _orgListCache.get(JSON.stringify(params)) || null,
  // Resolve to the list response data; caches on success. Callers pass an
  // abort signal, so no shared in-flight promise here (a cancel must only
  // cancel its own request).
  loadOrganisations: (params, { signal } = {}) => {
    const key = JSON.stringify(params);
    return axiosInstance.get("/superadmin/organisations", { params, signal }).then((res) => {
      _orgListCache.set(key, res.data);
      return res.data;
    });
  },

  // — Per-org detail cache —
  getCachedOrganisation: (id) => (id ? _orgDetailCache.get(String(id)) || null : null),
  isOrganisationStale: (id) => _orgDetailStale.has(String(id)),
  // Flag one org for silent revalidation on its next look (manual refresh).
  markOrganisationStale: (id) => {
    if (id) _orgDetailStale.add(String(id));
  },
  // Drop the list cache and flag one org stale (all orgs when no id) — called
  // by the realtime layer when an `organisation:updated` event arrives.
  invalidateOrgCaches: (id) => invalidateOrgCaches(id),
  // Fetch one org's detail and refresh its cache entry.
  loadOrganisation: (id, { signal } = {}) => {
    const key = String(id);
    return axiosInstance.get(`/superadmin/organisations/${id}`, { signal }).then((res) => {
      _orgDetailCache.set(key, res.data);
      _orgDetailStale.delete(key);
      return res.data;
    });
  },

  updateOrgPlan: (id, plan) => {
    invalidateOrgCaches(id);
    return axiosInstance.patch(`/superadmin/organisations/${id}/plan`, { plan });
  },

  suspendOrg: (id) => {
    invalidateOrgCaches(id);
    return axiosInstance.patch(`/superadmin/organisations/${id}/suspend`);
  },

  updateOrgStatus: (id, action) => {
    invalidateOrgCaches(id);
    return axiosInstance.patch(`/superadmin/organisations/${id}/status`, { action });
  },

  // Soft delete — org is hidden from every console list/stat but its data
  // (orders, invoices, audit trail) stays in Mongo. Server rejects unless
  // `confirmName` exactly matches the org's name.
  deleteOrganisation: (id, confirmName) => {
    invalidateOrgCaches(id);
    return axiosInstance.delete(`/superadmin/organisations/${id}`, { data: { confirmName } });
  },

  compOrg: (id, body) => {
    invalidateOrgCaches(id);
    return axiosInstance.post(`/superadmin/organisations/${id}/comp`, body);
  },

  setOrgOverride: (id, body) => {
    invalidateOrgCaches(id);
    return axiosInstance.put(`/superadmin/organisations/${id}/override`, body);
  },

  clearOrgOverride: (id) => {
    invalidateOrgCaches(id);
    return axiosInstance.delete(`/superadmin/organisations/${id}/override`);
  },

  setOrgTrial: (id, trialEndsAt) => {
    invalidateOrgCaches(id);
    return axiosInstance.post(`/superadmin/organisations/${id}/trial`, { trialEndsAt });
  },

  // Support session / impersonation (a new session shows in the org's
  // Activity tab, so mark it stale too)
  actAs: (id, body) => {
    invalidateOrgCaches(id);
    invalidateSupportSessionsCache(); // a new session (and its audit entry)
    return axiosInstance.post(`/superadmin/organisations/${id}/act-as`, body || {});
  },

  endSupportSession: () =>
    axiosInstance.post(`/superadmin/support-session/end`),

  // Support-session audit + kill switch (platform operator view)
  getSupportSessionsCached: (params) => _sessionCache.get(JSON.stringify(params)) || null,
  // De-duped per view. This screen has three things asking it to re-read — a
  // 15s poll while anything is live, websocket `sessionsVersion` bumps, and the
  // catch-up when the tab regains focus — so overlapping reads of the SAME view
  // are routine here, not a StrictMode curiosity.
  loadSupportSessions: (params, { signal } = {}) => {
    const key = JSON.stringify(params);
    return sharedGet(_sessionInFlight, key, "/superadmin/support-sessions", { params, signal }, (res) => {
      _sessionCache.set(key, res.data);
      if (_sessionCache.size > SESSION_CACHE_MAX) _sessionCache.delete(_sessionCache.keys().next().value);
      return res.data;
    });
  },
  invalidateSupportSessionsCache: (sessionId) => invalidateSupportSessionsCache(sessionId),
  // A live session is deliberately never served from cache: its status, action
  // count and countdown all move without us doing anything, and this is the
  // screen an operator opens to kill it.
  getSupportSessionCached: (sessionId) => {
    const hit = _sessionDetailCache.get(sessionId);
    return hit && hit.session?.status !== "active" ? hit : null;
  },
  // Same de-dup for one session's detail — it polls too while the session is
  // live, and that page is the kill switch.
  loadSupportSession: (sessionId, { signal } = {}) =>
    sharedGet(_sessionDetailInFlight, sessionId, `/superadmin/support-sessions/${sessionId}`, { signal }, (res) => {
      _sessionDetailCache.set(sessionId, res.data);
      if (_sessionDetailCache.size > SESSION_CACHE_MAX) {
        _sessionDetailCache.delete(_sessionDetailCache.keys().next().value);
      }
      return res.data;
    }),
  revokeSupportSession: (sessionId) => {
    invalidateSupportSessionsCache();
    return axiosInstance.post(`/superadmin/support-sessions/${sessionId}/revoke`);
  },
  // Panic switch — ends every live impersonation session at once (or just one
  // tenant's, with { organisationId }).
  revokeAllSupportSessions: (body) => {
    invalidateSupportSessionsCache();
    return axiosInstance.post(`/superadmin/support-sessions/revoke-all`, body || {});
  },

  // Global platform operator audit log
  getAuditLog: (params) => axiosInstance.get("/superadmin/audit", { params }),
  getAuditLogCached: (params) => _auditCache.get(JSON.stringify(params))?.data || null,
  // How long ago this page/filter combo was fetched, or Infinity if never. The
  // screen uses it to decide whether a cache hit is fresh enough to stand on
  // its own or should be revalidated behind the rendered rows: OUR actions
  // clear this cache, but another operator's writes land in the log unnoticed.
  getAuditLogAge: (params) => {
    const hit = _auditCache.get(JSON.stringify(params));
    return hit ? Date.now() - hit.at : Infinity;
  },
  loadAuditLog: (params, { signal } = {}) => {
    const key = JSON.stringify(params);
    // De-duped per page/filter combo: a mount + a revalidate, or a filter
    // toggled off and back on, used to fire the same request twice.
    return sharedGet(_auditInFlight, key, "/superadmin/audit", { params, signal }, (res) => {
      _auditCache.set(key, { data: res.data, at: Date.now() });
      // Bounded: paging deep into a long log kept every page's 50 entries for
      // the whole session. Oldest key out first (Map preserves insertion).
      if (_auditCache.size > AUDIT_CACHE_MAX) _auditCache.delete(_auditCache.keys().next().value);
      return res.data;
    });
  },
  invalidateAuditCache: () => invalidateAuditCache(),

  getBillingStats: () => {
    if (_billingCache) return Promise.resolve(_billingCache);
    if (_billingInFlight) return _billingInFlight;
    _billingInFlight = axiosInstance
      .get("/superadmin/billing")
      .then((res) => {
        _billingCache = res;
        return res;
      })
      .finally(() => {
        _billingInFlight = null;
      });
    return _billingInFlight;
  },

  // Synchronous peek — lets the dashboard paint from the last known figures
  // instead of showing a full-screen loader on every revisit.
  getDashboardCached: () => _dashboardCache,

  getDashboardStats: ({ force = false } = {}) => {
    if (_dashboardCache && !force) return Promise.resolve(_dashboardCache);
    if (_dashboardInFlight) return _dashboardInFlight; // de-dupes forced calls too
    _dashboardInFlight = axiosInstance
      .get("/superadmin/dashboard")
      .then((res) => {
        _dashboardCache = res;
        return res;
      })
      .finally(() => {
        _dashboardInFlight = null;
      });
    return _dashboardInFlight;
  },

  getInvoices: (params) => axiosInstance.get("/superadmin/invoices", { params }),
  // Synchronous peek for a params combo (null until fetched this session).
  getInvoicesCached: (params) => _invoiceCache.get(JSON.stringify(params)) || null,
  loadInvoices: (params, { signal } = {}) => {
    const key = JSON.stringify(params);
    return axiosInstance.get("/superadmin/invoices", { params, signal }).then((res) => {
      _invoiceCache.set(key, res.data);
      return res.data;
    });
  },
  invalidateInvoicesCache: () => invalidateInvoicesCache(),

  // Coupons (Stripe-synced)
  getCoupons: () => axiosInstance.get("/superadmin/coupons"),
  getCouponsCached: () => {
    if (_couponsCache) return Promise.resolve(_couponsCache);
    if (_couponsInFlight) return _couponsInFlight;
    _couponsInFlight = axiosInstance
      .get("/superadmin/coupons")
      .then((res) => {
        _couponsCache = res;
        return res;
      })
      .finally(() => {
        _couponsInFlight = null;
      });
    return _couponsInFlight;
  },
  createCoupon: (body) => {
    invalidateCouponsCache();
    return axiosInstance.post("/superadmin/coupons", body);
  },
  archiveCoupon: (code) => {
    invalidateCouponsCache();
    return axiosInstance.post(`/superadmin/coupons/${code}/archive`);
  },
  // Not the inverse of archive: archiving deletes the Stripe coupon, so the
  // server has to recreate it. That can legitimately fail (expired, exhausted,
  // or a percent over 100), which is why this returns errors worth showing.
  restoreCoupon: (code) => {
    invalidateCouponsCache();
    return axiosInstance.post(`/superadmin/coupons/${code}/restore`);
  },
  // Only description + planCodes — a Stripe coupon's discount terms are
  // immutable, so changing those goes through replaceCoupon instead.
  updateCoupon: (code, body) => {
    invalidateCouponsCache();
    return axiosInstance.patch(`/superadmin/coupons/${code}`, body);
  },
  replaceCoupon: (code, body) => {
    invalidateCouponsCache();
    return axiosInstance.post(`/superadmin/coupons/${code}/replace`, body);
  },
  // Hard delete — the server refuses if the coupon has ever been redeemed.
  deleteCoupon: (code) => {
    invalidateCouponsCache();
    return axiosInstance.delete(`/superadmin/coupons/${code}`);
  },
  invalidateCouponsCache: () => invalidateCouponsCache(),

  // Plans (dynamic, Stripe-synced)
  getPlans: () => axiosInstance.get("/superadmin/plans"),
  // Session-cached variant for read-only consumers (list/detail/pickers) —
  // one request per session, invalidated by the plan mutations below.
  getPlansCached: () => {
    if (_plansCache) return Promise.resolve(_plansCache);
    if (_plansInFlight) return _plansInFlight;
    _plansInFlight = axiosInstance
      .get("/superadmin/plans")
      .then((res) => {
        _plansCache = res;
        return res;
      })
      .finally(() => {
        _plansInFlight = null;
      });
    return _plansInFlight;
  },
  createPlan: (body) => {
    invalidatePlansCache();
    return axiosInstance.post("/superadmin/plans", body);
  },
  updatePlan: (code, body) => {
    invalidatePlansCache();
    return axiosInstance.patch(`/superadmin/plans/${code}`, body);
  },
  // `confirm` acknowledges that active tenants are still on the plan — the API
  // answers 409 without it, so archiving can't quietly strand live subscribers.
  archivePlan: (code, { confirm = false } = {}) => {
    invalidatePlansCache();
    return axiosInstance.post(`/superadmin/plans/${code}/archive`, { confirm });
  },
  migratePlanSubscribers: (code, body) =>
    axiosInstance.post(`/superadmin/plans/${code}/migrate-subscribers`, body || {}),
  resyncPlan: (code) => {
    invalidatePlansCache();
    return axiosInstance.post(`/superadmin/plans/${code}/resync`);
  },

  // Per-plan feature flags + metered limits (the Features matrix)
  getFeatureCatalog: () => axiosInstance.get("/superadmin/feature-catalog"),
  // Static server config — cached permanently for the session.
  getFeatureCatalogCached: () => {
    if (_catalogCache) return Promise.resolve(_catalogCache);
    if (_catalogInFlight) return _catalogInFlight;
    _catalogInFlight = axiosInstance
      .get("/superadmin/feature-catalog")
      .then((res) => {
        _catalogCache = res;
        return res;
      })
      .finally(() => {
        _catalogInFlight = null;
      });
    return _catalogInFlight;
  },

  getPlanBullets: () => axiosInstance.get("/superadmin/plan-bullets"),
  getPlanBulletsCached: () => {
    if (_bulletsCache) return Promise.resolve(_bulletsCache);
    if (_bulletsInFlight) return _bulletsInFlight;
    _bulletsInFlight = axiosInstance
      .get("/superadmin/plan-bullets")
      .then((res) => {
        _bulletsCache = res;
        return res;
      })
      .finally(() => {
        _bulletsInFlight = null;
      });
    return _bulletsInFlight;
  },
  updatePlanBullets: (bullets) => {
    invalidateBulletsCache();
    return axiosInstance.put("/superadmin/plan-bullets", { bullets });
  },
  // Called by the realtime layer when another operator changes plans/bullets.
  invalidatePlansCache: () => invalidatePlansCache(),
  invalidateBulletsCache: () => invalidateBulletsCache(),
  saveEntitlements: (plans) => {
    invalidatePlansCache(); // entitlements live on the Plan docs
    return axiosInstance.put("/superadmin/entitlements", { plans });
  },

  // Support helpdesk (cross-tenant triage + kanban)
  getTickets: (params) => axiosInstance.get("/superadmin/tickets", { params }),
  getTicketBoard: () => axiosInstance.get("/superadmin/tickets/board"),
  getTicket: (id) => axiosInstance.get(`/superadmin/tickets/${id}`),
  // Triage changes a ticket's lane, classification and status — which the list
  // rows and the board cards both render. Flag them so their next mount
  // revalidates (previously nothing told them, which is why both screens
  // force-refetched on every visit as a blunt safety net).
  triageTicket: (id, body) => {
    _ticketsStale = true;
    _boardStale = true;
    return axiosInstance.patch(`/superadmin/tickets/${id}`, body);
  },

  // — Cached kanban board (see _board* above) —
  // Synchronous peek (null until first load).
  getTicketBoardCached: () => _boardCache,
  isBoardStale: () => _boardStale,
  markBoardStale: () => { _boardStale = true; },
  // Resolve to the board object. Cached + de-duped; { force } refetches.
  loadTicketBoard: ({ force = false } = {}) => {
    if (_boardCache && !force && !_boardStale) return Promise.resolve(_boardCache);
    if (_boardInFlight) return _boardInFlight; // de-dupe forced calls too
    _boardStale = false;
    _boardInFlight = axiosInstance
      .get("/superadmin/tickets/board")
      .then((res) => {
        _boardCache = res.data.board || null;
        _boardInFlight = null;
        return _boardCache;
      })
      .catch((err) => {
        _boardInFlight = null;
        throw err;
      });
    return _boardInFlight;
  },
  // Keep the board cache in step with optimistic drag-moves. No-op until the
  // board has loaded once (so the initial empty UI never seeds a false cache).
  setTicketBoardCache: (next) => {
    if (_boardCache === null) return;
    _boardCache = next;
  },
  clearTicketBoardCache: () => {
    _boardCache = null;
    _boardInFlight = null;
  },
  // A reply bumps updatedAt and the comment count shown on both surfaces.
  commentTicket: (id, body) => {
    _ticketsStale = true;
    _boardStale = true;
    return axiosInstance.post(`/superadmin/tickets/${id}/comment`, body);
  },

  // — Cached tickets list (SWR) —
  // Resolves to { tickets, total, truncated, stats } — `stats` is aggregated
  // server-side over the whole collection, so the headline figures stay right
  // even when the row list is capped.
  getTicketsCached: () => _ticketsCache,
  areTicketsStale: () => _ticketsStale,
  markTicketsStale: () => { _ticketsStale = true; },
  loadTickets: ({ force = false } = {}) => {
    // A warm, unchanged cache answers with no request at all.
    if (_ticketsCache && !force && !_ticketsStale) return Promise.resolve(_ticketsCache);
    // De-dupe even FORCED calls: a forced request used to skip this guard, so
    // StrictMode's double-mount (and a refresh landing on a socket refresh)
    // fired two identical requests.
    if (_ticketsInFlight) return _ticketsInFlight;
    // Cleared up front, not on resolve — an event arriving mid-flight must
    // leave the cache marked stale rather than be swallowed by this response.
    _ticketsStale = false;
    _ticketsInFlight = axiosInstance
      .get("/superadmin/tickets", { params: { limit: 1000 } })
      .then((res) => {
        _ticketsCache = {
          tickets: res.data.tickets || [],
          total: res.data.total ?? (res.data.tickets || []).length,
          truncated: !!res.data.truncated,
          stats: res.data.stats || null,
        };
        _ticketsInFlight = null;
        return _ticketsCache;
      })
      .catch((err) => {
        _ticketsInFlight = null;
        throw err;
      });
    return _ticketsInFlight;
  },
  // Keep the list cache's ROWS in step with optimistic local edits, preserving
  // the server-computed stats. No-op until first load.
  setTicketsCache: (rows) => {
    if (_ticketsCache === null) return;
    _ticketsCache = { ..._ticketsCache, tickets: rows };
  },

  // — Per-ticket detail cache —
  getCachedTicket: (id) => (id ? _ticketDetailCache.get(String(id)) || null : null),
  isTicketStale: (id) => _ticketDetailStale.has(String(id)),
  markTicketStale: (id) => { if (id) _ticketDetailStale.add(String(id)); },
  // Resolve to one ticket. Cached + de-duped per id; { force } refetches.
  loadTicket: (id, { force = false } = {}) => {
    const key = String(id);
    if (!force && _ticketDetailCache.has(key)) return Promise.resolve(_ticketDetailCache.get(key));
    if (!force && _ticketDetailInFlight.has(key)) return _ticketDetailInFlight.get(key);
    const p = axiosInstance
      .get(`/superadmin/tickets/${id}`)
      .then((res) => {
        const tk = res.data.ticket;
        _ticketDetailCache.set(key, tk);
        _ticketDetailStale.delete(key);
        _ticketDetailInFlight.delete(key);
        return tk;
      })
      .catch((err) => {
        _ticketDetailInFlight.delete(key);
        throw err;
      });
    _ticketDetailInFlight.set(key, p);
    return p;
  },
  // Refresh one ticket's cache after a local mutation (comment, triage, status).
  setTicketCache: (ticket) => {
    if (ticket?._id) {
      const key = String(ticket._id);
      _ticketDetailCache.set(key, ticket);
      _ticketDetailStale.delete(key);
    }
  },
  removeTicketCache: (id) => {
    const key = String(id);
    _ticketDetailCache.delete(key);
    _ticketDetailInFlight.delete(key);
    _ticketDetailStale.delete(key);
  },
  // Drop all ticket caches — used on dev hot-reload (stripped from production).
  clearTicketsCache: () => {
    _ticketsCache = null;
    _ticketsInFlight = null;
    _ticketDetailCache.clear();
    _ticketDetailInFlight.clear();
    _ticketDetailStale.clear();
  },

  // Branding requests
  getBrandingRequests: (status) =>
    axiosInstance.get(`/superadmin/branding-requests?status=${status || "pending"}`),

  getBrandingPendingCount: () => axiosInstance.get("/superadmin/branding-requests/pending-count"),

  approveBrandingRequest: (id, note) =>
    axiosInstance.patch(`/superadmin/branding-requests/${id}/approve`, { note }),

  rejectBrandingRequest: (id, note) =>
    axiosInstance.patch(`/superadmin/branding-requests/${id}/reject`, { note }),

  // Contact queries — split-inbox (internal notes, emailed replies, assignment)
  getContactQueries: (params) => axiosInstance.get("/superadmin/contact-queries", { params }),
  getContactQuery: (id) => axiosInstance.get(`/superadmin/contact-queries/${id}`),
  getContactStaff: () => axiosInstance.get("/superadmin/contact-queries/staff"),

  // — Cached inbox list + staff (see _cq* above) —
  // Synchronous peeks (null until first load; empty array = loaded-but-empty).
  getContactQueriesCached: () => _cqCache,
  getCachedContactStaff: () => _cqStaffCache,

  areContactQueriesStale: () => _cqStale,
  markContactQueriesStale: () => { _cqStale = true; },

  // Resolve to the queries array. Cached + de-duped; { force: true } refetches.
  loadContactQueries: ({ force = false } = {}) => {
    if (_cqCache && !force && !_cqStale) return Promise.resolve(_cqCache);
    // De-dupe FORCED calls too — the old `!force` guard let StrictMode's
    // double-mount fire two identical requests.
    if (_cqInFlight) return _cqInFlight;
    // Cleared up front so an event arriving mid-flight isn't swallowed.
    _cqStale = false;
    _cqInFlight = axiosInstance
      .get("/superadmin/contact-queries")
      .then((res) => {
        _cqCache = res.data.queries || [];
        _cqInFlight = null;
        return _cqCache;
      })
      .catch((err) => {
        _cqInFlight = null;
        throw err;
      });
    return _cqInFlight;
  },

  // Resolve to the staff array. Cached + de-duped (rarely changes).
  loadContactStaff: ({ force = false } = {}) => {
    if (_cqStaffCache && !force) return Promise.resolve(_cqStaffCache);
    if (_cqStaffInFlight && !force) return _cqStaffInFlight;
    _cqStaffInFlight = axiosInstance
      .get("/superadmin/contact-queries/staff")
      .then((res) => {
        _cqStaffCache = res.data.staff || [];
        _cqStaffInFlight = null;
        return _cqStaffCache;
      })
      .catch((err) => {
        _cqStaffInFlight = null;
        throw err;
      });
    return _cqStaffInFlight;
  },

  // Keep the list cache in step with the UI's optimistic/socket-driven updates,
  // so the next visit reflects the latest. No-op until the list has loaded once
  // (so the initial empty UI state never seeds a false "loaded" cache).
  setContactQueriesCache: (next) => {
    if (_cqCache === null) return;
    _cqCache = next;
  },

  // — Per-conversation detail cache —
  // Synchronous peek at a cached conversation (null if never opened this session).
  getCachedContactQuery: (id) => (id ? _cqDetailCache.get(String(id)) || null : null),
  // Has this thread been flagged as changed-while-closed?
  isContactQueryStale: (id) => _cqDetailStale.has(String(id)),
  // Flag a thread so the next open revalidates it (e.g. a socket said it changed).
  markContactQueryStale: (id) => { if (id) _cqDetailStale.add(String(id)); },

  // Resolve to one conversation. Cached + de-duped per id; { force } refetches
  // (and clears the stale flag). The GET also marks the thread read server-side.
  loadContactQuery: (id, { force = false } = {}) => {
    const key = String(id);
    if (!force && _cqDetailCache.has(key)) return Promise.resolve(_cqDetailCache.get(key));
    if (!force && _cqDetailInFlight.has(key)) return _cqDetailInFlight.get(key);
    const p = axiosInstance
      .get(`/superadmin/contact-queries/${id}`)
      .then((res) => {
        const q = res.data.query;
        _cqDetailCache.set(key, q);
        _cqDetailStale.delete(key);
        _cqDetailInFlight.delete(key);
        return q;
      })
      .catch((err) => {
        _cqDetailInFlight.delete(key);
        throw err;
      });
    _cqDetailInFlight.set(key, p);
    return p;
  },

  // Refresh one thread's cache after a local mutation (sent message, status or
  // assignment change) so reopening shows the latest with no request.
  setContactQueryCache: (query) => {
    if (query?._id) {
      const key = String(query._id);
      _cqDetailCache.set(key, query);
      _cqDetailStale.delete(key);
    }
  },
  removeContactQueryCache: (id) => {
    const key = String(id);
    _cqDetailCache.delete(key);
    _cqDetailInFlight.delete(key);
    _cqDetailStale.delete(key);
  },

  // Drop the caches so the next load hits the API again — used on dev hot-reload
  // (stripped from production builds).
  clearContactQueriesCache: () => {
    _cqCache = null;
    _cqInFlight = null;
    _cqStale = false;
    _cqStaffCache = null;
    _cqStaffInFlight = null;
    _cqDetailCache.clear();
    _cqDetailInFlight.clear();
    _cqDetailStale.clear();
  },
  getContactUnreadCount: () => axiosInstance.get("/superadmin/contact-queries/unread-count"),
  addContactMessage: (id, body) => axiosInstance.post(`/superadmin/contact-queries/${id}/messages`, body),
  updateContactQueryStatus: (id, data) => axiosInstance.patch(`/superadmin/contact-queries/${id}/status`, data),
  assignContactQuery: (id, userId) => axiosInstance.patch(`/superadmin/contact-queries/${id}/assign`, { userId }),
  markContactQueryRead: (id) => axiosInstance.post(`/superadmin/contact-queries/${id}/read`),
  deleteContactQuery: (id) => axiosInstance.delete(`/superadmin/contact-queries/${id}`),

  // Leads CRM — public "Express interest" capture, sales pipeline, convert-to-tenant.
  getLeadsNewCount: () => axiosInstance.get("/superadmin/leads/new-count"),
  getLeadStaff: () => axiosInstance.get("/superadmin/leads/staff"),

  // — Cached leads list (SWR, params-keyed like a search would need — kept
  // simple as a single slot since the list screen refetches on filter change) —
  getLeadsCached: () => _leadsCache,
  areLeadsStale: () => _leadsStale,
  markLeadsStale: () => { _leadsStale = true; },
  loadLeads: (params = {}, { force = false, signal } = {}) => {
    const isDefaultView = !params || Object.keys(params).length === 0;
    if (isDefaultView && _leadsCache && !force && !_leadsStale) return Promise.resolve(_leadsCache);
    if (isDefaultView && _leadsInFlight) return _leadsInFlight;
    if (isDefaultView) _leadsStale = false;
    const p = axiosInstance
      .get("/superadmin/leads", { params, signal })
      .then((res) => {
        if (isDefaultView) {
          _leadsCache = res.data;
          _leadsInFlight = null;
        }
        return res.data;
      })
      .catch((err) => {
        if (isDefaultView) _leadsInFlight = null;
        throw err;
      });
    if (isDefaultView) _leadsInFlight = p;
    return p;
  },
  setLeadsCache: (next) => {
    if (_leadsCache === null) return;
    _leadsCache = next;
  },

  // — Cached pipeline board (see _leadBoard* above) —
  getLeadBoardCached: () => _leadBoardCache,
  isLeadBoardStale: () => _leadBoardStale,
  markLeadBoardStale: () => { _leadBoardStale = true; },
  loadLeadBoard: ({ force = false } = {}) => {
    if (_leadBoardCache && !force && !_leadBoardStale) return Promise.resolve(_leadBoardCache);
    if (_leadBoardInFlight) return _leadBoardInFlight;
    _leadBoardStale = false;
    _leadBoardInFlight = axiosInstance
      .get("/superadmin/leads/board")
      .then((res) => {
        _leadBoardCache = res.data.board || null;
        _leadBoardInFlight = null;
        return _leadBoardCache;
      })
      .catch((err) => {
        _leadBoardInFlight = null;
        throw err;
      });
    return _leadBoardInFlight;
  },
  setLeadBoardCache: (next) => {
    if (_leadBoardCache === null) return;
    _leadBoardCache = next;
  },

  // — Cached assignable staff (rarely changes) —
  loadLeadStaff: ({ force = false } = {}) => {
    if (_leadStaffCache && !force) return Promise.resolve(_leadStaffCache);
    if (_leadStaffInFlight && !force) return _leadStaffInFlight;
    _leadStaffInFlight = axiosInstance
      .get("/superadmin/leads/staff")
      .then((res) => {
        _leadStaffCache = res.data.staff || [];
        _leadStaffInFlight = null;
        return _leadStaffCache;
      })
      .catch((err) => {
        _leadStaffInFlight = null;
        throw err;
      });
    return _leadStaffInFlight;
  },

  // — Per-lead detail cache —
  getCachedLead: (id) => (id ? _leadDetailCache.get(String(id)) || null : null),
  isLeadStale: (id) => _leadDetailStale.has(String(id)),
  markLeadStale: (id) => { if (id) _leadDetailStale.add(String(id)); },
  loadLead: (id, { force = false } = {}) => {
    const key = String(id);
    if (!force && _leadDetailCache.has(key) && !_leadDetailStale.has(key)) return Promise.resolve(_leadDetailCache.get(key));
    if (!force && _leadDetailInFlight.has(key)) return _leadDetailInFlight.get(key);
    const p = axiosInstance
      .get(`/superadmin/leads/${id}`)
      .then((res) => {
        const lead = res.data.lead;
        _leadDetailCache.set(key, lead);
        _leadDetailStale.delete(key);
        _leadDetailInFlight.delete(key);
        return lead;
      })
      .catch((err) => {
        _leadDetailInFlight.delete(key);
        throw err;
      });
    _leadDetailInFlight.set(key, p);
    return p;
  },
  setLeadCache: (lead) => {
    if (lead?._id) {
      const key = String(lead._id);
      _leadDetailCache.set(key, lead);
      _leadDetailStale.delete(key);
    }
  },
  removeLeadCache: (id) => {
    const key = String(id);
    _leadDetailCache.delete(key);
    _leadDetailInFlight.delete(key);
    _leadDetailStale.delete(key);
  },

  // Drop all lead caches — dev hot-reload only (stripped from production).
  clearLeadsCache: () => {
    _leadsCache = null;
    _leadsInFlight = null;
    _leadsStale = false;
    _leadBoardCache = null;
    _leadBoardInFlight = null;
    _leadBoardStale = false;
    _leadStaffCache = null;
    _leadStaffInFlight = null;
    _leadDetailCache.clear();
    _leadDetailInFlight.clear();
    _leadDetailStale.clear();
  },

  // Mutations — each flags the caches whose next mount should revalidate.
  updateLead: (id, data) => {
    _leadsStale = true;
    _leadBoardStale = true;
    return axiosInstance.patch(`/superadmin/leads/${id}`, data);
  },
  changeLeadStage: (id, data) => {
    _leadsStale = true;
    _leadBoardStale = true;
    return axiosInstance.patch(`/superadmin/leads/${id}/stage`, data);
  },
  addLeadMessage: (id, body) => axiosInstance.post(`/superadmin/leads/${id}/messages`, body),
  assignLead: (id, userId) => {
    _leadsStale = true;
    _leadBoardStale = true;
    return axiosInstance.patch(`/superadmin/leads/${id}/assign`, { userId });
  },
  convertLead: (id, data) => {
    _leadsStale = true;
    _leadBoardStale = true;
    return axiosInstance.post(`/superadmin/leads/${id}/convert`, data);
  },
  deleteLead: (id) => {
    _leadsStale = true;
    _leadBoardStale = true;
    return axiosInstance.delete(`/superadmin/leads/${id}`);
  },
  createLead: (data) => {
    _leadsStale = true;
    _leadBoardStale = true;
    return axiosInstance.post("/superadmin/leads", data);
  },
  // Light list for the "which lead is this task about?" picker.
  getLeadOptions: (search = "") =>
    axiosInstance.get("/superadmin/leads/options", { params: search ? { search } : {} }),

  /* ── CRM ───────────────────────────────────────────────────────────────── */

  // The overview is one query answering a whole screen, and every number on it
  // has to agree with the others — so it is never cached. A stale pipeline
  // total beside a live task count is exactly the disagreement the single
  // endpoint exists to prevent.
  loadCrmOverview: ({ signal } = {}) =>
    axiosInstance
      .get("/superadmin/crm/overview", { params: { tzOffset: tzOffset() }, signal })
      .then((res) => res.data.overview),

  /* ── CRM tasks ─────────────────────────────────────────────────────────── */

  // Uncached by design — see the note beside _taskBoardCache. Always passes the
  // caller's timezone so "today" and "overdue" mean their day, not the server's.
  loadTasks: (params = {}, { signal } = {}) =>
    axiosInstance
      .get("/superadmin/tasks", { params: { ...params, tzOffset: tzOffset() }, signal })
      .then((res) => res.data),

  getTaskBoardCached: () => _taskBoardCache,
  isTaskBoardStale: () => _taskBoardStale,
  markTaskBoardStale: () => { _taskBoardStale = true; },
  loadTaskBoard: (params = {}, { force = false } = {}) => {
    // Only the DEFAULT board is cached. A filtered board is a different set of
    // columns; storing it in the same slot would serve one operator's filter to
    // the next visit as though it were everything.
    const isDefault = !Object.values(params).some(Boolean);
    if (isDefault && _taskBoardCache && !force && !_taskBoardStale) return Promise.resolve(_taskBoardCache);
    if (isDefault && _taskBoardInFlight) return _taskBoardInFlight;
    if (isDefault) _taskBoardStale = false;
    const p = axiosInstance
      .get("/superadmin/tasks/board", { params: { ...params, tzOffset: tzOffset() } })
      .then((res) => {
        const board = res.data.board || {};
        if (isDefault) {
          _taskBoardCache = board;
          _taskBoardInFlight = null;
        }
        return board;
      })
      .catch((err) => {
        if (isDefault) _taskBoardInFlight = null;
        throw err;
      });
    if (isDefault) _taskBoardInFlight = p;
    return p;
  },
  setTaskBoardCache: (next) => {
    if (_taskBoardCache === null) return;
    _taskBoardCache = next;
  },

  getTaskStatsCached: () => _taskStatsCache,
  loadTaskStats: ({ force = false } = {}) => {
    if (_taskStatsCache && !force && !_taskStatsStale) return Promise.resolve(_taskStatsCache);
    if (_taskStatsInFlight) return _taskStatsInFlight;
    _taskStatsStale = false;
    _taskStatsInFlight = axiosInstance
      .get("/superadmin/tasks/stats", { params: { tzOffset: tzOffset() } })
      .then((res) => {
        _taskStatsCache = res.data.stats || null;
        _taskStatsInFlight = null;
        return _taskStatsCache;
      })
      .catch((err) => {
        _taskStatsInFlight = null;
        throw err;
      });
    return _taskStatsInFlight;
  },
  markTaskStatsStale: () => { _taskStatsStale = true; },

  // Reuses the leads staff list: both screens ask the same question ("which
  // operators hold the tenants capability?") of the same endpoint shape, so a
  // second cache would only mean a second identical request.
  loadTaskStaff: ({ force = false } = {}) => superadminService.loadLeadStaff({ force }),

  getCachedTask: (id) => (id ? _taskDetailCache.get(String(id)) || null : null),
  isTaskStale: (id) => _taskDetailStale.has(String(id)),
  markTaskStale: (id) => { if (id) _taskDetailStale.add(String(id)); },
  loadTask: (id, { force = false } = {}) => {
    const key = String(id);
    if (!force && _taskDetailCache.has(key) && !_taskDetailStale.has(key)) return Promise.resolve(_taskDetailCache.get(key));
    if (!force && _taskDetailInFlight.has(key)) return _taskDetailInFlight.get(key);
    const p = axiosInstance
      .get(`/superadmin/tasks/${id}`)
      .then((res) => {
        const task = res.data.task;
        _taskDetailCache.set(key, task);
        _taskDetailStale.delete(key);
        _taskDetailInFlight.delete(key);
        return task;
      })
      .catch((err) => {
        _taskDetailInFlight.delete(key);
        throw err;
      });
    _taskDetailInFlight.set(key, p);
    return p;
  },
  setTaskCache: (task) => {
    if (task?._id) {
      _taskDetailCache.set(String(task._id), task);
      _taskDetailStale.delete(String(task._id));
    }
  },
  removeTaskCache: (id) => {
    const key = String(id);
    _taskDetailCache.delete(key);
    _taskDetailInFlight.delete(key);
    _taskDetailStale.delete(key);
  },

  // Mutations. Every one invalidates the board, the stats and the two lead
  // views, because all four render some consequence of a task's state.
  createTask: (data) => {
    invalidateTaskViews();
    return axiosInstance.post("/superadmin/tasks", data);
  },
  updateTask: (id, data) => {
    invalidateTaskViews();
    return axiosInstance.patch(`/superadmin/tasks/${id}`, data);
  },
  changeTaskStatus: (id, data) => {
    invalidateTaskViews();
    return axiosInstance.patch(`/superadmin/tasks/${id}/status`, data);
  },
  assignTask: (id, userId) => {
    invalidateTaskViews();
    return axiosInstance.patch(`/superadmin/tasks/${id}/assign`, { userId });
  },
  addTaskComment: (id, body) => {
    _taskStatsStale = true;
    return axiosInstance.post(`/superadmin/tasks/${id}/comments`, body);
  },
  addTaskChecklistItem: (id, text) => axiosInstance.post(`/superadmin/tasks/${id}/checklist`, { text }),
  updateTaskChecklistItem: (id, itemId, data) => axiosInstance.patch(`/superadmin/tasks/${id}/checklist/${itemId}`, data),
  removeTaskChecklistItem: (id, itemId) => axiosInstance.delete(`/superadmin/tasks/${id}/checklist/${itemId}`),
  bulkTasks: (data) => {
    invalidateTaskViews();
    return axiosInstance.post("/superadmin/tasks/bulk", data);
  },
  deleteTask: (id) => {
    invalidateTaskViews();
    superadminService.removeTaskCache(id);
    return axiosInstance.delete(`/superadmin/tasks/${id}`);
  },

  // Drop every task cache — dev hot-reload only, like clearLeadsCache above.
  clearTasksCache: () => {
    _taskBoardCache = null;
    _taskBoardInFlight = null;
    _taskBoardStale = false;
    _taskStatsCache = null;
    _taskStatsInFlight = null;
    _taskStatsStale = false;
    _taskDetailCache.clear();
    _taskDetailInFlight.clear();
    _taskDetailStale.clear();
  },
};

export default superadminService;
