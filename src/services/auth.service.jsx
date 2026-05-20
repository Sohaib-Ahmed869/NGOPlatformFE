import axios from "./axios";
import { getStoragePrefix } from "./axios";

function prefixKey(key) {
  return getStoragePrefix() + key;
}

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

  handleError(error) {
    if (error.response) {
      throw new Error(error.response.data.error || "An error occurred");
    }
    throw new Error("Network error occurred");
  },
};
