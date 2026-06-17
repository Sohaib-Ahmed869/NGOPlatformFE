import axios from "./axios";
import { getStoragePrefix } from "./axios";

function prefixKey(key) {
  return getStoragePrefix() + key;
}

// Session-scoped cache for the user's 2FA status + in-flight de-dupe, so the
// Settings screen reads it at most once per page load instead of on every mount.
// Enable/disable keep it in sync, and logout clears it.
let _mfaStatusCache = null; // { enabled } | null
let _mfaStatusInFlight = null;

export default {
  async register(userData) {
    try {
      const response = await axios.post("/users/register", userData);
      if (response.data.token) {
        localStorage.setItem(prefixKey("token"), response.data.token);
        localStorage.setItem(prefixKey("user"), JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async login(credentials) {
    try {
      const response = await axios.post("/users/login", credentials);
      if (response.data.token) {
        localStorage.setItem(prefixKey("token"), response.data.token);

        // Make sure we preserve the passwordChangeRequired flag
        const userData = { ...response.data };
        localStorage.setItem(prefixKey("user"), JSON.stringify(userData));

        // If password change is required, also store this in a separate item
        // This ensures the requirement persists across page refreshes
        if (response.data.passwordChangeRequired) {
          localStorage.setItem(prefixKey("passwordChangeRequired"), "true");
        } else {
          localStorage.removeItem(prefixKey("passwordChangeRequired"));
        }
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async adminLogin(credentials) {
    try {
      const response = await axios.post("/users/loginAdmin", credentials);
      if (response.data.token) {
        localStorage.setItem(prefixKey("token"), response.data.token);
        localStorage.setItem(prefixKey("user"), JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async googleAuth(credential) {
    const response = await axios.post(`/users/auth/google`, {
      credential,
    });
    if (response.data.token) {
      localStorage.setItem(prefixKey("token"), response.data.token);
      localStorage.setItem(prefixKey("user"), JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout() {
    localStorage.removeItem(prefixKey("token"));
    localStorage.removeItem(prefixKey("user"));
    localStorage.removeItem(prefixKey("passwordChangeRequired"));
    _mfaStatusCache = null;
    _mfaStatusInFlight = null;
  },

  getCurrentUser() {
    const userStr = localStorage.getItem(prefixKey("user"));
    if (userStr) return JSON.parse(userStr);
    return null;
  },

  async instagramFeed() {
    const response = await axios.get(`/users/instagram-feed`, {});
    return response.data;
  },

  // ── Two-factor authentication ──
  // Synchronous peek at the cached 2FA status (null until first load).
  getCachedMfaStatus() {
    return _mfaStatusCache;
  },
  // Drop the cached 2FA status so the next mfaStatus() hits the API again. Used
  // on dev hot-reload so a fresh call repopulates state (stripped in production).
  clearMfaStatusCache() {
    _mfaStatusCache = null;
    _mfaStatusInFlight = null;
  },
  async mfaStatus({ force = false } = {}) {
    if (_mfaStatusCache && !force) return _mfaStatusCache;
    if (_mfaStatusInFlight && !force) return _mfaStatusInFlight;
    _mfaStatusInFlight = axios
      .get("/users/mfa/status")
      .then((response) => {
        _mfaStatusCache = response.data;
        _mfaStatusInFlight = null;
        return _mfaStatusCache;
      })
      .catch((error) => {
        _mfaStatusInFlight = null;
        throw error;
      });
    return _mfaStatusInFlight;
  },
  async mfaSetup() {
    const response = await axios.get("/users/mfa/setup");
    return response.data;
  },
  async mfaEnable(code) {
    const response = await axios.post("/users/mfa/enable", { code });
    _mfaStatusCache = { ...(_mfaStatusCache || {}), enabled: true }; // keep cache in sync
    return response.data;
  },
  async mfaDisable(code) {
    const response = await axios.post("/users/mfa/disable", { code });
    _mfaStatusCache = { ...(_mfaStatusCache || {}), enabled: false }; // keep cache in sync
    return response.data;
  },

  handleError(error) {
    if (error.response) {
      throw new Error(error.response.data.error || "An error occurred");
    }
    throw new Error("Network error occurred");
  },
};
