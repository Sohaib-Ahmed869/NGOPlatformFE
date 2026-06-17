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
  EyeOff,
  Globe,
  Clock,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import siteService from "../../services/site.service";
import { TabLoader } from "../../components/TabLoader";
import { RichTextEditor } from "../../components/RichTextEditor";
import { useAdminUi } from "../../context/AdminUiContext";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import { sectionIcon } from "../../config/sectionTypes";

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
  if (field.type === "select") {
    return (
      <div>
        <label className={labelCls}>{field.label}</label>
        <div className={lineWrap}>
          <select value={value || ""} onChange={(e) => set(e.target.value)} className={`${lineInput} cursor-pointer`}>
            {(field.options || []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {field.help && <p className="mt-1.5 text-xs text-gray-400">{field.help}</p>}
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
    <div className="flex h-[560px] flex-col overflow-hidden rounded-token border border-gray-100 bg-gray-100 shadow-sm dark:border-white/10 dark:bg-white/5 lg:h-[calc(100vh-8rem)]">
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

/* ── one section row in the builder (drag handle + archive + edit) ── */
function SectionRow({ section, index, label, Icon, schema, expanded, onToggleExpand, onToggleArchive, onDelete, content, setContent, pageKey }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={section.id} dragListener={false} dragControls={controls} as="div" className="border border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab touch-none p-1 text-gray-300 transition-colors hover:text-gray-500 active:cursor-grabbing"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center bg-accent/10 text-accent", section.archived && "opacity-40")}>
          <Icon className="h-4 w-4" />
        </span>
        <button type="button" onClick={onToggleExpand} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className={cn("truncate text-sm font-semibold", section.archived ? "text-gray-400 line-through" : "text-gray-800")}>{label}</span>
          {section.archived && <span className="shrink-0 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">Archived</span>}
        </button>
        <button type="button" onClick={onToggleArchive} title={section.archived ? "Unarchive (show on the page)" : "Archive (hide from the page)"} className="p-1.5 text-gray-400 transition-colors hover:text-accent">
          {section.archived ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onDelete} title="Delete section" className="p-1.5 text-gray-400 transition-colors hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={onToggleExpand} title={expanded ? "Collapse" : "Edit"} className="p-1.5 text-gray-400 transition-colors hover:text-accent">
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>
      {expanded && (
        <div className="space-y-5 border-t border-gray-100 bg-gray-50/40 p-4">
          {(schema || []).length ? (
            (schema || []).map((field) => (
              <SchemaField key={field.name} field={field} basePath={`sections.${index}.data`} content={content} setContent={setContent} pageKey={pageKey} />
            ))
          ) : (
            <p className="text-sm text-gray-400">This block has no editable fields.</p>
          )}
        </div>
      )}
    </Reorder.Item>
  );
}

/* ── section (block) builder for section-based pages ── */
function SectionBuilder({ content, setContent, pageKey }) {
  const [catalog, setCatalog] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    siteService.getSectionTypes().then(setCatalog).catch(() => {});
  }, []);

  const sections = Array.isArray(content.sections) ? content.sections : [];
  const setSections = (next) => setContent({ ...content, sections: next });
  const catMap = {};
  catalog.forEach((c) => { catMap[c.type] = c; });

  const addSection = (type) => {
    const def = catMap[type];
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sec-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    setSections([...sections, { id, type, archived: false, data: JSON.parse(JSON.stringify(def?.defaults || {})) }]);
    setAddOpen(false);
    setExpanded(id);
  };

  const reorder = (ids) => {
    const byId = {};
    sections.forEach((s) => { byId[s.id] = s; });
    setSections(ids.map((id) => byId[id]).filter(Boolean));
  };

  return (
    <div className="space-y-4">
      <Reorder.Group axis="y" values={sections.map((s) => s.id)} onReorder={reorder} as="div" className="space-y-2">
        {sections.map((s, i) => {
          const def = catMap[s.type];
          return (
            <SectionRow
              key={s.id}
              section={s}
              index={i}
              label={def?.label || s.type}
              Icon={sectionIcon(s.type)}
              schema={def?.schema}
              expanded={expanded === s.id}
              onToggleExpand={() => setExpanded(expanded === s.id ? null : s.id)}
              onToggleArchive={() => setSections(sections.map((x) => (x.id === s.id ? { ...x, archived: !x.archived } : x)))}
              onDelete={() => { setSections(sections.filter((x) => x.id !== s.id)); if (expanded === s.id) setExpanded(null); }}
              content={content}
              setContent={setContent}
              pageKey={pageKey}
            />
          );
        })}
      </Reorder.Group>

      {sections.length === 0 && (
        <p className="border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-sm text-gray-400">
          No sections yet — add your first block below.
        </p>
      )}

      {/* Add section */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="inline-flex w-full items-center justify-center gap-1.5 border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-accent hover:text-accent"
        >
          <Plus className="h-4 w-4" /> Add section
        </button>
        {addOpen && (
          <div className="absolute z-20 mt-1.5 grid w-full grid-cols-2 gap-1 border border-gray-100 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[var(--admin-elevated)] sm:grid-cols-3">
            {catalog.map((c) => {
              const Ic = sectionIcon(c.type);
              return (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => addSection(c.type)}
                  className="flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-accent/10 hover:text-accent dark:text-gray-200"
                >
                  <Ic className="h-4 w-4 shrink-0" /> <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── full-page editor: editor (left) + live preview (right) ── */
function PageEditorView({ page, onBack, onStatusChange, onRename, onSaved }) {
  const [content, setContent] = useState(page.content || {});
  const [navLabel, setNavLabel] = useState(page.navLabel || "");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublished, setUnpublished] = useState(!!page.hasUnpublishedChanges);
  const [publishedAt, setPublishedAt] = useState(page.publishedAt || null);
  const [showHistory, setShowHistory] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [revLoading, setRevLoading] = useState(false);

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

  // Save the working copy as a DRAFT (does not change the live site).
  const save = async () => {
    setSaving(true);
    try {
      const res = await siteService.updatePage(page.key, { content });
      const updated = res.data.page;
      onSaved(updated);
      setUnpublished(updated?.hasUnpublishedChanges ?? true);
      toast.success("Draft saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
    return true;
  };

  // Save the current draft, then publish it → the changes go live.
  const publish = async () => {
    setPublishing(true);
    try {
      await siteService.updatePage(page.key, { content });
      const data = await siteService.publishPage(page.key);
      setUnpublished(false);
      setPublishedAt(data.publishedAt || new Date().toISOString());
      onSaved({ ...page, content, hasUnpublishedChanges: false, publishedAt: data.publishedAt });
      toast.success("Published — your changes are now live");
    } catch (e) {
      toast.error(e.response?.data?.error || "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  // Drop the unpublished draft and revert the editor to the live version.
  const discard = async () => {
    if (!window.confirm("Discard your unpublished changes and revert to the live version?")) return;
    try {
      const data = await siteService.discardDraft(page.key);
      setContent(data.content || {});
      setUnpublished(false);
      onSaved({ ...page, content: data.content, hasUnpublishedChanges: false });
      toast.success("Draft discarded");
    } catch {
      toast.error("Failed to discard draft");
    }
  };

  const openHistory = async () => {
    setShowHistory(true);
    setRevLoading(true);
    try {
      setRevisions(await siteService.getRevisions(page.key));
    } catch {
      toast.error("Failed to load history");
    } finally {
      setRevLoading(false);
    }
  };

  // Load a past published version into the draft (review, then Publish).
  const restore = async (revId) => {
    try {
      const data = await siteService.restoreRevision(page.key, revId);
      setContent(data.content || {});
      setUnpublished(true);
      setShowHistory(false);
      onSaved({ ...page, content: data.content, hasUnpublishedChanges: true });
      toast.success("Revision loaded into your draft — review and publish");
    } catch {
      toast.error("Failed to restore revision");
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
            {publishedAt && (
              <p className="mt-0.5 text-xs text-text-muted">Last published {new Date(publishedAt).toLocaleString()}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unpublished ? (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unpublished changes
              </span>
            ) : publishedAt ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5" /> Live
              </span>
            ) : null}
            <button onClick={openHistory} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-accent/50 hover:text-accent">
              <Clock className="h-4 w-4" /> History
            </button>
            {!page.locked && (
              <>
                <button onClick={save} disabled={saving || publishing} className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save draft
                </button>
                <button onClick={publish} disabled={publishing || saving} className="inline-flex items-center gap-2 bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Publish
                </button>
              </>
            )}
          </div>
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
            ) : page.sectionBased ? (
              <div className="space-y-8">
                {page.hasFixedContent && (page.schema || []).length > 0 && (
                  <div className="space-y-6 border-b border-gray-100 pb-8">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Hero · fixed section</p>
                    {(page.schema || []).map((field) => (
                      <SchemaField key={field.name} field={field} basePath="" content={content} setContent={setContent} pageKey={page.key} />
                    ))}
                  </div>
                )}
                <SectionBuilder content={content} setContent={setContent} pageKey={page.key} />
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

      {/* Sticky action bar */}
      {!page.locked && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-token border border-gray-200 bg-white px-3 py-2.5 shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]">
          <button onClick={onBack} className="rounded-token-btn px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-gray-100 dark:hover:bg-white/10">Close</button>
          {unpublished && (
            <button onClick={discard} className="inline-flex items-center gap-1.5 rounded-token-btn px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
              <RotateCcw className="h-4 w-4" /> Discard
            </button>
          )}
          <button onClick={save} disabled={saving || publishing} className="inline-flex items-center gap-2 rounded-token-btn border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save draft
          </button>
          <button onClick={publish} disabled={publishing || saving} className="inline-flex items-center gap-2 rounded-token-btn bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Publish
          </button>
        </div>
      )}

      {/* Version history */}
      {showHistory && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-lg border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h3 className="inline-flex items-center gap-2 font-heading text-base font-bold text-primary">
                <Clock className="h-4 w-4 text-accent" /> Version history
              </h3>
              <button onClick={() => setShowHistory(false)} className="p-1 text-gray-400 transition-colors hover:text-gray-600" aria-label="Close">
                <span aria-hidden className="text-lg leading-none">×</span>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {revLoading ? (
                <div className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" /></div>
              ) : revisions.length === 0 ? (
                <p className="p-8 text-center text-sm text-text-muted">No previous versions yet — a version is saved each time you publish.</p>
              ) : (
                revisions.map((r) => (
                  <div key={r._id} className="flex items-center justify-between gap-3 border-b border-gray-50 px-5 py-3 last:border-0 dark:border-white/5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{new Date(r.createdAt).toLocaleString()}</p>
                      {r.note ? <p className="truncate text-xs text-text-muted">{r.note}</p> : null}
                    </div>
                    <button onClick={() => restore(r._id)} className="inline-flex shrink-0 items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-accent/50 hover:text-accent">
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </button>
                  </div>
                ))
              )}
            </div>
            <p className="border-t border-gray-100 px-5 py-2.5 text-[11px] text-text-muted">Restoring loads that version into your draft — review it, then Publish to go live.</p>
          </div>
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
          // Merge changes into the list cache but keep the editor open — the
          // admin can save a draft and then publish without losing their place.
          setPages((prev) => prev.map((p) => (p.key === updated.key ? { ...p, ...updated } : p)));
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
