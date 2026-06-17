import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Globe, RotateCcw, Check, Maximize2, X } from "lucide-react";
import toast from "react-hot-toast";
import designService from "../../services/design.service";
import {
  fontsForRole,
  ROUNDNESS,
  BORDER_WIDTH,
  SHADOW,
  TEMPLATES,
  NAVBAR_VARIANTS,
  FOOTER_VARIANTS,
  FONT_MAP,
  ROUNDNESS_MAP,
  templateColors,
  resolveDesign,
  designCssVars,
  loadFontsForDesign,
} from "../../config/designTokens";
import themeCategories, { getThemeById } from "../../config/themePresets";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../utils/cn";

const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";

/* Segmented control for a small set of options. */
function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex flex-wrap border border-gray-200">
      {options.map((o, i) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "px-3.5 py-1.5 text-xs font-medium transition-colors",
              i > 0 && "border-l border-gray-200",
              active ? "bg-accent text-white" : "text-gray-600 hover:bg-gray-50",
            )}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}

/* Live preview — the REAL public home page rendered with the unsaved draft
   design, via an iframe in design-preview mode (TenantContext applies the draft
   posted here: fonts, shape, colours and navbar/footer layout variants). */
const ZOOMS = [
  { id: "fit", label: "Fit" },
  { id: "0.75", label: "75%" },
  { id: "1", label: "100%" },
];
const DEVICES = [
  { id: "desktop", label: "Desktop", w: 1280 },
  { id: "tablet", label: "Tablet", w: 834 },
  { id: "mobile", label: "Mobile", w: 390 },
];
const FRAME_W = 1280;
const MIN_FRAME_H = 600; // fallback viewport height before the panel is measured

/* A single design-preview iframe (real portal at ?designPreview=1).
   IMPORTANT: an iframe's own size IS the layout viewport its content sees, so
   `frameH` must be a realistic browser height — otherwise `100vh`/`100dvh` heroes
   blow up (e.g. a 2600px-tall hero floating its content in dead space). Callers
   pass the *visible* area height ÷ scale, so the frame fills the view like a real
   browser window; anything taller scrolls inside the iframe.
   Re-posts the draft whenever it changes and whenever the frame reports ready. */
function PreviewFrame({ design, frameW, frameH, scale }) {
  const iframeRef = useRef(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const src = `${origin}/?designPreview=1`;

  const post = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "design-preview", design }, origin || "*");
  }, [design, origin]);

  useEffect(() => { post(); }, [post]);
  useEffect(() => {
    const onMsg = (e) => { if (e.data?.type === "design-preview-ready") post(); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [post]);

  // The wrapper is sized to the SCALED frame so both axes scroll correctly.
  return (
    <div style={{ width: frameW * scale, height: frameH * scale }}>
      <iframe
        ref={iframeRef}
        title="Design preview"
        src={src}
        className="origin-top-left border-0 bg-white"
        style={{ width: frameW, height: frameH, transform: `scale(${scale})` }}
      />
    </div>
  );
}

/* Full-screen preview overlay — shows the whole page at real size with
   Desktop / Tablet / Mobile widths so the tenant can review everything. */
function FullscreenPreview({ design, onClose }) {
  const areaRef = useRef(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [device, setDevice] = useState("desktop");

  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setArea((a) => (a.w === w && a.h === h ? a : { w, h }));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dev = DEVICES.find((d) => d.id === device) || DEVICES[0];
  const PAD = 48; // p-6 on both sides
  // Fit the device width into the available area, never upscaling past 100%.
  const scale = area.w ? Math.min(1, (area.w - PAD) / dev.w) : 1;
  // Viewport height = the visible area ÷ scale, so the frame fills the screen
  // like a real browser window (a landscape desktop hero reads correctly).
  const frameH = area.h ? Math.max(MIN_FRAME_H, (area.h - PAD) / scale) : MIN_FRAME_H;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <span className="text-sm font-semibold text-white">Live preview</span>
        <div className="inline-flex border border-white/20">
          {DEVICES.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDevice(d.id)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-medium transition-colors",
                i > 0 && "border-l border-white/20",
                device === d.id ? "bg-accent text-white" : "text-white/70 hover:bg-white/10",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white">
          <X className="h-4 w-4" /> Close
        </button>
      </div>
      <div ref={areaRef} className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 flex justify-center overflow-auto p-6">
          <div className="shadow-2xl">
            <PreviewFrame design={design} frameW={dev.w} frameH={frameH} scale={scale} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignPreview({ design }) {
  const wrapRef = useRef(null);
  const [panel, setPanel] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState("fit");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // Only update when the measured box actually changes — otherwise scrollbar
    // toggling can feed back into the size and the frame never settles (blur).
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setPanel((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const fitScale = panel.w ? panel.w / FRAME_W : 1;
  const scale = zoom === "fit" ? fitScale : Number(zoom);
  // Viewport height = the visible panel ÷ scale, so the hero (100dvh) fills the
  // panel like a real browser instead of ballooning to a fixed tall frame.
  const frameH = panel.h && scale ? Math.max(MIN_FRAME_H, panel.h / scale) : MIN_FRAME_H;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex border border-gray-200">
          {ZOOMS.map((z, i) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setZoom(z.id)}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                i > 0 && "border-l border-gray-200",
                zoom === z.id ? "bg-accent text-white" : "text-gray-600 hover:bg-gray-50",
              )}
            >
              {z.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Full screen
        </button>
      </div>
      {/* The OUTER box is measured and is overflow-hidden so it never grows a
          scrollbar (a scrollbar here would shrink the measurement and make the
          frame oscillate → blur). Scrolling lives on the inner layer. */}
      <div ref={wrapRef} className="relative h-[560px] overflow-hidden border border-gray-100 bg-white lg:h-[calc(100vh-15rem)]">
        <div className="absolute inset-0 overflow-auto">
          <PreviewFrame design={design} frameW={FRAME_W} frameH={frameH} scale={scale} />
        </div>
      </div>
      {expanded && <FullscreenPreview design={design} onClose={() => setExpanded(false)} />}
    </div>
  );
}

export default function DesignTab() {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublished, setUnpublished] = useState(false);
  // Which colour-theme category sub-tab is open (mirrors the Theme tab).
  const [activeColourCat, setActiveColourCat] = useState(() => themeCategories[0].id);

  useEffect(() => {
    designService
      .get()
      .then((data) => {
        const d = resolveDesign(data.design);
        setDraft(d);
        // Open the category that holds the currently-applied palette.
        setActiveColourCat(getThemeById(d.colorThemeId).categoryId);
        setUnpublished(!!data.hasUnpublishedChanges);
      })
      .catch(() => toast.error("Failed to load design"))
      .finally(() => setLoading(false));
  }, []);

  // Preload template fonts so the gallery thumbnails render in their real type.
  useEffect(() => {
    TEMPLATES.forEach((t) => loadFontsForDesign(t));
  }, []);

  const patch = (next) => setDraft((d) => ({ ...d, ...next }));
  const setFont = (role, id) => setDraft((d) => ({ ...d, fonts: { ...d.fonts, [role]: id } }));
  const setShape = (key, id) => setDraft((d) => ({ ...d, shape: { ...d.shape, [key]: id } }));
  const setVariant = (key, id) => setDraft((d) => ({ ...d, variants: { ...d.variants, [key]: id } }));
  // Pick a colour palette directly (independent of templates). null = keep the
  // tenant's current branding colours.
  const setColourTheme = (themeId) => {
    if (!themeId) {
      patch({ colorThemeId: null, colors: null });
      return;
    }
    const t = getThemeById(themeId);
    patch({ colorThemeId: themeId, colors: { primary: t.primary, accent: t.accent, bg: t.bg } });
  };
  const applyTemplate = (t) => {
    const colors = templateColors(t);
    setDraft({ templateId: t.id, colorThemeId: t.colorThemeId || null, colors: colors || null, fonts: { ...t.fonts }, shape: { ...t.shape }, variants: { ...t.variants } });
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = await designService.saveDraft(draft);
      setUnpublished(data.hasUnpublishedChanges ?? true);
      toast.success("Design draft saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await designService.saveDraft(draft);
      await designService.publish();
      setUnpublished(false);
      toast.success("Design published — now live on your site");
    } catch {
      toast.error("Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const discard = async () => {
    if (!window.confirm("Discard your unpublished design changes and revert to the live design?")) return;
    try {
      const data = await designService.discard();
      setDraft(resolveDesign(data.design));
      setUnpublished(false);
      toast.success("Draft discarded");
    } catch {
      toast.error("Failed to discard");
    }
  };

  if (loading || !draft) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <TabLoader label="Loading design…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-primary">Design</h2>
          <p className="mt-0.5 text-sm text-text-muted">Colours, fonts, shape, layout and templates for your public site — preview live, then publish.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unpublished ? (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unpublished changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600"><Check className="h-3.5 w-3.5" /> Live</span>
          )}
          {unpublished && (
            <button onClick={discard} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-primary">
              <RotateCcw className="h-4 w-4" /> Discard
            </button>
          )}
          <button onClick={save} disabled={saving || publishing} className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save draft
          </button>
          <button onClick={publish} disabled={publishing || saving} className="inline-flex items-center gap-2 bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Publish
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* Controls */}
        <div className="space-y-8">
          {/* Templates */}
          <div>
            <p className={labelCls}>Templates</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TEMPLATES.map((t) => {
                const colors = templateColors(t);
                const headingStack = FONT_MAP[t.fonts.heading]?.stack;
                const rv = ROUNDNESS_MAP[t.shape.roundness]?.vars || {};
                const bg = colors?.bg || "#FAF7F2";
                const primary = colors?.primary || "#2C2418";
                const accent = colors?.accent || "#C9A84C";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    title={t.desc}
                    className={cn(
                      "border p-2.5 text-left transition-colors",
                      draft.templateId === t.id ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/40",
                    )}
                  >
                    {/* mini preview */}
                    <div
                      className="mb-2 flex h-16 items-center justify-center gap-2 border border-black/5"
                      style={{ background: bg, borderRadius: rv["--radius-card"] }}
                    >
                      <span className="text-xl font-bold leading-none" style={{ fontFamily: headingStack, color: primary }}>Aa</span>
                      <span className="px-2 py-1 text-[10px] font-semibold text-white" style={{ background: accent, borderRadius: rv["--radius-btn"] }}>Btn</span>
                    </div>
                    <span className="block text-sm font-semibold text-primary">{t.name}</span>
                    {colors ? (
                      <span className="mt-1 flex gap-1">
                        {[primary, accent, bg].map((c, i) => (
                          <span key={i} className="h-3 w-3 rounded-full border border-black/10" style={{ background: c }} />
                        ))}
                      </span>
                    ) : (
                      <span className="mt-1 block text-[10px] text-text-muted">Keeps your colours</span>
                    )}
                    <span className="mt-1 block text-[11px] leading-snug text-text-muted">{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colours — the full theme palette, integrated into the design draft */}
          <div>
            <p className={labelCls}>Colours</p>
            {/* Category sub-tabs (same grouping as the Theme tab) */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {themeCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveColourCat(cat.id)}
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors",
                    activeColourCat === cat.id ? "bg-accent text-white" : "bg-gray-100 text-text-muted hover:bg-gray-200",
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {/* Keep the tenant's current colours */}
              <button
                type="button"
                onClick={() => setColourTheme(null)}
                className={cn(
                  "border p-2.5 text-left transition-colors",
                  !draft.colorThemeId ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/40",
                )}
              >
                <span className="mb-2 flex h-9 items-center justify-center border border-dashed border-gray-300 text-[10px] font-medium text-text-muted">Current</span>
                <span className="block text-xs font-semibold text-primary">Keep my colours</span>
              </button>
              {themeCategories.find((c) => c.id === activeColourCat)?.themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setColourTheme(t.id)}
                  title={t.desc}
                  className={cn(
                    "border p-2.5 text-left transition-colors",
                    draft.colorThemeId === t.id ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/40",
                  )}
                >
                  <span className="mb-2 flex h-9 overflow-hidden border border-black/5">
                    <span className="flex-1" style={{ background: t.primary }} />
                    <span className="flex-1" style={{ background: t.accent }} />
                    <span className="flex-1" style={{ background: t.bg }} />
                  </span>
                  <span className="block truncate text-xs font-semibold text-primary">{t.name}</span>
                  <span className="block truncate text-[10px] text-text-muted">{t.desc}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-text-muted">Pick a palette to preview it live; publishing applies it across your whole site.</p>
          </div>

          {/* Fonts */}
          <div>
            <p className={labelCls}>Fonts</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {["heading", "body", "nav"].map((role) => (
                <div key={role}>
                  <label className="mb-1.5 block text-xs font-medium capitalize text-gray-600">{role}</label>
                  <CustomSelect
                    value={draft.fonts[role]}
                    onChange={(v) => setFont(role, v)}
                    options={fontsForRole(role).map((f) => ({ value: f.id, label: f.name }))}
                    className="w-full"
                    triggerClassName="w-full border border-gray-200 bg-white px-2.5 py-2 text-sm hover:border-gray-300 focus:border-accent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Shape */}
          <div className="space-y-5">
            <p className={labelCls}>Shape</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-gray-600">Corners</span>
              <Segmented value={draft.shape.roundness} options={ROUNDNESS} onChange={(id) => setShape("roundness", id)} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-gray-600">Borders</span>
              <Segmented value={draft.shape.borderWidth} options={BORDER_WIDTH} onChange={(id) => setShape("borderWidth", id)} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-gray-600">Shadows</span>
              <Segmented value={draft.shape.shadow} options={SHADOW} onChange={(id) => setShape("shadow", id)} />
            </div>
          </div>

          {/* Layout */}
          <div className="space-y-5">
            <p className={labelCls}>Layout</p>
            {[
              { key: "navbar", label: "Navbar", opts: NAVBAR_VARIANTS },
              { key: "footer", label: "Footer", opts: FOOTER_VARIANTS },
            ].map(({ key, label, opts }) => (
              <div key={key}>
                <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
                <div className="grid grid-cols-2 gap-3">
                  {opts.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setVariant(key, o.id)}
                      className={cn(
                        "border p-3 text-left transition-colors",
                        draft.variants[key] === o.id ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/40",
                      )}
                    >
                      <span className="block text-sm font-semibold text-primary">{o.name}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">{o.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-text-muted">Navbar &amp; footer layout changes show on your live site after publishing.</p>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-24">
          <p className={labelCls}>Live preview</p>
          <DesignPreview design={draft} />
          <p className="mt-2 text-[11px] text-text-muted">Changes apply to your public site only when you Publish.</p>
        </div>
      </div>
    </div>
  );
}
