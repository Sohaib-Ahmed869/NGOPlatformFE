import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import PageLoader from "../../components/PageLoader";
import {
  Upload,
  Trash2,
  Check,
  Palette,
  Image,
  Type,
  Eye,
  Loader2,
  Sun,
  Moon,
  Send,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import brandingService from "../../services/branding.service";
import themeCategories, { getThemeById } from "../../config/themePresets";
import toast from "react-hot-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08 },
  }),
};

// Theme presets are now loaded from config/themePresets.js

export default function Branding() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [requests, setRequests] = useState([]);
  const [requestMsg, setRequestMsg] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [activeThemeCategory, setActiveThemeCategory] = useState("warm");
  const fileInputRef = useRef(null);

  const [branding, setBranding] = useState({
    logo: "",
    primaryColor: "#2C2418",
    accentColor: "#C9A84C",
    backgroundColor: "#FAF7F2",
    theme: "default",
    tagline: "",
  });

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await brandingService.getBranding();
        setOrgName(res.data.name);
        setOrgSlug(res.data.slug);
        setBranding({
          logo: res.data.branding?.logo || "",
          primaryColor: res.data.branding?.primaryColor || "#2C2418",
          accentColor: res.data.branding?.accentColor || "#C9A84C",
          backgroundColor: res.data.branding?.backgroundColor || "#FAF7F2",
          theme: res.data.branding?.theme || "default",
          tagline: res.data.branding?.tagline || "",
        });
      } catch (err) {
        console.error("Failed to fetch branding:", err);
        toast.error("Failed to load branding settings");
      } finally {
        setLoading(false);
      }
    };
    const fetchRequests = async () => {
      try {
        const res = await brandingService.getMyRequests();
        setRequests(res.data);
      } catch (err) {
        // Silently fail — requests are optional
      }
    };
    fetchBranding();
    fetchRequests();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await brandingService.updateBranding({
        primaryColor: branding.primaryColor,
        accentColor: branding.accentColor,
        backgroundColor: branding.backgroundColor,
        theme: branding.theme,
        tagline: branding.tagline,
      });
      toast.success("Branding updated — reloading...");
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      toast.error("Failed to update branding");
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await brandingService.uploadLogo(formData);
      setBranding((prev) => ({ ...prev, logo: res.data.logo }));
      toast.success("Logo uploaded — reloading...");
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteLogo = async () => {
    try {
      await brandingService.deleteLogo();
      setBranding((prev) => ({ ...prev, logo: "" }));
      toast.success("Logo removed — reloading...");
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error("Failed to remove logo");
    }
  };

  const applyTheme = (themeKey) => {
    const preset = getThemeById(themeKey);
    if (preset) {
      setBranding((prev) => ({
        ...prev,
        theme: themeKey,
        primaryColor: preset.primary,
        accentColor: preset.accent,
        backgroundColor: preset.bg,
      }));
    }
  };

  const handleSubmitRequest = async () => {
    setSubmittingRequest(true);
    try {
      await brandingService.submitRequest({
        requestedBranding: branding,
        message: requestMsg,
      });
      toast.success("Branding change request submitted for review");
      setRequestMsg("");
      const res = await brandingService.getMyRequests();
      setRequests(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) {
    return (
      <PageLoader />
    );
  }

  return (
    <motion.div initial="hidden" animate="visible">
      <motion.div
        variants={fadeUp}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">
            Portal Branding
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Customise how your portal looks to donors and visitors
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent-light disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Settings ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logo */}
          <motion.div
            variants={fadeUp}
            custom={1}
            className="bg-white rounded-2xl border border-gray-100 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-primary">Logo</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                {branding.logo ? (
                  <img
                    src={branding.logo}
                    alt="Organisation logo"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <Upload className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-text-muted mb-3">
                  Upload your organisation's logo. Recommended: 512x512px, PNG
                  or SVG. Max 2MB.
                </p>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {uploading ? "Uploading..." : "Upload Logo"}
                  </button>
                  {branding.logo && (
                    <button
                      onClick={handleDeleteLogo}
                      className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Theme Selector */}
          <motion.div
            variants={fadeUp}
            custom={2}
            className="bg-white rounded-2xl border border-gray-100 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-primary">
                Theme Preset
              </h2>
            </div>
            <p className="text-sm text-text-muted mb-4">
              Pick a preset theme or customise individual colours below.
            </p>
            {/* Category tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {themeCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveThemeCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeThemeCategory === cat.id
                      ? "bg-accent text-white"
                      : "bg-gray-100 text-text-muted hover:bg-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {themeCategories
                .find((c) => c.id === activeThemeCategory)
                ?.themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => applyTheme(theme.id)}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                      branding.theme === theme.id
                        ? "border-accent shadow-md shadow-accent/10"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    {branding.theme === theme.id && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <div className="flex gap-1 mb-1.5">
                      <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: theme.primary }} />
                      <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: theme.accent }} />
                      <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: theme.bg }} />
                    </div>
                    <p className="text-xs font-medium text-primary truncate">{theme.name}</p>
                    <p className="text-[10px] text-text-muted truncate">{theme.desc}</p>
                  </button>
                ))}
            </div>
          </motion.div>

          {/* Custom Colors */}
          <motion.div
            variants={fadeUp}
            custom={3}
            className="bg-white rounded-2xl border border-gray-100 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sun className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-primary">
                Custom Colours
              </h2>
            </div>
            <p className="text-sm text-text-muted mb-5">
              Fine-tune individual colours. These override the theme preset.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  label: "Primary Colour",
                  key: "primaryColor",
                  hint: "Text and headings",
                },
                {
                  label: "Accent Colour",
                  key: "accentColor",
                  hint: "Buttons and highlights",
                },
                {
                  label: "Background",
                  key: "backgroundColor",
                  hint: "Page background",
                },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-primary mb-1">
                    {field.label}
                  </label>
                  <p className="text-xs text-text-muted mb-2">{field.hint}</p>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        value={branding[field.key]}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer appearance-none p-0.5"
                      />
                    </div>
                    <input
                      type="text"
                      value={branding[field.key]}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.div
            variants={fadeUp}
            custom={4}
            className="bg-white rounded-2xl border border-gray-100 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-primary">Tagline</h2>
            </div>
            <p className="text-sm text-text-muted mb-3">
              A short tagline shown below your logo in the navigation bar.
            </p>
            <input
              type="text"
              value={branding.tagline}
              onChange={(e) =>
                setBranding((prev) => ({
                  ...prev,
                  tagline: e.target.value,
                }))
              }
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
              placeholder="e.g., Empowering communities since 2010"
              maxLength={80}
            />
            <p className="text-xs text-text-muted mt-1.5 text-right">
              {branding.tagline.length}/80
            </p>
          </motion.div>
        </div>

        {/* ── Right: Live Preview ── */}
        <motion.div variants={fadeUp} custom={2} className="lg:col-span-1">
          <div className="sticky top-8">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-primary">
                Live Preview
              </h2>
            </div>

            {/* Browser mockup */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
              {/* Browser chrome */}
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded-full h-5 ml-2 flex items-center px-3">
                  <span className="text-[9px] text-gray-400">
                    {orgSlug}.localhost:5173
                  </span>
                </div>
              </div>

              {/* Preview content */}
              <div
                className="transition-colors duration-300"
                style={{ backgroundColor: branding.backgroundColor }}
              >
                {/* Navbar preview */}
                <div
                  className="px-4 py-3 flex items-center justify-between border-b transition-colors duration-300"
                  style={{
                    borderColor: branding.accentColor + "20",
                  }}
                >
                  <div className="flex items-center gap-2">
                    {branding.logo ? (
                      <img
                        src={branding.logo}
                        alt="Logo"
                        className="w-6 h-6 rounded object-contain"
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-white text-[8px] font-bold transition-colors duration-300"
                        style={{ backgroundColor: branding.accentColor }}
                      >
                        {orgName?.charAt(0) || "N"}
                      </div>
                    )}
                    <div>
                      <span
                        className="text-[10px] font-bold block leading-tight transition-colors duration-300"
                        style={{ color: branding.primaryColor }}
                      >
                        {orgName || "Your Organisation"}
                      </span>
                      {branding.tagline && (
                        <span className="text-[7px] text-gray-400 block leading-tight">
                          {branding.tagline}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="px-2 py-0.5 rounded text-white text-[7px] font-bold transition-colors duration-300"
                    style={{ backgroundColor: branding.accentColor }}
                  >
                    Donate
                  </div>
                </div>

                {/* Hero preview */}
                <div className="px-4 py-6 text-center">
                  <p
                    className="text-sm font-bold mb-1 transition-colors duration-300"
                    style={{ color: branding.primaryColor }}
                  >
                    Make a Difference
                  </p>
                  <p className="text-[8px] text-gray-400 mb-3">
                    {branding.tagline ||
                      "Support our cause and change lives today"}
                  </p>
                  <div className="flex justify-center gap-2">
                    <div
                      className="px-3 py-1 rounded text-white text-[8px] font-bold transition-colors duration-300"
                      style={{ backgroundColor: branding.accentColor }}
                    >
                      Donate Now
                    </div>
                    <div
                      className="px-3 py-1 rounded text-[8px] font-bold border transition-colors duration-300"
                      style={{
                        color: branding.primaryColor,
                        borderColor: branding.primaryColor + "30",
                      }}
                    >
                      Learn More
                    </div>
                  </div>
                </div>

                {/* Cards preview */}
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  {["Education", "Health"].map((title) => (
                    <div
                      key={title}
                      className="bg-white rounded-lg p-2 border border-gray-100"
                    >
                      <div
                        className="w-full h-8 rounded mb-1.5 transition-colors duration-300"
                        style={{
                          backgroundColor: branding.accentColor + "15",
                        }}
                      />
                      <p
                        className="text-[8px] font-bold mb-0.5 transition-colors duration-300"
                        style={{ color: branding.primaryColor }}
                      >
                        {title}
                      </p>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-colors duration-300"
                          style={{
                            backgroundColor: branding.accentColor,
                            width: title === "Education" ? "65%" : "40%",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-text-muted text-center mt-3">
              Preview updates in real-time as you edit
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Request Super Admin Change ── */}
      <motion.div
        variants={fadeUp}
        custom={6}
        className="mt-8 bg-white rounded-2xl border border-gray-100 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-primary">
            Request Branding Change
          </h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Need a custom branding setup or want the platform admin to review your
          changes before they go live? Submit a request with your current
          settings.
        </p>

        <textarea
          value={requestMsg}
          onChange={(e) => setRequestMsg(e.target.value)}
          placeholder="Add a note for the admin (optional)..."
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none mb-4"
          rows={3}
        />

        <button
          onClick={handleSubmitRequest}
          disabled={submittingRequest}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-light disabled:opacity-50 transition-colors"
        >
          {submittingRequest ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {submittingRequest ? "Submitting..." : "Submit Request for Review"}
        </button>

        {/* Request history */}
        {requests.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-primary mb-3">
              Previous Requests
            </h3>
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req._id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    {req.status === "pending" && (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                    {req.status === "approved" && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {req.status === "rejected" && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm text-primary capitalize">
                        {req.status}
                      </p>
                      <p className="text-xs text-text-muted">
                        {new Date(req.createdAt).toLocaleDateString()}
                        {req.reviewNote && ` — ${req.reviewNote}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {req.requestedBranding?.primaryColor && (
                      <div
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{
                          backgroundColor: req.requestedBranding.primaryColor,
                        }}
                      />
                    )}
                    {req.requestedBranding?.accentColor && (
                      <div
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{
                          backgroundColor: req.requestedBranding.accentColor,
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
