import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { themeCategories, getThemeById } from "../config/themePresets";

/**
 * Platform-console colour theme. Mirrors the tenant admin's theming
 * (src/config/themePresets.js + TenantContext.applyColorVars): a chosen theme
 * (primary / accent / bg) is expanded into the full set of `--tenant-*` CSS
 * variables — including the primary-derived sidebar gradient and the
 * lightened/rgb variants — so changing it recolours the ENTIRE console (sidebar
 * gradient, accents, charts, background). Persisted per-browser.
 *
 * Reuses the SAME 40 presets (4 categories) the tenant admin offers.
 */
const KEY = "sa.platformTheme";
const DEFAULT_ID = "modern-emerald"; // keeps the slate + emerald platform identity

// hex → "r, g, b" (for rgba() usage). Mirrors TenantContext.hexToRgb.
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ""));
  return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : "0, 0, 0";
}
// positive percent = darken, negative = lighten. Mirrors TenantContext.darkenHex.
function shiftHex(hex, percent) {
  const num = parseInt(String(hex || "").replace("#", ""), 16);
  if (Number.isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max((num >> 16) - amt, 0));
  const G = Math.min(255, Math.max(((num >> 8) & 0x00ff) - amt, 0));
  const B = Math.min(255, Math.max((num & 0x0000ff) - amt, 0));
  return "#" + ((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1);
}

function computeVars({ primary, accent, bg }) {
  return {
    "--tenant-primary": primary,
    "--tenant-accent": accent,
    "--tenant-bg": bg,
    "--tenant-primary-rgb": hexToRgb(primary),
    "--tenant-accent-rgb": hexToRgb(accent),
    "--tenant-bg-rgb": hexToRgb(bg),
    "--tenant-sidebar-top": shiftHex(primary, 10),
    "--tenant-sidebar-bottom": shiftHex(primary, 20),
    "--tenant-primary-light": shiftHex(primary, -15),
    "--tenant-accent-light": shiftHex(accent, -15),
  };
}

function fromTheme(t) {
  return { themeId: t.id, primary: t.primary, accent: t.accent, bg: t.bg };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.primary && p?.accent && p?.bg) return { themeId: p.themeId || null, primary: p.primary, accent: p.accent, bg: p.bg };
    }
  } catch {
    /* ignore */
  }
  return fromTheme(getThemeById(DEFAULT_ID));
}

const SAThemeContext = createContext(null);

export function SAThemeProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  // Apply the colour vars on <html> — exactly like the tenant
  // (TenantContext.applyColorVars) — NOT inline on the shell. This matters for
  // the BACKGROUND: admin-theme.css redefines `--tenant-bg → dark surface` via
  // `[data-admin-theme="dark"]`, which only wins over an inherited (<html>) value,
  // not an inline one. So this makes the chosen bg show in light mode and the
  // proper dark surface show in dark mode, with primary + accent applied
  // everywhere — the same behaviour as the tenant admin.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const v = computeVars(state);
    Object.entries(v).forEach(([k, val]) => root.style.setProperty(k, val));
  }, [state]);

  const setTheme = useCallback((t) => setState(fromTheme(t)), []);
  // A manual colour edit drops the active-preset link (custom).
  const setColor = useCallback((key, hex) => setState((s) => ({ ...s, themeId: null, [key]: hex })), []);
  const reset = useCallback(() => setState(fromTheme(getThemeById(DEFAULT_ID))), []);

  const vars = computeVars(state);

  return (
    <SAThemeContext.Provider value={{ ...state, vars, setTheme, setColor, reset, categories: themeCategories }}>
      {children}
    </SAThemeContext.Provider>
  );
}

export function useSATheme() {
  const ctx = useContext(SAThemeContext);
  if (!ctx) throw new Error("useSATheme must be used within an SAThemeProvider");
  return ctx;
}
