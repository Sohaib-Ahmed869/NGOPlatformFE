import axiosInstance from "./axios";

/**
 * Per-tenant DESIGN system (fonts + shape + — later — layout variants).
 * Draft → Publish, mirroring the page CMS. The admin Branding screen edits the
 * draft; Publish copies it to the live design read by the public site.
 */
const designService = {
  get: () => axiosInstance.get("/branding/design").then((r) => r.data),
  saveDraft: (design) => axiosInstance.put("/branding/design", { design }).then((r) => r.data),
  publish: () => axiosInstance.post("/branding/design/publish").then((r) => r.data),
  discard: () => axiosInstance.post("/branding/design/discard").then((r) => r.data),
};

export default designService;
