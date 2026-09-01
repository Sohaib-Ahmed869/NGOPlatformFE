import axiosInstance from "./axios";

// Session cache for the Team list — small and changes rarely. Kept WRITE-THROUGH
// rather than invalidated: every mutation below returns the updated row and the
// screen already merges it into its own state, so throwing the whole list away
// only bought a full refetch on the next visit. `setUsersCache` is how the
// screen publishes that state back here.
let _usersCache = null;
let _usersInFlight = null;
const invalidateUsersCache = () => {
  _usersCache = null;
};

// Same treatment for the tenant-admins tab, which is a separate request.
let _tenantAdminsCache = null;
let _tenantAdminsInFlight = null;

const superadminUsersService = {
  getUsersCached: () => _usersCache,
  // De-duped: StrictMode double-mounts the screen in dev, and a retry can land
  // while the first request is still open — both fired identical GETs.
  //
  // Deliberately takes NO caller signal. A de-duped request must never adopt
  // one caller's AbortController: the first mount's cleanup would cancel the
  // promise the second mount is awaiting, and that screen would sit on its
  // loader forever. If this ever needs cancellation, copy `sharedGet` from
  // superadmin.service.jsx, which refcounts the waiters.
  loadUsers: () => {
    if (_usersInFlight) return _usersInFlight;
    _usersInFlight = axiosInstance
      .get("/superadmin/users")
      .then((res) => {
        _usersCache = res.data;
        _usersInFlight = null;
        return res.data;
      })
      .catch((err) => {
        _usersInFlight = null;
        throw err;
      });
    return _usersInFlight;
  },
  // Keep the cached list in step with the screen's confirmed updates. No-op
  // until the list has loaded once, so an empty initial render can't seed a
  // false "loaded" cache.
  setUsersCache: (users) => {
    if (!_usersCache) return;
    _usersCache = { ..._usersCache, users };
  },
  invalidateUsersCache,

  // The tenant-admins tab on the same screen. Its own cache and in-flight slot
  // rather than a flag on the pair above: the two tabs are fetched independently
  // (the second one only when it is first opened), so sharing either would make
  // one tab's load look like the other's.
  getTenantAdminsCached: () => _tenantAdminsCache,
  loadTenantAdmins: () => {
    if (_tenantAdminsInFlight) return _tenantAdminsInFlight;
    _tenantAdminsInFlight = axiosInstance
      .get("/superadmin/users/tenant-admins")
      .then((res) => {
        _tenantAdminsCache = res.data;
        _tenantAdminsInFlight = null;
        return res.data;
      })
      .catch((err) => {
        _tenantAdminsInFlight = null;
        throw err;
      });
    return _tenantAdminsInFlight;
  },
  invalidateTenantAdminsCache: () => {
    _tenantAdminsCache = null;
  },
  /**
   * Fold a confirmed change into the cached tenant-admin list. Write-through
   * for the same reason the operator list is: every mutation below returns the
   * row's new state, so dropping the whole list would buy a refetch that can
   * only tell us what we already know.
   */
  patchTenantAdminCache: (id, patch) => {
    if (!_tenantAdminsCache?.users) return;
    _tenantAdminsCache = {
      ..._tenantAdminsCache,
      users: _tenantAdminsCache.users.map((u) => (u._id === id ? { ...u, ...patch } : u)),
    };
  },

  /* ── what an operator can do to a charity's own admin ──
     Separate endpoints from the operator ones above: the server guards these
     on `role: "admin"`, so neither set can reach the other population. */
  tenantAdmin: {
    setStatus: (id, status) =>
      axiosInstance.patch(`/superadmin/users/tenant-admins/${id}/status`, { status }).then((r) => r.data),
    forceLogout: (id) =>
      axiosInstance.post(`/superadmin/users/tenant-admins/${id}/force-logout`).then((r) => r.data),
    unlock: (id) =>
      axiosInstance.post(`/superadmin/users/tenant-admins/${id}/unlock`).then((r) => r.data),
    resetMfa: (id) =>
      axiosInstance.post(`/superadmin/users/tenant-admins/${id}/reset-2fa`).then((r) => r.data),
    sendPasswordReset: (id) =>
      axiosInstance.post(`/superadmin/users/tenant-admins/${id}/password-reset`).then((r) => r.data),
    setMfaPolicy: (id, mfaPolicy) =>
      axiosInstance.patch(`/superadmin/users/tenant-admins/${id}/mfa-policy`, { mfaPolicy }).then((r) => r.data),
  },

  inviteUser: (body) => axiosInstance.post("/superadmin/users", body),
  changeRole: (id, platformRole) => axiosInstance.patch(`/superadmin/users/${id}/role`, { platformRole }),
  changeStatus: (id, status) => axiosInstance.patch(`/superadmin/users/${id}/status`, { status }),
  // Correct the name/email on a PENDING invite. The server rotates the invite
  // token as part of this, so the previous link stops working immediately and a
  // fresh one is emailed to the (possibly new) address.
  updateInvite: (id, { name, email }) => axiosInstance.patch(`/superadmin/users/${id}/invite`, { name, email }),
  // Whether MFA is mandatory for one operator: "default" (follow the role),
  // "required" or "exempt". Enforced at their next sign-in.
  setMfaPolicy: (id, policy) => axiosInstance.patch(`/superadmin/users/${id}/mfa-policy`, { policy }),
  resendInvite: (id) => axiosInstance.post(`/superadmin/users/${id}/resend-invite`),
  forceLogout: (id) => axiosInstance.post(`/superadmin/users/${id}/force-logout`),

  // Public — accepting an invite happens before the person has any credentials.
  getInvite: (token) => axiosInstance.get(`/superadmin/users/accept-invite/${token}`).then((res) => res.data),
  acceptInvite: (token, password) =>
    axiosInstance.post(`/superadmin/users/accept-invite/${token}`, { password }).then((res) => res.data),

  // Public — forgot password (email -> 6-digit code -> verify -> reset), same
  // "no credentials yet" shape as the invite flow above.
  requestPasswordReset: (email) => axiosInstance.post("/superadmin/auth/forgot-password", { email }).then((res) => res.data),
  verifyResetCode: (email, code) => axiosInstance.post("/superadmin/auth/forgot-password/verify", { email, code }).then((res) => res.data),
  resetPasswordWithCode: (email, ticket, password) =>
    axiosInstance.post("/superadmin/auth/forgot-password/reset", { email, ticket, password }).then((res) => res.data),
};

export default superadminUsersService;
