import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Monitor,
  Smartphone,
  FileText,
  Loader2,
  AlertTriangle,
  Mail,
  Maximize2,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * The live preview pane: the rendered email exactly as the server will send it.
 *
 * The HTML goes into a SANDBOXED iframe, never dangerouslySetInnerHTML. Two
 * reasons: an email document carries its own <html>/<body> and page-level
 * styles that would leak into and restyle the console, and the markup is
 * operator-authored (the custom-HTML block is an explicit escape hatch), so it
 * gets no script access and no same-origin privileges here.
 *
 * Beside the editor the pane is ~440px wide, which is narrower than the 680px
 * an email actually renders at — so "Desktop" there is a lie of omission. The
 * expand button opens the same preview full-screen to settle it. It goes
 * through a portal because an ancestor carries a transform (the editor's entry
 * animation), and a transformed ancestor becomes the containing block for
 * `position: fixed`.
 */

const WIDTHS = { desktop: 680, mobile: 390 };

export default function EmailPreview({ html, subject, text, loading, error, warnings = [] }) {
  const [device, setDevice] = useState("desktop");
  const [showText, setShowText] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    // The page behind a full-screen overlay must not scroll with it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const toolbar = (onClose) => (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
        Preview
      </span>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-white/5">
          <Toggle
            active={!showText && device === "desktop"}
            onClick={() => {
              setShowText(false);
              setDevice("desktop");
            }}
            title="Desktop"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            active={!showText && device === "mobile"}
            onClick={() => {
              setShowText(false);
              setDevice("mobile");
            }}
            title="Mobile"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle active={showText} onClick={() => setShowText(true)} title="Plain-text part">
            <FileText className="h-3.5 w-3.5" />
          </Toggle>
        </div>
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            title="Open full screen — this pane is narrower than a real inbox"
            className="grid h-7 w-8 place-items-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white/80"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="grid h-7 w-8 place-items-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white/80"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const body = (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-black/20">
      {loading && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] text-gray-500 shadow-sm backdrop-blur dark:bg-black/60 dark:text-white/60">
          <Loader2 className="h-3 w-3 animate-spin" />
          Rendering
        </div>
      )}

      {error ? (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <div>
            <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-400" />
            <p className="text-sm text-gray-600 dark:text-white/70">{error}</p>
          </div>
        </div>
      ) : showText ? (
        <pre className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-[11px] leading-relaxed text-gray-600 dark:text-white/60">
          {text || "…"}
        </pre>
      ) : (
        // overflow-HIDDEN, not auto: the iframe already scrolls its own
        // document, and letting this scroll too put two scrollbars side by
        // side with no way to tell which one moved the email.
        <div className="h-full overflow-hidden p-3 sm:p-4">
          <div
            className="mx-auto h-full transition-[max-width] duration-300"
            style={{ maxWidth: WIDTHS[device] }}
          >
            <iframe
              title="Email preview"
              srcDoc={html || ""}
              // No allow-scripts and no allow-same-origin: the preview is
              // inert, and operator HTML can't reach the console around it.
              sandbox=""
              // Fills the pinned column from xl up; the minimum keeps it
              // usable where the pane is auto-height instead.
              className="h-full min-h-[280px] w-full rounded-lg border border-gray-200 bg-white dark:border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );

  const subjectLine = (
    /* Inbox-style subject line — the first thing a recipient actually reads.
       One line, not a labelled card: this sits above a pinned preview, so every
       fixed pixel of chrome comes straight out of the email below it. */
    <div
      title={subject || ""}
      className="mb-2 flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <Mail className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-white/25" />
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-800 dark:text-white/85">
        {subject || <span className="italic text-gray-300">No subject yet</span>}
      </p>
    </div>
  );

  const warningBanner = warnings.length > 0 && (
    <div
      title="These will render as nothing when the email is actually sent."
      className="mb-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 dark:border-amber-400/20 dark:bg-amber-400/10"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      <p className="min-w-0 text-[11px] leading-snug text-amber-800 dark:text-amber-300">
        {warnings.length === 1 ? "One variable isn’t" : `${warnings.length} variables aren’t`} supplied
        for this email:{" "}
        <span className="break-words font-mono text-[10px] text-amber-700 dark:text-amber-400/80">
          {warnings.join(", ")}
        </span>
      </p>
    </div>
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {toolbar()}
        {subjectLine}
        {warningBanner}
        {/* One iframe at a time: while the overlay is open the inline copy
            would be a second full email document rendering behind it. */}
        {expanded ? (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-gray-200 p-6 text-center dark:border-white/10">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs font-medium text-accent hover:underline"
            >
              Showing full screen — click to come back
            </button>
          </div>
        ) : (
          body
        )}
      </div>

      {expanded &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex flex-col bg-black/70 p-3 backdrop-blur-sm sm:p-6">
            <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col rounded-2xl bg-white p-3 shadow-2xl sm:p-4 dark:bg-[var(--admin-card,#151a18)]">
              {toolbar(() => setExpanded(false))}
              {subjectLine}
              {warningBanner}
              {body}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function Toggle({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "grid h-7 w-8 place-items-center rounded-md transition-colors",
        active
          ? "bg-white text-gray-800 shadow-sm dark:bg-white/15 dark:text-white"
          : "text-gray-400 hover:text-gray-600 dark:hover:text-white/70",
      )}
    >
      {children}
    </button>
  );
}
