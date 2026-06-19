import axiosInstance from "./axios";

// ── Contact-queries session cache ────────────────────────────────────────────
// The inbox list + staff list are cached per page-load with in-flight de-dupe,
// so revisiting the screen is instant (no loader flash). It's a real-time inbox,
// so the screen still revalidates in the background and the cache is kept in
// sync by sockets/optimistic updates via setContactQueriesCache. `null` means
// "not loaded yet"; an array (even empty) means "loaded".
let _cqCache = null;
let _cqInFlight = null;
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

// Support tickets — list cache (SWR, real-time list) + per-ticket detail cache
// (keyed by id) so reopening a ticket is instant. `_ticketDetailStale` flags
// tickets that changed while their detail was closed → the next open revalidates.
let _ticketsCache = null;
let _ticketsInFlight = null;
const _ticketDetailCache = new Map();
const _ticketDetailInFlight = new Map();
const _ticketDetailStale = new Set();

const superadminService = {
  getStats: () => axiosInstance.get("/superadmin/stats"),

  getOrganisations: (params) =>
    axiosInstance.get("/superadmin/organisations", { params }),

  getOrganisation: (id) =>
    axiosInstance.get(`/superadmin/organisations/${id}`),

  updateOrgPlan: (id, plan) =>
    axiosInstance.patch(`/superadmin/organisations/${id}/plan`, { plan }),

  suspendOrg: (id) =>
    axiosInstance.patch(`/superadmin/organisations/${id}/suspend`),

  updateOrgStatus: (id, action) =>
    axiosInstance.patch(`/superadmin/organisations/${id}/status`, { action }),

  compOrg: (id, body) =>
    axiosInstance.post(`/superadmin/organisations/${id}/comp`, body),

  setOrgOverride: (id, body) =>
    axiosInstance.put(`/superadmin/organisations/${id}/override`, body),

  clearOrgOverride: (id) =>
    axiosInstance.delete(`/superadmin/organisations/${id}/override`),

  setOrgTrial: (id, trialEndsAt) =>
    axiosInstance.post(`/superadmin/organisations/${id}/trial`, { trialEndsAt }),

  // Support session / impersonation
  actAs: (id, body) =>
    axiosInstance.post(`/superadmin/organisations/${id}/act-as`, body || {}),

  endSupportSession: () =>
    axiosInstance.post(`/superadmin/support-session/end`),

  // Support-session audit + kill switch (platform operator view)
  getSupportSessions: (params) =>
    axiosInstance.get("/superadmin/support-sessions", { params }),
  getSupportSession: (sessionId) =>
    axiosInstance.get(`/superadmin/support-sessions/${sessionId}`),
  revokeSupportSession: (sessionId) =>
    axiosInstance.post(`/superadmin/support-sessions/${sessionId}/revoke`),

  // Global platform operator audit log
  getAuditLog: (params) => axiosInstance.get("/superadmin/audit", { params }),

  getBillingStats: () => axiosInstance.get("/superadmin/billing"),

  getDashboardStats: () => axiosInstance.get("/superadmin/dashboard"),

  getInvoices: (params) => axiosInstance.get("/superadmin/invoices", { params }),

  // Coupons (Stripe-synced)
  getCoupons: () => axiosInstance.get("/superadmin/coupons"),
  createCoupon: (body) => axiosInstance.post("/superadmin/coupons", body),
  archiveCoupon: (code) => axiosInstance.post(`/superadmin/coupons/${code}/archive`),

  // Plans (dynamic, Stripe-synced)
  getPlans: () => axiosInstance.get("/superadmin/plans"),
  createPlan: (body) => axiosInstance.post("/superadmin/plans", body),
  updatePlan: (code, body) => axiosInstance.patch(`/superadmin/plans/${code}`, body),
  archivePlan: (code) => axiosInstance.post(`/superadmin/plans/${code}/archive`),
  migratePlanSubscribers: (code, body) =>
    axiosInstance.post(`/superadmin/plans/${code}/migrate-subscribers`, body || {}),
  resyncPlan: (code) => axiosInstance.post(`/superadmin/plans/${code}/resync`),

  // Per-plan feature flags + metered limits (the Features matrix)
  getFeatureCatalog: () => axiosInstance.get("/superadmin/feature-catalog"),

  getPlanBullets: () => axiosInstance.get("/superadmin/plan-bullets"),
  updatePlanBullets: (bullets) => axiosInstance.put("/superadmin/plan-bullets", { bullets }),
  saveEntitlements: (plans) => axiosInstance.put("/superadmin/entitlements", { plans }),

  // Support helpdesk (cross-tenant triage + kanban)
  getTickets: (params) => axiosInstance.get("/superadmin/tickets", { params }),
  getTicketBoard: () => axiosInstance.get("/superadmin/tickets/board"),
  getTicket: (id) => axiosInstance.get(`/superadmin/tickets/${id}`),
  triageTicket: (id, body) => axiosInstance.patch(`/superadmin/tickets/${id}`, body),

  // — Cached kanban board (see _board* above) —
  // Synchronous peek (null until first load).
  getTicketBoardCached: () => _boardCache,
  // Resolve to the board object. Cached + de-duped; { force } refetches.
  loadTicketBoard: ({ force = false } = {}) => {
    if (_boardCache && !force) return Promise.resolve(_boardCache);
    if (_boardInFlight && !force) return _boardInFlight;
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
  commentTicket: (id, body) => axiosInstance.post(`/superadmin/tickets/${id}/comment`, body),

  // — Cached tickets list (SWR) —
  getTicketsCached: () => _ticketsCache,
  loadTickets: ({ force = false } = {}) => {
    if (_ticketsCache && !force) return Promise.resolve(_ticketsCache);
    if (_ticketsInFlight && !force) return _ticketsInFlight;
    _ticketsInFlight = axiosInstance
      .get("/superadmin/tickets", { params: { limit: 1000 } })
      .then((res) => {
        _ticketsCache = res.data.tickets || [];
        _ticketsInFlight = null;
        return _ticketsCache;
      })
      .catch((err) => {
        _ticketsInFlight = null;
        throw err;
      });
    return _ticketsInFlight;
  },
  // Keep the list cache in step with socket refreshes. No-op until first load.
  setTicketsCache: (next) => {
    if (_ticketsCache === null) return;
    _ticketsCache = next;
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

  // Resolve to the queries array. Cached + de-duped; { force: true } refetches.
  loadContactQueries: ({ force = false } = {}) => {
    if (_cqCache && !force) return Promise.resolve(_cqCache);
    if (_cqInFlight && !force) return _cqInFlight;
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
};

export default superadminService;
