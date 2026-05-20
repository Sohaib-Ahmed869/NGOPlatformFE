import axiosInstance from "./axios";

const brandingService = {
  getBranding: () => axiosInstance.get("/branding"),

  updateBranding: (data) => axiosInstance.put("/branding", data),

  uploadLogo: (formData) =>
    axiosInstance.post("/branding/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  deleteLogo: () => axiosInstance.delete("/branding/logo"),

  getThemes: () => axiosInstance.get("/branding/themes"),

  // Branding change requests
  submitRequest: (data) => axiosInstance.post("/branding/request", data),
  getMyRequests: () => axiosInstance.get("/branding/requests"),
};

export default brandingService;
