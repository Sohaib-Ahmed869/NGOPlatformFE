import React, { useEffect, useRef, useState, useDeferredValue, useCallback } from "react";
import { motion, Reorder, useDragControls } from "framer-motion";
import {
  FileText,
  CornerDownRight,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Check,
  Lock,
  Plus,
  Trash2,
  Upload,
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
  Settings2,
  LayoutList,
  Eye,
  Monitor,
  Smartphone,
  ExternalLink,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import siteService from "../../services/site.service";
import { TabLoader } from "../../components/TabLoader";
import { RichTextEditor } from "../../components/RichTextEditor";
import { useAdminUi } from "../../context/AdminUiContext";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";

/* ── design tokens (shared with Branding / Settings / Profile) ── */
const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
const lineInput = "w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400";
const lineWrap = "flex items-center gap-2.5 border-b border-gray-200 transition-colors focus-within:border-accent";

/* ── one visibility status per page (replaces the two confusing toggles) ── */
const VISIBILITY = [
  { id: "menu", label: "In menu", desc: "Live and shown in your navigation", color: "#16a34a", enabled: true, showInNav: true },
  { id: "link", label: "Live · link only", desc: "Reachable by URL, hidden from the menu", color: "#d97706", enabled: true, showInNav: false },
  { id: "hidden", label: "Hidden", desc: "Off — redirects visitors home", color: "#9ca3af", enabled: false, showInNav: false },
];
const statusOf = (p) => (!p.enabled ? "hidden" : p.showInNav ? "menu" : "link");

/* ── dot-path helpers (content is a nested object) ── */
function getByPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}
function setByPath(obj, path, value) {
  const keys = path.split(".");
  const clone = JSON.parse(JSON.stringify(obj || {}));
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return clone;
}

/* ── status dropdown (one clear control for visibility) ── */
function StatusSelect({ page, onChange, full = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = VISIBILITY.find((o) => o.id === statusOf(page)) || VISIBILITY[0];

  return (
    <div className={cn("relative", full && "w-full")} ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={cn(
          "inline-flex items-center gap-2 border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300",
          full && "w-full justify-between py-2.5 text-sm",
        )}
      >
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: current.color }} />
          {current.label}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1.5 w-64 border border-gray-100 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[var(--admin-elevated)]">
          {VISIBILITY.map((o) => {
            const sel = o.id === current.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(o); setOpen(false); }}
                className={cn("flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors", sel ? "bg-accent/10" : "hover:bg-gray-50 dark:hover:bg-white/5")}
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: o.color }} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", sel ? "text-accent" : "text-gray-700")}>{o.label}</span>
                  <span className="block text-[11px] text-gray-400">{o.desc}</span>
                </span>
                {sel ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ── image field (preview + upload + manual URL) ── */
function ImageField({ pageKey, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await siteService.uploadPageImage(pageKey, fd);
      onChange(res.data.url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden border border-gray-200 bg-gray-50">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-gray-300" />}
      </div>
      <div className="flex-1 space-y-2">
        <div className={lineWrap}>
          <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Image URL" className={lineInput} />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-accent hover:underline">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload image"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

/* ── schema field renderer ── */
function SchemaField({ field, basePath, content, setContent, pageKey }) {
  const path = basePath ? `${basePath}.${field.name}` : field.name;
  const value = getByPath(content, path);
  const set = (v) => setContent(setByPath(content, path, v));

  if (field.type === "textarea") {
    return (
      <div>
        <label className={labelCls}>{field.label}</label>
        <RichTextEditor value={value || ""} onChange={set} placeholder={field.label} />
        {field.help && <p className="mt-1.5 text-xs text-gray-400">{field.help}</p>}
      </div>
    );
  }
  if (field.type === "image") {
    return (
      <div>
        <label className={labelCls}>{field.label}</label>
        <ImageField pageKey={pageKey} value={value} onChange={set} />
      </div>
    );
  }
  if (field.type === "list") {
    const items = Array.isArray(value) ? value : [];
    const blank = (field.itemFields || []).reduce((a, f) => ((a[f.name] = ""), a), {});
    return (
      <div>
        <label className={labelCls}>{field.label}</label>
        <div className="space-y-3">
          {items.map((_, i) => (
            <div key={i} className="border border-gray-200 bg-gray-50/60 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-gray-400">Item {i + 1}</span>
                <button onClick={() => set(items.filter((_, idx) => idx !== i))} className="text-red-400 transition-colors hover:text-red-600" title="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                {(field.itemFields || []).map((sub) => (
                  <SchemaField key={sub.name} field={sub} basePath={`${path}.${i}`} content={content} setContent={setContent} pageKey={pageKey} />
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => set([...items, { ...blank }])} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"><Plus className="h-4 w-4" /> Add item</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <label className={labelCls}>{field.label}</label>
      <div className={lineWrap}>
        <input type="text" value={value || ""} onChange={(e) => set(e.target.value)} className={lineInput} />
      </div>
      {field.help && <p className="mt-1.5 text-xs text-gray-400">{field.help}</p>}
    </div>
  );
}

/* ── live preview: the real public page in an iframe, fed the draft live ── */
const DESKTOP_W = 1280;
const MOBILE_W = 390;

const PagePreview = React.memo(function PagePreview({ pageKey, path, content }) {
  const iframeRef = useRef(null);
  const wrapRef = useRef(null);
  const [view, setView] = useState("desktop"); // desktop | mobile
  const [size, setSize] = useState({ w: 0, h: 0 });
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const src = `${origin}${path}?preview=1`;

  // Measure the viewport so we can scale the desktop frame to fill it.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const post = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "cms-preview", key: pageKey, content }, origin || "*");
  }, [pageKey, content, origin]);

  // Re-post the draft on every (deferred) content change.
  useEffect(() => { post(); }, [post]);

  // The page announces when it's mounted → send it the current draft.
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "cms-preview-ready" && (!e.data.key || e.data.key === pageKey)) post();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pageKey, post]);

  const desktop = view === "desktop";
  const targetW = desktop ? DESKTOP_W : MOBILE_W;
  let scale = size.w ? size.w / targetW : 1;
  if (!desktop) scale = Math.min(scale, 1); // never upscale the phone frame
  const frameH = scale ? size.h / scale : size.h;
  const left = Math.max(0, (size.w - targetW * scale) / 2);

  return (
    <div className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-gray-100 shadow-sm dark:border-white/10 dark:bg-white/5 lg:h-[calc(100vh-8rem)]">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-[var(--admin-elevated)]">
        <span className="truncate text-[11px] text-gray-400">{path}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setView("desktop")} title="Desktop" className={cn("inline-flex h-7 w-7 items-center justify-center rounded", desktop ? "bg-accent/15 text-accent" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10")}>
            <Monitor className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setView("mobile")} title="Mobile" className={cn("inline-flex h-7 w-7 items-center justify-center rounded", !desktop ? "bg-accent/15 text-accent" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10")}>
            <Smartphone className="h-4 w-4" />
          </button>
          <a href={src} target="_blank" rel="noreferrer" title="Open in new tab" className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
      <div ref={wrapRef} className="relative flex-1 overflow-hidden bg-white">
        <iframe
          ref={iframeRef}
          title="Live preview"
          src={src}
          className="absolute top-0 origin-top-left border-0 bg-white"
          style={{ left, width: targetW, height: frameH, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
});

/* ── full-page editor: editor (left) + live preview (right) ── */
function PageEditorView({ page, onBack, onStatusChange, onRename, onSaved }) {
  const [content, setContent] = useState(page.content || {});
  const [navLabel, setNavLabel] = useState(page.navLabel || "");
  const [saving, setSaving] = useState(false);

  // Commit a name change (the navbar item label). Persists on its own so it
  // also works for plan-locked pages, whose content save button is hidden.
  const commitNavLabel = () => {
    const v = navLabel.trim();
    if (v && v !== (page.navLabel || "")) { setNavLabel(v); onRename(v); }
    else setNavLabel(page.navLabel || "");
  };
  const planLabel = page.minPlan ? page.minPlan.charAt(0).toUpperCase() + page.minPlan.slice(1) : "";
  const hasContent = (page.schema || []).length > 0;
  // Deferred copy keeps the preview snappy — typing stays responsive while the
  // iframe preview catches up.
  const deferredContent = useDeferredValue(content);

  // Collapse the sidebar while editing for more room; restore it on exit.
  const { sidebarCollapsed, setSidebarCollapsed } = useAdminUi();
  useEffect(() => {
    const prev = sidebarCollapsed;
    setSidebarCollapsed(true);
    return () => setSidebarCollapsed(prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      // The menu label saves on its own (on blur); the Save button persists
      // the page's content, which is the plan-gated part.
      const res = await siteService.updatePage(page.key, { content });
      toast.success("Page saved");
      onSaved(res.data.page);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const eyebrow = (Icon, text) => (
    <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
      <Icon className="h-3.5 w-3.5" /> {text}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="w-full space-y-6 pb-24">
      {/* Back + header */}
      <div>
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to pages
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-primary">{page.navLabel}</h1>
          </div>
          <button onClick={save} disabled={saving || page.locked} className="hidden items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50 sm:inline-flex">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
          </button>
        </div>
      </div>

      {/* Editor (left) + live preview (right) */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_560px] 2xl:grid-cols-[minmax(0,1fr)_680px]">
        {/* Editor */}
        <div className="space-y-6">
          <div className="border border-gray-100 bg-white p-6 shadow-sm">
            {eyebrow(Settings2, "Settings")}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Menu label</label>
                <div className={lineWrap}>
                  <input
                    type="text"
                    value={navLabel}
                    onChange={(e) => setNavLabel(e.target.value)}
                    onBlur={commitNavLabel}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    maxLength={40}
                    className={lineInput}
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">The name shown for this page in your navbar. Saved automatically.</p>
              </div>
              <div>
                <label className={labelCls}>Visibility</label>
                <StatusSelect page={page} onChange={onStatusChange} full />
                <p className="mt-1.5 text-xs text-gray-400">Applies instantly.</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
            {eyebrow(LayoutList, "Content")}
            {page.locked ? (
              <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Editing this page's content requires the <span className="font-semibold">{planLabel}</span> plan. You can still rename it and change its visibility.</p>
              </div>
            ) : hasContent ? (
              <div className="space-y-6">
                {(page.schema || []).map((field) => (
                  <SchemaField key={field.name} field={field} basePath="" content={content} setContent={setContent} pageKey={page.key} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">This page has no editable content yet.</p>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-24">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            <Eye className="h-3.5 w-3.5" /> Live preview
          </div>
          <PagePreview pageKey={page.key} path={page.path} content={deferredContent} />
        </div>
      </div>

      {/* Sticky save bar */}
      {!page.locked && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]">
          <button onClick={onBack} className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-gray-100 dark:hover:bg-white/10">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ── inline rename of a page's menu label (the navbar item name) ── */
function NavLabelEdit({ page, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.navLabel || "");
  const inputRef = useRef(null);

  // Keep the draft in sync when the label changes elsewhere (and we're idle).
  useEffect(() => { if (!editing) setDraft(page.navLabel || ""); }, [page.navLabel, editing]);
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    // Empty resets to nothing useful, so ignore blanks and no-ops.
    if (v && v !== (page.navLabel || "")) onRename(v);
    else setDraft(page.navLabel || "");
  };
  const cancel = () => { setEditing(false); setDraft(page.navLabel || ""); };

  if (editing) {
    return (
      <span className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            else if (e.key === "Escape") { e.preventDefault(); cancel(); }
          }}
          onBlur={commit}
          maxLength={40}
          className="w-40 rounded border border-accent bg-white px-1.5 py-0.5 text-sm font-semibold text-gray-800 outline-none"
          aria-label="Menu label"
        />
        <span className="hidden text-[10px] text-gray-400 sm:inline">Enter to save · Esc to cancel</span>
      </span>
    );
  }

  return (
    <span className="group/name flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn("truncate text-left text-sm font-semibold hover:text-accent", page.enabled ? "text-gray-800" : "text-gray-400")}
        title="Click to rename menu item"
      >
        {page.navLabel}
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-accent focus:opacity-100 group-hover/name:opacity-100"
        title="Rename menu item"
        aria-label="Rename menu item"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

/* ── a draggable row (handle-only drag; row body opens the editor) ── */
function PageRow({ page, depth, onOpen, onStatusChange, onRename, onDragEnd }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={page.key} dragListener={false} dragControls={controls} onDragEnd={onDragEnd} as="div" className="bg-white">
      <div className="flex items-center gap-2 px-3 py-3" style={{ paddingLeft: depth ? 32 : 12 }}>
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab touch-none p-1 text-gray-300 transition-colors hover:text-gray-500 active:cursor-grabbing"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button type="button" onClick={onOpen} className="shrink-0" title="Edit page">
            {depth ? <CornerDownRight className="h-4 w-4 shrink-0 text-gray-300" /> : <FileText className="h-4 w-4 shrink-0 text-gray-400" />}
          </button>
          <span className="min-w-0">
            <NavLabelEdit page={page} onRename={onRename} />
            <button type="button" onClick={onOpen} className="block truncate text-left text-xs text-gray-400 hover:text-gray-600">{page.path}</button>
          </span>
        </div>

        <StatusSelect page={page} onChange={onStatusChange} />

        <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 px-2 text-sm font-medium text-accent hover:underline" title="Edit page">
          Edit <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}

/* ── main screen ── */
export default function Pages() {
  const cached = siteService.getCachedPages();
  const [pages, setPages] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [editingKey, setEditingKey] = useState(null);

  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; });

  const load = async ({ force = false } = {}) => {
    try {
      setLoading(true);
      setPages(await withMinDelay(siteService.listPages({ force })));
    } catch {
      toast.error("Failed to load pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!siteService.getCachedPages()) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply a status (visibility) change — persists immediately.
  const setStatus = async (key, opt) => {
    setPages((prev) => prev.map((p) => (p.key === key ? { ...p, enabled: opt.enabled, showInNav: opt.showInNav } : p)));
    try {
      await siteService.updatePage(key, { enabled: opt.enabled, showInNav: opt.showInNav });
    } catch (e) {
      toast.error(e.response?.data?.error || "Update failed");
      load({ force: true });
    }
  };

  // Rename a page's menu item (navbar label) — persists immediately. Name-only
  // updates are allowed on every plan, so this works for plan-locked pages too.
  const setNavLabel = async (key, label) => {
    const trimmed = String(label || "").trim();
    const prev = pagesRef.current.find((p) => p.key === key)?.navLabel || "";
    if (!trimmed || trimmed === prev) return;
    setPages((cur) => cur.map((p) => (p.key === key ? { ...p, navLabel: trimmed } : p)));
    try {
      await siteService.updatePage(key, { navLabel: trimmed });
      toast.success("Menu item renamed");
    } catch (e) {
      toast.error(e.response?.data?.error || "Rename failed");
      load({ force: true });
    }
  };

  const childrenOf = (key) => pages.filter((p) => p.navParentKey === key).sort((a, b) => a.navOrder - b.navOrder);
  const topLevel = pages.filter((p) => !p.navParentKey).sort((a, b) => a.navOrder - b.navOrder);

  // Live reorder within a sibling group (parentKey null = top level).
  const reorderLocal = (parentKey, newKeys) => {
    setPages((prev) =>
      prev.map((p) => {
        if ((p.navParentKey || null) !== (parentKey || null)) return p;
        const idx = newKeys.indexOf(p.key);
        return idx >= 0 ? { ...p, navOrder: idx } : p;
      }),
    );
  };

  // Persist the final order of a sibling group on drop.
  const persistGroup = async (parentKey) => {
    const sibs = pagesRef.current
      .filter((p) => (p.navParentKey || null) === (parentKey || null))
      .sort((a, b) => a.navOrder - b.navOrder);
    try {
      await Promise.all(sibs.map((p, idx) => siteService.updatePage(p.key, { navOrder: idx })));
    } catch {
      toast.error("Reorder failed");
      load({ force: true });
    }
  };

  const editingPage = editingKey ? pages.find((p) => p.key === editingKey) : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading pages…" />
      </div>
    );
  }

  // Editing → a dedicated full page (not a modal).
  if (editingPage) {
    return (
      <PageEditorView
        page={editingPage}
        onBack={() => setEditingKey(null)}
        onStatusChange={(opt) => setStatus(editingPage.key, opt)}
        onRename={(label) => setNavLabel(editingPage.key, label)}
        onSaved={(updated) => {
          setPages((prev) => prev.map((p) => (p.key === updated.key ? { ...p, ...updated } : p)));
          setEditingKey(null);
        }}
      />
    );
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Website Pages</h1>
        <p className="mt-1 max-w-3xl text-sm text-text-muted">
          Drag the <GripVertical className="inline h-3.5 w-3.5 align-text-bottom" /> handle to reorder your menu, click a name (or the
          <Pencil className="inline h-3 w-3 align-text-bottom" /> icon) to rename a navbar item, set each page's visibility, and click a page to edit it.
        </p>
      </div>

      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <Reorder.Group axis="y" values={topLevel.map((p) => p.key)} onReorder={(nk) => reorderLocal(null, nk)} as="div" className="divide-y divide-gray-100">
          {topLevel.map((parent) => {
            const kids = childrenOf(parent.key);
            return (
              <div key={parent.key}>
                <PageRow page={parent} depth={0} onOpen={() => setEditingKey(parent.key)} onStatusChange={(opt) => setStatus(parent.key, opt)} onRename={(label) => setNavLabel(parent.key, label)} onDragEnd={() => persistGroup(null)} />
                {kids.length > 0 ? (
                  <Reorder.Group axis="y" values={kids.map((c) => c.key)} onReorder={(nk) => reorderLocal(parent.key, nk)} as="div" className="divide-y divide-gray-100 border-t border-gray-100 bg-gray-50/40">
                    {kids.map((child) => (
                      <PageRow key={child.key} page={child} depth={1} onOpen={() => setEditingKey(child.key)} onStatusChange={(opt) => setStatus(child.key, opt)} onRename={(label) => setNavLabel(child.key, label)} onDragEnd={() => persistGroup(parent.key)} />
                    ))}
                  </Reorder.Group>
                ) : null}
              </div>
            );
          })}
        </Reorder.Group>
      </div>
    </div>
  );
}
