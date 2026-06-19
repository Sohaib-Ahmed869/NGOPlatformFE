import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "../services/axios";
import siteService from "../services/site.service";
import planLimitsConfig from "../config/planLimits";
import { resolveDesign, FONT_MAP, ROUNDNESS_MAP, BORDER_WIDTH_MAP, SHADOW_MAP } from "../config/designTokens";

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
// Set all the tenant colour CSS vars (core + rgb + derived sidebar/light) from a
// primary/accent/background triple. Shared by branding and the design system.
function applyColorVars(primary, accent, bg) {
  const root = document.documentElement;
  root.style.setProperty("--tenant-primary", primary);
  root.style.setProperty("--tenant-accent", accent);
  root.style.setProperty("--tenant-bg", bg);
  root.style.setProperty("--tenant-primary-rgb", hexToRgb(primary));
  root.style.setProperty("--tenant-accent-rgb", hexToRgb(accent));
  root.style.setProperty("--tenant-bg-rgb", hexToRgb(bg));
  root.style.setProperty("--tenant-sidebar-top", darkenHex(primary, 10));
  root.style.setProperty("--tenant-sidebar-bottom", darkenHex(primary, 20));
  root.style.setProperty("--tenant-primary-light", darkenHex(primary, -15));
  root.style.setProperty("--tenant-accent-light", darkenHex(accent, -15));
}

function applyBrandingCSS(branding) {
  if (!branding) return;
  applyColorVars(
    branding.primaryColor || "#2C2418",
    branding.accentColor || "#C9A84C",
    branding.backgroundColor || "#FAF7F2",
  );
}

/** Load a Google font stylesheet once (no-op for the serif default / no web font). */
function loadGoogleFont(font) {
  if (!font || !font.google) return;
  const id = `gfont-${font.id}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Apply the tenant's per-tenant DESIGN (fonts + shape) as CSS vars on <html>.
 * Fonts set --font-heading/body/nav for the PUBLIC site only (admin + user
 * portals override these via [data-admin-theme]/[data-user-portal]). Shape sets
 * the radius, border-width and card-shadow CSS vars. Empty design → baseline
 * (serif + square), i.e. no change from today.
 */
function applyDesign(design) {
  const root = document.documentElement;
  const d = resolveDesign(design);

  ["heading", "body", "nav"].forEach((role) => {
    const font = FONT_MAP[d.fonts[role]] || FONT_MAP.serif;
    if (font.id === "serif") {
      // Fall back to the Tailwind serif default (keeps the current look).
      root.style.removeProperty(`--font-${role}`);
    } else {
      root.style.setProperty(`--font-${role}`, font.stack);
      loadGoogleFont(font);
    }
  });

  const applyVars = (map, id) => {
    const opt = map[id];
    if (opt) Object.entries(opt.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  };
  applyVars(ROUNDNESS_MAP, d.shape.roundness);
  applyVars(BORDER_WIDTH_MAP, d.shape.borderWidth);
  applyVars(SHADOW_MAP, d.shape.shadow);

  // A template can carry a colour palette. On the public site this already lives
  // in branding (publish writes it there), so this is a no-op match; in the
  // design-preview iframe it's what makes the draft colours show.
  if (d.colors && d.colors.primary && d.colors.accent && d.colors.bg) {
    applyColorVars(d.colors.primary, d.colors.accent, d.colors.bg);
  }
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
  // Platform-wide branding/contact for the public marketing site (bare/www).
  const [platform, setPlatform] = useState(null);

  // Design-preview mode: when the page is loaded in the admin's Design tab iframe
  // (?designPreview=1), apply the unsaved DRAFT design posted from the parent so
  // the real portal renders exactly as it would look once published.
  const isDesignPreview =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("designPreview") === "1";
  const [previewDesign, setPreviewDesign] = useState(null);
  useEffect(() => {
    if (!isDesignPreview) return;
    const onMsg = (e) => {
      if (e.data?.type === "design-preview" && e.data.design) {
        setPreviewDesign(e.data.design);
        applyDesign(e.data.design);
      }
    };
    window.addEventListener("message", onMsg);
    // Tell the parent we're mounted so it sends the current draft.
    try {
      window.parent?.postMessage({ type: "design-preview-ready" }, "*");
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener("message", onMsg);
  }, [isDesignPreview]);

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
          applyDesign(res.data.design);
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

  // Re-fetch the platform's public branding/contact. Exposed via context so the
  // SuperAdmin → Platform screen can call it right after saving and the browser
  // tab (+ loader + marketing colours) update INSTANTLY, with no page reload.
  const refreshPlatform = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/platform/public");
      setPlatform(res.data);
      return res.data;
    } catch (err) {
      console.error("Failed to load platform settings:", err);
      return null;
    }
  }, []);

  // On the public marketing site AND the operator console, load the platform's
  // own branding + contact so the navbar/footer/colours (public) and the branded
  // loader (superadmin) render dynamically (edited in SuperAdmin → Platform).
  useEffect(() => {
    if (tenantMode !== "public" && tenantMode !== "superadmin") return;
    refreshPlatform();
  }, [tenantMode, refreshPlatform]);

  // Keep the browser tab (title + favicon) in sync with the platform brand —
  // re-runs whenever `platform` changes, so an in-app settings save reflects live.
  useEffect(() => {
    if (!platform) return;
    if (platform.name) document.title = platform.name;
    // Favicon: explicit favicon, else the dark icon (sits on a light tab), the
    // light icon, then the full logo — so the tab reflects the brand whenever
    // ANY branding image is set.
    const faviconUrl = platform.favicon || platform.iconLogoDark || platform.iconLogo || platform.logoDark || platform.logo || "";
    if (faviconUrl) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.removeAttribute("type");
      link.href = faviconUrl;
    }
  }, [platform]);

  const plan = organisation?.plan || null;
  // Server-resolved plan entitlements (feature flags + metered limits, override
  // already merged). Falls back to the static mirror only before the org loads.
  const entitlements = organisation?.entitlements || { features: {}, limits: {} };
  const limits =
    organisation?.entitlements?.limits || (plan ? planLimitsConfig[plan] : null);
  // In design-preview mode the posted draft wins so navbar/footer render their
  // draft layout variants; otherwise the published design drives the site.
  const design = isDesignPreview && previewDesign ? resolveDesign(previewDesign) : resolveDesign(organisation?.design);
  const baseBranding = organisation?.branding || null;
  // A template's colour palette is applied as CSS vars, but components that read
  // branding.* hex directly (e.g. the home Hero, which computes gradients) won't
  // see those. In preview, merge the draft palette into branding so JS-driven
  // colours update too. (On the live site, publish writes design.colors →
  // branding, so this is preview-only; a palette-less template keeps the tenant's.)
  const branding =
    isDesignPreview && design?.colors
      ? { ...(baseBranding || {}), primaryColor: design.colors.primary, accentColor: design.colors.accent, backgroundColor: design.colors.bg }
      : baseBranding;
  const pages = organisation?.pages || [];

  // Is a given route path an enabled page? Paths not managed by the CMS
  // (e.g. /login, /checkout) return true so they always render. Plan gating is
  // already folded into page.enabled server-side (see getBySlug), so this also
  // covers plan-disabled pages.
  const isPathEnabled = (path) => {
    const page = pages.find((p) => p.path === path);
    return page ? page.enabled : true;
  };

  // Does the current plan allow a capability flag (config/featureCatalog key)?
  // Before entitlements resolve (loading / public site) nothing is hidden.
  const hasFeature = (key) => {
    const f = entitlements.features || {};
    if (!key || Object.keys(f).length === 0) return true;
    return f[key] !== false;
  };

  const value = {
    tenantMode,
    slug,
    organisation,
    plan,
    limits,
    entitlements,
    hasFeature,
    branding,
    design,
    pages,
    isPathEnabled,
    isMuslimCharity: !!organisation?.isMuslimCharity,
    platform,
    refreshPlatform,
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
