// services/profile.service.js
import axios, { getStoragePrefix } from "./axios";

// Session-scoped cache so the profile is fetched at most once per page load.
// `_inFlight` dedupes concurrent callers (e.g. the admin layout hydrating the
// avatar AND the profile screen mounting) into a single network request.
// Mutations keep the cache fresh so nothing has to re-fetch.
//
// The cache is keyed to the auth TOKEN it was filled under, and that is not a
// detail. Signing out and back in as somebody else never reloads the page --
// logout, /login and the redirect to the dashboard are all client-side routing
// -- so a plain module-level cache outlives the session that filled it. The
// second operator was shown the FIRST one's avatar in the console topbar,
// because their own account has no profileImage and the fallback happily
// served whatever was still cached. Comparing tokens makes a different session
// a cold cache by construction, for every consumer of this service rather than
// only the screen where it happened to be noticed.
let _profileCache = null;
let _cacheToken = null;
let _inFlight = null;

function authToken() {
  try {
    return localStorage.getItem(`${getStoragePrefix()}token`) || "";
  } catch {
    return "";
  }
}

function dropIfSessionChanged() {
  if (_cacheToken !== authToken()) {
    _profileCache = null;
    _cacheToken = null;
    _inFlight = null;
  }
}

class ProfileService {
  static BASE_URL = "/profile";
  static base_url="/users"

  // Synchronous peek at the cached profile (null if not loaded yet) — lets
  // callers skip the loading state on revisits within a session.
  static getCached() {
    dropIfSessionChanged();
    return _profileCache;
  }

  // Drop the cache so the next getProfile() hits the API again. Used on dev
  // hot-reload so a fresh call repopulates state (no-op/stripped in production).
  static clearCache() {
    _profileCache = null;
    _cacheToken = null;
    _inFlight = null;
  }

  static async getProfile({ force = false } = {}) {
    dropIfSessionChanged();
    if (_profileCache && !force) return _profileCache;
    if (_inFlight && !force) return _inFlight;
    // Captured now, not on resolve: if the session changes while this request
    // is in the air, the answer belongs to the old token and must not be
    // stamped as the new one's.
    const token = authToken();
    _inFlight = axios
      .get(this.BASE_URL)
      .then((response) => {
        _profileCache = response.data.profile;
        _cacheToken = token;
        _inFlight = null;
        return _profileCache;
      })
      .catch((error) => {
        _inFlight = null;
        console.error("Error fetching profile:", error);
        throw error.response?.data || error.message;
      });
    return _inFlight;
  }

  static async updateProfile(profileData) {
    try {
      const response = await axios.put(this.BASE_URL, profileData);
      _profileCache = response.data.profile; // keep cache in sync, no re-fetch
      _cacheToken = authToken();
      return response.data.profile;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error.response?.data || error.message;
    }
  }

  static async updateNotifications(notificationSettings) {
    try {
      const response = await axios.put(
        `${this.BASE_URL}/notifications`,
        notificationSettings
      );
      return response.data;
    } catch (error) {
      console.error("Error updating notifications:", error);
      throw error.response?.data || error.message;
    }
  }

  static async updatePassword(passwordData) {
    try {
      const response = await axios.put(
        `${this.base_url}/update-password`,
        passwordData
      );
      return response.data;
    } catch (error) {
      console.error("Error updating password:", error);
      throw error.response?.data || error.message;
    }
  }
  

  static async uploadProfileImage(imageFile) {
    try {
      const formData = new FormData();
      formData.append("profileImage", imageFile);

      const response = await axios.post(`${this.BASE_URL}/image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Keep the cache in step, like updateProfile does. Without this the
      // cached profile kept the OLD avatar after an upload, which is why the
      // screen had to force a refetch on every single mount.
      const url = response.data?.imageUrl || response.data?.profileImage;
      if (_profileCache && url) _profileCache = { ..._profileCache, profileImage: url };
      return response.data;
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw error.response?.data || error.message;
    }
  }

  static async updateTwoFactor(enabled) {
    try {
      const response = await axios.put(`${this.BASE_URL}/2fa`, { enabled });
      return response.data;
    } catch (error) {
      console.error("Error updating 2FA:", error);
      throw error.response?.data || error.message;
    }
  }

  static async signOutAllDevices() {
    try {
      const response = await axios.post(`${this.BASE_URL}/signout-all`);
      return response.data;
    } catch (error) {
      console.error("Error signing out all devices:", error);
      throw error.response?.data || error.message;
    }
  }
}

export default ProfileService;
