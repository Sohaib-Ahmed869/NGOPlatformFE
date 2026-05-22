import axiosInstance from "./axios";

const settingsService = {
  getSettings: () => axiosInstance.get("/settings"),
  updateSettings: (data) => axiosInstance.put("/settings", data),
};

export default settingsService;
