import axiosInstance from "./axios";

// Session cache for the Team list — small, changes rarely, invalidated on
// every mutation below. Same shape as superadmin.service.jsx's caches.
let _usersCache = null;
const invalidateUsersCache = () => {
  _usersCache = null;
};

const superadminUsersService = {
  getUsersCached: () => _usersCache,
  loadUsers: ({ signal } = {}) =>
    axiosInstance.get("/superadmin/users", { signal }).then((res) => {
      _usersCache = res.data;
      return res.data;
    }),
  invalidateUsersCache,

  inviteUser: (body) => {
    invalidateUsersCache();
    return axiosInstance.post("/superadmin/users", body);
  },
  changeRole: (id, platformRole) => {
    invalidateUsersCache();
    return axiosInstance.patch(`/superadmin/users/${id}/role`, { platformRole });
  },
  changeStatus: (id, status) => {
    invalidateUsersCache();
    return axiosInstance.patch(`/superadmin/users/${id}/status`, { status });
  },
  resendInvite: (id) => axiosInstance.post(`/superadmin/users/${id}/resend-invite`),
  forceLogout: (id) => axiosInstance.post(`/superadmin/users/${id}/force-logout`),

  // Public — accepting an invite happens before the person has any credentials.
  getInvite: (token) => axiosInstance.get(`/superadmin/users/accept-invite/${token}`).then((res) => res.data),
  acceptInvite: (token, password) =>
    axiosInstance.post(`/superadmin/users/accept-invite/${token}`, { password }).then((res) => res.data),
};

export default superadminUsersService;
