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
