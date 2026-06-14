import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../services/axios";
import siteService from "../services/site.service";
import planLimitsConfig from "../config/planLimits";

const TenantContext = createContext(null);

/**
 * Parse the current hostname to determine tenant mode and slug.
 */
function parseTenantFromHostname() {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");

  // Bare domain (e.g., "localhost") → public SaaS homepage
  if (parts.length === 1) {
    return { tenantMode: "public", slug: null };
  }

  const subdomain = parts[0];

  // Admin subdomain → super admin portal
  if (subdomain === "admin") {
    return { tenantMode: "superadmin", slug: null };
  }

  // Any other subdomain → tenant portal
  if (subdomain !== "www") {
    return { tenantMode: "tenant", slug: subdomain };
  }

  return { tenantMode: "public", slug: null };
}

/**
 * Convert hex to RGB for rgba() usage in CSS.
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "0, 0, 0";
}

/**
 * Darken a hex color by a percentage (0-100).
 */
function darkenHex(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
  const B = Math.max((num & 0x0000ff) - amt, 0);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

/**
 * Inject CSS custom properties on <html> so ALL components can use them.
 * This applies theme colors to the entire portal: static pages, admin, donor pages.
 */
function applyBrandingCSS(branding) {
  const root = document.documentElement;
  if (!branding) return;

  const primary = branding.primaryColor || "#2C2418";
  const accent = branding.accentColor || "#C9A84C";
  const bg = branding.backgroundColor || "#FAF7F2";

  // Core colors
  root.style.setProperty("--tenant-primary", primary);
  root.style.setProperty("--tenant-accent", accent);
  root.style.setProperty("--tenant-bg", bg);

  // RGB variants for rgba() usage
  root.style.setProperty("--tenant-primary-rgb", hexToRgb(primary));
  root.style.setProperty("--tenant-accent-rgb", hexToRgb(accent));
  root.style.setProperty("--tenant-bg-rgb", hexToRgb(bg));

  // Derived colors for sidebars and dark surfaces
  const sidebarTop = darkenHex(primary, 10);
  const sidebarBottom = darkenHex(primary, 20);
  root.style.setProperty("--tenant-sidebar-top", sidebarTop);
  root.style.setProperty("--tenant-sidebar-bottom", sidebarBottom);

  // Light variants
  const primaryLight = darkenHex(primary, -15);
  root.style.setProperty("--tenant-primary-light", primaryLight);
  const accentLight = darkenHex(accent, -15);
  root.style.setProperty("--tenant-accent-light", accentLight);
}

/**
 * Apply the tenant's browser-tab identity: the document title and favicon.
 * - Title: branding.siteTitle, falling back to the org name, then a default.
 * - Favicon: branding.favicon, unless `faviconUseIcon` is set, in which case the
 *   collapsed/icon logo is used. Falls back through favicon → iconLogo → existing.
 */
function applyTenantHead(branding, orgName) {
  const title =
    (branding?.siteTitle && branding.siteTitle.trim()) ||
    orgName ||
    "Charity Platform";
  document.title = title;

  // Favicons sit on a (usually light) browser tab, so prefer the dark icon
  // variant, then the light icon. A dedicated favicon upload overrides both.
  const faviconUrl = branding
    ? branding.faviconUseIcon
      ? branding.iconLogoDark || branding.iconLogo || branding.favicon
      : branding.favicon || branding.iconLogoDark || branding.iconLogo
    : "";

  if (faviconUrl) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    // Let the browser infer the type from the URL; clear any stale type so a
    // PNG/SVG/ICO swap doesn't keep an incorrect MIME hint.
    link.removeAttribute("type");
    link.href = faviconUrl;
  }
}

export function TenantProvider({ children }) {
  const { tenantMode, slug } = parseTenantFromHostname();
  const [organisation, setOrganisation] = useState(null);
  const [loading, setLoading] = useState(tenantMode === "tenant");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tenantMode === "tenant" && slug) {
      setLoading(true);
      axiosInstance
        .get(`/saas/organisations/slug/${slug}`)
        .then((res) => {
          setOrganisation(res.data);
          setError(null);
          // Apply branding CSS vars + browser-tab identity (title + favicon)
          if (res.data.branding) {
            applyBrandingCSS(res.data.branding);
          }
          applyTenantHead(res.data.branding, res.data.name);
          // Warm the CMS content cache for every enabled page in the background,
          // so navigating to any page is instant (no loading flash).
          const pageKeys = (res.data.pages || [])
            .filter((p) => p.enabled !== false)
            .map((p) => p.key)
            .filter(Boolean);
          siteService.prefetchPages(pageKeys);
        })
        .catch((err) => {
          console.error("Failed to load organisation:", err);
          setError("Organisation not found");
          setOrganisation(null);
        })
        .finally(() => setLoading(false));
    }
  }, [tenantMode, slug]);

  const plan = organisation?.plan || null;
  const limits = plan ? planLimitsConfig[plan] : null;
  const branding = organisation?.branding || null;
  const pages = organisation?.pages || [];

  // Is a given route path an enabled page? Paths not managed by the CMS
  // (e.g. /login, /checkout) return true so they always render.
  const isPathEnabled = (path) => {
    const page = pages.find((p) => p.path === path);
    return page ? page.enabled : true;
  };

  const value = {
    tenantMode,
    slug,
    organisation,
    plan,
    limits,
    branding,
    pages,
    isPathEnabled,
    loading,
    error,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export default TenantContext;
