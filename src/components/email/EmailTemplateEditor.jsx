import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Send,
  Blocks,
  Code2,
  Loader2,
  Paperclip,
  Lock,
  Layers,
  CheckCircle2,
  Eye,
  Braces,
  PencilRuler,
  AlertTriangle,
} from "lucide-react";
import BlockCanvas from "./BlockCanvas";
import BlockInspector from "./BlockInspector";
import VariablePalette from "./VariablePalette";
import EmailPreview from "./EmailPreview";
import TabLoader from "../TabLoader";
import SAErrorState from "../../SuperAdmin/components/SAErrorState";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

/**
 * The dual-mode email editor, shared by the SuperAdmin console and a tenant's
 * own admin portal. The only difference between them is the `service` passed
 * in, which is bound to a different API mount point.
 *
 * Two authoring modes over ONE stored document:
 *   blocks - the visual builder (default; safe, and what most operators want)
 *   html   - raw markup for full control
 * Both are persisted, so switching back and forth never loses the other's work.
 *
 * ── Layout ────────────────────────────────────────────────────────────────
 * From xl up this is a split view: the content column scrolls with the page
 * while the preview and variables stay pinned beside it, each bounded and
 * scrolling on its own. Below xl the three panes become tabs, because stacking
 * them made a three-thousand-pixel page where the preview — the thing you're
 * editing *against* — sat below the fold.
 *
 * The tabs render all three panes and hide the inactive ones rather than
 * unmounting them. Variable insertion writes to whichever field was last
 * focused, and an unmounted field is a detached node: switching to the
 * Variables tab would quietly break the one thing that tab is for.
 */

const card =
  "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
const labelCls =
  "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85";

const PREVIEW_DEBOUNCE_MS = 450;
const SPLIT_AT = 1280; // Tailwind's xl — where the tabs give way to the split view.

// Deep-ish equality good enough for a draft made of plain JSON.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const draftFrom = (src) => ({
  subject: src?.subject || "",
  preheader: src?.preheader || "",
  mode: src?.mode === "html" ? "html" : "blocks",
  blocks: Array.isArray(src?.blocks) ? src.blocks : [],
  html: src?.html || "",
});

const PANES = [
  { key: "content", label: "Content", icon: PencilRuler },
  { key: "preview", label: "Preview", icon: Eye },
  { key: "variables", label: "Variables", icon: Braces },
];

export default function EmailTemplateEditor({ service, templateKey, onBack, backLabel = "All emails" }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // Bumped by "Try again" — re-runs the load effect without remounting.
  const [reloadNonce, setReloadNonce] = useState(0);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [preview, setPreview] = useState({ html: "", subject: "", text: "", warnings: [] });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Which pane is visible below xl. Above it, all three are.
  const [pane, setPane] = useState("content");

  // Which input the variable palette should insert into. A ref, not state:
  // it changes on every focus and must not re-render the tree. The boolean
  // mirror exists only so the palette can dim itself before anything is
  // focused, rather than silently doing nothing when clicked.
  const activeFieldRef = useRef(null);
  const [hasField, setHasField] = useState(false);
  const inspectorRef = useRef(null);

  // Variables dock to the bottom of the pinned column and expand UPWARD over
  // the preview rather than shrinking it. Two panes splitting one viewport gave
  // each of them half a scrollbar and neither enough room; the preview now keeps
  // its full height and the variables are a bar you open when you need them.
  const [varsOpen, setVarsOpen] = useState(() => {
    try {
      return localStorage.getItem("email-vars-open") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("email-vars-open", varsOpen ? "1" : "0");
    } catch {
      /* private mode — the split just resets next time */
    }
  }, [varsOpen]);

  /* ── load ───────────────────────────────────────────────────────────── */

  // Read inside async callbacks that must not clobber work in progress.
  const dirtyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setLoadError("");

    const seed = (res) => {
      setData(res);
      // An uncustomised template opens pre-filled with whatever it currently
      // inherits, so the operator edits what they actually see being sent.
      const start = draftFrom(res.current || res.inherited || res.defaults);
      setDraft(start);
      setBaseline(start);
      setSelectedId(start.blocks[0]?.id || null);
    };

    // Cache-first: coming back to an email you already opened this session
    // paints instantly instead of showing a spinner over content we're holding.
    // The cache is dropped by every save, reset and layout change, so a hit
    // here means nothing WE did has invalidated it.
    const cached = service.getCachedTemplate?.(templateKey);
    if (cached) {
      seed(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Bouncing in and out of the same email — open, read, back, open again —
    // is one request, not three. Only an aged copy is worth checking.
    if (cached && !service.isTemplateStale?.(templateKey)) {
      return () => {
        alive = false;
        controller.abort();
      };
    }

    service
      .get(templateKey, { force: !!cached, signal: controller.signal })
      .then((res) => {
        if (!alive) return;
        // A background revalidation must never overwrite half-typed work. If
        // the operator has started editing, their draft stands and the fresher
        // copy is simply left in the cache for next time.
        if (cached && dirtyRef.current) return;
        seed(res);
      })
      .catch((err) => {
        // Nothing on screen yet is the only case where a failure is fatal —
        // otherwise we're already showing a usable (cached) document.
        if (!alive || axios.isCancel(err) || cached) return;
        setLoadError(err?.response?.data?.error || "Couldn't load this email");
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
      controller.abort();
    };
  }, [service, templateKey, reloadNonce]);

  /* ── live preview (debounced, content-addressed) ─────────────────────── */

  useEffect(() => {
    if (!draft) return undefined;
    let alive = true;
    const controller = new AbortController();

    // A draft we have already rendered — an undo, a redo, flipping Builder⇄HTML
    // to compare, retyping a character you just deleted. There is nothing to
    // wait for and nothing to ask the server, so skip both the debounce and the
    // "Rendering" pill and just show it.
    const instant = service.hasPreview?.(templateKey, draft);

    const render = () => {
      // Inside the timer, not outside it: flipping this on every keystroke made
      // the "Rendering" pill strobe the whole time you were typing.
      if (!instant) setPreviewLoading(true);
      service
        .preview(templateKey, draft, { signal: controller.signal })
        .then((res) => {
          if (!alive) return;
          setPreview(res);
          setPreviewError("");
        })
        .catch((err) => {
          if (alive && !axios.isCancel(err)) {
            setPreviewError(err?.response?.data?.error || "Preview failed");
          }
        })
        .finally(() => alive && setPreviewLoading(false));
    };

    if (instant) {
      render();
      return () => {
        alive = false;
      };
    }

    const t = setTimeout(render, PREVIEW_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(t);
      // Typing on kills the render we no longer want. Without this a burst of
      // pauses leaves several full email renders running for answers that are
      // already superseded.
      controller.abort();
    };
  }, [draft, service, templateKey]);

  /* ── caret-aware variable insertion ─────────────────────────────────── */

  const registerField = useCallback(
    () => ({
      onFocus: (e) => {
        activeFieldRef.current = e.target;
        setHasField(true);
      },
    }),
    [],
  );

  const insertVariable = useCallback((token) => {
    const el = activeFieldRef.current;
    if (!el || !el.isConnected) {
      toast("Click into a text field first, then pick a variable", { icon: "👆" });
      return;
    }

    // On the tabbed layout the field may be in the hidden pane we just came
    // from — show it again before focusing, or the caret lands nowhere.
    setPane((p) => (p === "variables" ? "content" : p));

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + token + el.value.slice(end);

    // React owns these inputs, so setting .value directly would be overwritten
    // on the next render. Going through the native setter and dispatching an
    // input event makes React's onChange fire and update the draft properly.
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value").set;
    setter.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));

    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  }, []);

  /* ── mutations ──────────────────────────────────────────────────────── */

  // Memoised because `same` serialises two whole documents — up to 100 blocks —
  // and this is read by the save button, the status dot, the leave guard and
  // the ⌘S handler. Unmemoised it ran on every render, including the ones
  // caused by a preview landing or a pane being switched.
  const dirty = useMemo(
    () => !!draft && !!baseline && !same(draft, baseline),
    [draft, baseline],
  );
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const selectedBlock = useMemo(
    () => (draft?.blocks || []).find((b) => b.id === selectedId) || null,
    [draft, selectedId],
  );

  // Stable identities: without them every keystroke in the subject line
  // re-renders the whole block canvas, which is the thing being dragged.
  const patch = useCallback((updates) => setDraft((d) => ({ ...d, ...updates })), []);
  const setBlocks = useCallback((blocks) => setDraft((d) => ({ ...d, blocks })), []);
  const updateBlock = useCallback(
    (next) => setDraft((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === next.id ? next : b)) })),
    [],
  );

  const save = useCallback(async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const res = await service.save(templateKey, draft);
      setBaseline(draft);
      setData((d) => ({
        ...d,
        current: {
          ...draft,
          enabled: d?.current?.enabled !== false,
          updatedAt: res?.template?.updatedAt || new Date().toISOString(),
          updatedBy: res?.template?.updatedBy || d?.current?.updatedBy,
        },
      }));
      toast.success("Saved — this is what will be sent from now on");
      if (res?.warnings?.length) {
        toast(
          `Heads up: ${res.warnings.join(", ")} ${res.warnings.length === 1 ? "isn't" : "aren't"} supplied for this email`,
          { icon: "⚠️", duration: 6000 },
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't save");
    } finally {
      setSaving(false);
    }
  }, [draft, saving, service, templateKey]);

  const revert = useCallback(async () => {
    if (!window.confirm("Discard your version and go back to the default? This can't be undone.")) return;
    try {
      await service.reset(templateKey);
      // `reset` already dropped this key from the cache, so a plain get is a
      // fresh read — forcing one would only bypass de-duplication.
      const res = await service.get(templateKey);
      setData(res);
      const start = draftFrom(res.inherited || res.defaults);
      setDraft(start);
      setBaseline(start);
      setSelectedId(start.blocks[0]?.id || null);
      toast.success("Reverted to the default");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't revert");
    }
  }, [service, templateKey]);

  const sendTest = useCallback(async () => {
    setTesting(true);
    try {
      const res = await service.sendTest(templateKey, { draft });
      toast.success(res.message || "Test sent");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't send the test");
    } finally {
      setTesting(false);
    }
  }, [service, templateKey, draft]);

  /* ── leaving with unsaved work ──────────────────────────────────────── */

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const leave = useCallback(() => {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
    onBack?.();
  }, [dirty, onBack]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, save]);

  /* ── on narrow screens the inspector sits below a long canvas ────────── */

  const firstSelection = useRef(true);
  useEffect(() => {
    if (firstSelection.current) {
      firstSelection.current = false;
      return;
    }
    if (!selectedId || window.innerWidth >= SPLIT_AT) return;
    inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  /* ── render ─────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading email" />
      </div>
    );
  }

  if (loadError || !draft) {
    return (
      <div>
        <SAErrorState
          message={loadError || "That email couldn't be found."}
          // It had no retry at all before — a failed load left you with one
          // link back to the list and no way to try again from here.
          onRetry={loadError ? () => setReloadNonce((k) => k + 1) : undefined}
          className="rounded-2xl"
        />
        <button
          onClick={onBack}
          className="mx-auto mt-3 block text-xs font-medium text-accent hover:underline"
        >
          Back to {backLabel.toLowerCase()}
        </button>
      </div>
    );
  }

  const t = data.template;
  const customised = !!data.current;
  const inheritLabel =
    data.inherited?.source === "platform" ? "the platform default" : "the built-in default";
  const warnings = preview.warnings || [];

  // Below xl only the active pane shows; from xl up everything does. The
  // shown-display matters: the preview and variables panes have to be flex
  // columns at every size or their children can not fill (and therefore can
  // not scroll) — which is what let the variable list grow to 1,200px.
  const paneCls = (key, shown = "block", xlDisplay = "xl:block") =>
    cn(pane === key ? shown : "hidden", xlDisplay);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* ── header ── */}
      <div className="mb-4">
        <button
          onClick={leave}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </button>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white/90">{t.label}</h1>
            {t.required && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/10 dark:text-white/50">
                <Lock className="h-2.5 w-2.5" /> Always on
              </span>
            )}
            {t.hasAttachment && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
                <Paperclip className="h-2.5 w-2.5" /> {t.hasAttachment}
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/10 dark:text-white/50">
              To: {t.audience}
            </span>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-gray-500 dark:text-white/55">{t.description}</p>

          {/* Where the content currently comes from — this is the thing operators
              most often get wrong about a layered system. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 dark:text-white/50">
            {customised ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span>
                  Customised
                  {data.current?.updatedBy?.name || data.current?.updatedBy?.email
                    ? ` by ${data.current.updatedBy.name || data.current.updatedBy.email}`
                    : ""}
                  {data.current?.updatedAt
                    ? ` on ${new Date(data.current.updatedAt).toLocaleDateString()}`
                    : ""}
                  .
                </span>
              </>
            ) : (
              <>
                <Layers className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span>Currently using {inheritLabel}. Saving creates your own version.</span>
              </>
            )}
            <span className="font-mono text-[10px] text-gray-300 dark:text-white/25">· {t.key}</span>
          </div>
        </div>
      </div>

      {/* ── subject + preheader ── */}
      <div className={cn(card, "mb-4 grid gap-4 p-4 sm:grid-cols-2")}>
        <div>
          <label className={labelCls}>Subject line</label>
          <input
            {...registerField("subject")}
            value={draft.subject}
            onChange={(e) => patch({ subject: e.target.value })}
            placeholder="Thanks for your gift, {{donor.firstName}}"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            Preview text
            <span className="ml-1 normal-case tracking-normal text-gray-300">
              shown next to the subject in most inboxes
            </span>
          </label>
          <input
            {...registerField("preheader")}
            value={draft.preheader}
            onChange={(e) => patch({ preheader: e.target.value })}
            placeholder="Your receipt is attached"
            className={inputCls}
          />
        </div>
      </div>

      {/* ── sticky action bar ──
          The pane tabs and the save button share one strip so both stay
          reachable from anywhere in a long block list. It used to live in the
          header, which meant scrolling back up to save. */}
      <div
        className="sticky top-16 z-20 -mx-2 mb-4 flex flex-wrap items-center gap-2 px-2 py-2"
        style={{ backgroundColor: "var(--tenant-bg, #fff)" }}
      >
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 xl:hidden dark:border-white/10">
          {PANES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPane(p.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                pane === p.key
                  ? "bg-accent/10 text-accent"
                  : "text-gray-500 hover:text-gray-800 dark:text-white/45 dark:hover:text-white/80",
              )}
            >
              <p.icon className="h-3.5 w-3.5" />
              <span className={p.key === "content" ? "" : "hidden sm:inline"}>{p.label}</span>
              {p.key === "preview" && warnings.length > 0 && (
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              )}
            </button>
          ))}
        </div>

        <span
          className={cn(
            "hidden items-center gap-1.5 text-[11px] xl:inline-flex",
            dirty ? "text-amber-600 dark:text-amber-400" : "text-gray-400",
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", dirty ? "bg-amber-500" : "bg-gray-300")}
          />
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={sendTest}
            disabled={testing}
            title="Send this draft to your own address"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800 disabled:opacity-50 dark:border-white/10 dark:text-white/65"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Send test to me</span>
          </button>
          {customised && (
            <button
              onClick={revert}
              title="Discard your version and go back to the default"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-red-200 hover:text-red-600 dark:border-white/10 dark:text-white/65"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Revert to default</span>
            </button>
          )}
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-40 sm:px-4"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      {/* ── workspace ── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,440px)] xl:items-start 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,500px)]">
        {/* content */}
        <div className={cn(paneCls("content"), "space-y-4")}>
          <div className={cn(card, "overflow-hidden")}>
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-white/10">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
                Content
              </span>
              <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-white/5">
                <ModeBtn
                  active={draft.mode === "blocks"}
                  onClick={() => patch({ mode: "blocks" })}
                  icon={Blocks}
                  label="Builder"
                />
                <ModeBtn
                  active={draft.mode === "html"}
                  onClick={() => patch({ mode: "html" })}
                  icon={Code2}
                  label="HTML"
                />
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {draft.mode === "blocks" ? (
                <BlockCanvas
                  blocks={draft.blocks}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onChange={setBlocks}
                />
              ) : (
                <>
                  <p className="mb-2 text-[11px] leading-relaxed text-gray-400">
                    Raw HTML for the email body. The shared header, footer and branding still wrap
                    it. Use table-based, inline-styled markup — mail clients ignore{" "}
                    <code className="font-mono">&lt;style&gt;</code> and don’t support flexbox.
                  </p>
                  <textarea
                    {...registerField("html")}
                    rows={22}
                    value={draft.html}
                    onChange={(e) => patch({ html: e.target.value })}
                    placeholder="<p>Hi {{recipient.firstName}},</p>"
                    className={cn(inputCls, "resize-y font-mono text-xs leading-relaxed")}
                  />
                </>
              )}
            </div>
          </div>

          {/* inspector for the selected block */}
          {draft.mode === "blocks" && (
            <div ref={inspectorRef} className={cn(card, "scroll-mt-32 p-3 sm:p-4")}>
              <BlockInspector
                block={selectedBlock}
                onChange={updateBlock}
                registerField={registerField}
              />
            </div>
          )}
        </div>

        {/* the preview keeps the pinned column to itself from xl up */}
        <div className="contents xl:sticky xl:top-[7.5rem] xl:flex xl:h-[calc(100vh-8.5rem)] xl:flex-col">
          <div
            className={cn(
              paneCls("preview", "flex", "xl:flex"),
              card,
              "min-h-[65vh] flex-col p-3 sm:p-4 xl:min-h-0 xl:flex-1",
            )}
          >
            <EmailPreview
              html={preview.html}
              subject={preview.subject}
              text={preview.text}
              loading={previewLoading}
              error={previewError}
              warnings={warnings}
            />
          </div>
        </div>
      </div>

      {/* ── variables dock ──
          Full width at the end of the workspace, in normal flow. It belongs
          here rather than beside the preview: the fields it inserts into are in
          the LEFT column, and the width lets 33 variables lay out in three
          readable columns instead of one narrow scrolling strip. */}
      <div
        className={cn(
          paneCls("variables", "flex", "xl:flex"),
          card,
          "mt-4 min-h-[60vh] flex-col p-3 sm:p-4",
          "xl:mt-4 xl:min-h-0 xl:overflow-hidden xl:p-3 xl:transition-[height] xl:duration-200",
          varsOpen ? "xl:h-[26rem]" : "xl:h-[3.5rem]",
        )}
      >
        <VariablePalette
          variables={data.variables}
          onInsert={insertVariable}
          armed={hasField}
          collapsed={!varsOpen}
          onToggleCollapse={() => setVarsOpen((v) => !v)}
        />
      </div>
    </motion.div>
  );
}

function ModeBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-white text-gray-800 shadow-sm dark:bg-white/15 dark:text-white"
          : "text-gray-400 hover:text-gray-600 dark:hover:text-white/70",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
