import axios from "axios";
import toast from "react-hot-toast";

const baseURL = `${import.meta.env.VITE_API_BASE_URL}/api`;
const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get a storage key prefix based on the current subdomain.
 * E.g., on "hopegivefoundation.localhost" → "hopegivefoundation_"
 * On "admin.localhost" → "admin_"
 * On bare "localhost" → ""
 */
export function getStoragePrefix() {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length > 1 && parts[0] !== "www") {
    return parts[0] + "_";
  }
  return "";
}

// Add a request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const prefix = getStoragePrefix();
    const token = localStorage.getItem(prefix + "token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Inject tenant slug header for subdomain-based tenant resolution
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[0] !== "admin" && parts[0] !== "www") {
      config.headers["X-Tenant-Slug"] = parts[0];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const prefix = getStoragePrefix();
      localStorage.removeItem(prefix + "token");
      localStorage.removeItem(prefix + "user");
    }
    // A view-only support session blocks writes server-side — surface a friendly
    // message instead of a generic failure.
    if (error.response?.status === 403 && error.response?.data?.code === "VIEW_ONLY") {
      toast.error(error.response.data.error || "View-only support session — changes are disabled");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
