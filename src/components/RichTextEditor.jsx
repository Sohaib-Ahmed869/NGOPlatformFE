import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Bold, Italic, Underline, List, ListOrdered, Link2, Heading2, Heading3, Quote, Eraser } from "lucide-react";
import { cn } from "../utils/cn";

// What we keep when sanitizing the editor's HTML — a safe, small subset.
// `class` + `data-mention` are allowed so @mention chips survive sanitisation.
const SANITIZE = {
  ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h2", "h3", "blockquote", "span"],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "data-mention"],
};
export const sanitizeRichText = (html) => DOMPurify.sanitize(html || "", SANITIZE);

function ToolBtn({ onMouseDown, active, title, children }) {
  return (
    <button
      type="button"
      // onMouseDown (not onClick) so the editor keeps its selection/focus.
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded transition-colors",
        active ? "bg-accent/15 text-accent" : "text-gray-500 hover:bg-gray-200/70 hover:text-gray-700",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Lightweight WYSIWYG: contentEditable + execCommand, output sanitised to a
 * small HTML subset. No external editor dependency.
 *
 * Optional @mentions (opt-in): pass `mentionItems` ([{ _id, name, email?,
 * profileImage? }]) to enable an "@" autocomplete that inserts a mention chip.
 * `onMentions(ids)` reports the set of mentioned ids on every change. When
 * `mentionItems` is omitted the editor behaves exactly as before.
 */
export function RichTextEditor({ value, onChange, placeholder = "Write…", mentionItems = null, onMentions }) {
  const ref = useRef(null);
  const [active, setActive] = useState({});
  const [mention, setMention] = useState({ open: false, items: [], index: 0, rect: null });

  // Push external value into the DOM only when it differs AND the user isn't
  // currently typing in it — prevents caret jumps and needless re-paints.
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.innerHTML !== (value || "")) el.innerHTML = value || "";
  }, [value]);

  const emit = () => {
    onChange(sanitizeRichText(ref.current?.innerHTML));
    if (onMentions) {
      const ids = Array.from(ref.current?.querySelectorAll("[data-mention]") || []).map((el) =>
        el.getAttribute("data-mention"),
      );
      onMentions([...new Set(ids)]);
    }
  };

  // ── @mention autocomplete ──────────────────────────────────────────────
  const closeMention = () => setMention((m) => (m.open ? { ...m, open: false } : m));

  const updateMention = () => {
    if (!mentionItems) return;
    const selSafe = window.getSelection();
    if (!selSafe || !selSafe.rangeCount || !selSafe.isCollapsed) return closeMention();
    const range = selSafe.getRangeAt(0);
    const node = range.startContainer;
    if (!node || node.nodeType !== 3) return closeMention();
    const before = node.textContent.slice(0, range.startOffset);
    const match = before.match(/(?:^|\s)@([\p{L}\p{N}._-]*)$/u);
    if (!match) return closeMention();
    const query = match[1].toLowerCase();
    const items = mentionItems
      .filter((it) => !query || (it.name || "").toLowerCase().includes(query) || (it.email || "").toLowerCase().includes(query))
      .slice(0, 6);
    if (!items.length) return closeMention();
    const r = range.getClientRects()[0] || range.getBoundingClientRect();
    setMention({ open: true, items, index: 0, rect: { left: r.left, bottom: r.bottom } });
  };

  const chooseMention = (item) => {
    const selSafe = window.getSelection();
    if (!selSafe || !selSafe.rangeCount) return;
    const range = selSafe.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== 3) return;
    const end = range.startOffset;
    const at = node.textContent.slice(0, end).lastIndexOf("@");
    if (at === -1) return;
    const r = document.createRange();
    r.setStart(node, at);
    r.setEnd(node, end);
    r.deleteContents();
    const span = document.createElement("span");
    span.setAttribute("data-mention", item._id ?? item.id);
    span.setAttribute("contenteditable", "false");
    span.className = "mention";
    span.textContent = `@${item.name}`;
    r.insertNode(span);
    const space = document.createTextNode(" ");
    span.after(space);
    const after = document.createRange();
    after.setStartAfter(space);
    after.collapse(true);
    selSafe.removeAllRanges();
    selSafe.addRange(after);
    setMention((m) => ({ ...m, open: false }));
    emit();
  };

  const onKeyDown = (e) => {
    if (!mention.open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMention((m) => ({ ...m, index: (m.index + 1) % m.items.length }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMention((m) => ({ ...m, index: (m.index - 1 + m.items.length) % m.items.length }));
    } else if (e.key === "Enter") {
      e.preventDefault();
      chooseMention(mention.items[mention.index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMention();
    }
  };

  const refreshActive = () => {
    if (typeof document.queryCommandState !== "function") return;
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      ul: document.queryCommandState("insertUnorderedList"),
      ol: document.queryCommandState("insertOrderedList"),
    });
  };

  const exec = (cmd, arg) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
    refreshActive();
  };

  const block = (tag) => {
    // Toggle a block back to a paragraph when it's already that tag.
    const cur = document.queryCommandValue?.("formatBlock");
    exec("formatBlock", cur && cur.toLowerCase() === tag.toLowerCase() ? "p" : tag);
  };

  const addLink = () => {
    const url = window.prompt("Link URL (https://…)");
    if (url) exec("createLink", url);
  };

  return (
    <div className="border border-gray-200 transition-colors focus-within:border-accent">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50 px-1.5 py-1">
        <ToolBtn onMouseDown={() => exec("bold")} active={active.bold} title="Bold"><Bold className="h-4 w-4" /></ToolBtn>
        <ToolBtn onMouseDown={() => exec("italic")} active={active.italic} title="Italic"><Italic className="h-4 w-4" /></ToolBtn>
        <ToolBtn onMouseDown={() => exec("underline")} active={active.underline} title="Underline"><Underline className="h-4 w-4" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolBtn onMouseDown={() => block("H2")} title="Heading"><Heading2 className="h-4 w-4" /></ToolBtn>
        <ToolBtn onMouseDown={() => block("H3")} title="Subheading"><Heading3 className="h-4 w-4" /></ToolBtn>
        <ToolBtn onMouseDown={() => block("BLOCKQUOTE")} title="Quote"><Quote className="h-4 w-4" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolBtn onMouseDown={() => exec("insertUnorderedList")} active={active.ul} title="Bulleted list"><List className="h-4 w-4" /></ToolBtn>
        <ToolBtn onMouseDown={() => exec("insertOrderedList")} active={active.ol} title="Numbered list"><ListOrdered className="h-4 w-4" /></ToolBtn>
        <ToolBtn onMouseDown={addLink} title="Add link"><Link2 className="h-4 w-4" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolBtn onMouseDown={() => exec("removeFormat")} title="Clear formatting"><Eraser className="h-4 w-4" /></ToolBtn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          emit();
          updateMention();
        }}
        onKeyDown={onKeyDown}
        onKeyUp={() => {
          refreshActive();
          updateMention();
        }}
        onMouseUp={() => {
          refreshActive();
          updateMention();
        }}
        onBlur={() => setTimeout(closeMention, 150)}
        data-placeholder={placeholder}
        className="prose prose-sm min-h-[140px] max-w-none px-3 py-2.5 text-sm text-gray-800 outline-none dark:prose-invert empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
      />

      {mention.open && mention.rect ? (
        <div
          style={{ position: "fixed", left: mention.rect.left, top: mention.rect.bottom + 4, zIndex: 60 }}
          className="w-60 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xl dark:border-white/10 dark:bg-[var(--admin-elevated)]"
          role="listbox"
        >
          {mention.items.map((it, i) => (
            <button
              key={it._id ?? it.id}
              type="button"
              // onMouseDown (not click) keeps the editor's selection alive.
              onMouseDown={(e) => {
                e.preventDefault();
                chooseMention(it);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                i === mention.index ? "bg-accent/10 text-accent" : "text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5",
              )}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-[10px] font-bold uppercase text-accent">
                {(it.name || "?").charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{it.name}</span>
                {it.email ? <span className="block truncate text-[11px] text-gray-400">{it.email}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default RichTextEditor;
