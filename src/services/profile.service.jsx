// services/profile.service.js
import axios from "./axios";

// Session-scoped cache so the profile is fetched at most once per page load.
// `_inFlight` dedupes concurrent callers (e.g. the admin layout hydrating the
// avatar AND the profile screen mounting) into a single network request.
// Mutations keep the cache fresh so nothing has to re-fetch.
let _profileCache = null;
let _inFlight = null;

class ProfileService {
  static BASE_URL = "/profile";
  static base_url="/users"

  // Synchronous peek at the cached profile (null if not loaded yet) — lets
  // callers skip the loading state on revisits within a session.
  static getCached() {
    return _profileCache;
  }

  static async getProfile({ force = false } = {}) {
    if (_profileCache && !force) return _profileCache;
    if (_inFlight && !force) return _inFlight;
    _inFlight = axios
      .get(this.BASE_URL)
      .then((response) => {
        _profileCache = response.data.profile;
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
