import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import Portal from "../../components/Portal";
import { cn } from "../../utils/cn";

// Normalise options: accepts ["a","b"], [["a","Label"]] tuples, or [{value,label}].
function normalize(options) {
  return (options || []).map((o) => {
    if (Array.isArray(o)) return { value: o[0], label: o[1] ?? String(o[0]) };
    if (o && typeof o === "object") return { value: o.value, label: o.label ?? String(o.value) };
    return { value: o, label: String(o) };
  });
}

/**
 * Custom dropdown used across the SuperAdmin console in place of native <select>
 * — consistent styling, dark-mode aware, accent-highlighted selection, keyboard
 * navigable. Calls onChange(value) directly (not an event).
 *
 * The menu is rendered through a Portal and positioned against the viewport,
 * NOT absolutely inside the trigger's box. An absolute menu is clipped by any
 * scrolling or `overflow-hidden` ancestor, and this control's natural home is
 * a table cell — inside `overflow-x-auto` inside an `overflow-hidden` card,
 * which is exactly where it was being cut off. The Portal targets the admin
 * shell rather than <body> so dark-mode styling still applies.
 */
export default function SASelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  fullWidth = false,
  capitalize = false,
  align = "left",
  className,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const opts = normalize(options);
  const idx = opts.findIndex((o) => String(o.value) === String(value));
  const current = idx >= 0 ? opts[idx] : null;

  // Place the menu under (or over) the trigger, clamped to the viewport, and
  // keep it there while anything scrolls — `capture` because scroll events from
  // an inner container don't bubble.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Anchor scrolled out of sight → nothing left to point at.
      if (r.bottom < 0 || r.top > window.innerHeight) { setOpen(false); return; }
      const h = menuRef.current?.offsetHeight || 0;
      const room = window.innerHeight - r.bottom - 8;
      const flip = h > room && r.top - 8 > h;
      const width = Math.max(r.width, 150);
      const rawLeft = align === "right" ? r.right - width : r.left;
      setPos({
        top: flip ? Math.max(8, r.top - 4 - h) : Math.min(r.bottom + 4, window.innerHeight - h - 8),
        left: Math.max(8, Math.min(rawLeft, window.innerWidth - width - 8)),
        width,
        // Match whatever corner the trigger has: square in the SuperAdmin
        // console, rounded in the tenant admin's email builder.
        radius: window.getComputedStyle(el).borderRadius,
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, align, opts.length]);

  useEffect(() => {
    if (!open) return undefined;
    // The menu lives outside `ref` now, so it has to be excluded explicitly —
    // otherwise mousedown on an option closes the menu before its click lands.
    const onDoc = (e) => {
      if (ref.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (v) => { onChange?.(v); setOpen(false); };

  const onKey = (e) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); setOpen(true); setHi(idx >= 0 ? idx : 0); }
      return;
    }
    if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min((h < 0 ? idx : h) + 1, opts.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max((h < 0 ? idx : h) - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (opts[hi]) choose(opts[hi].value); }
  };

  return (
    <div ref={ref} className={cn("relative", fullWidth ? "w-full" : "inline-block")}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm text-gray-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5 dark:text-white/85",
          open ? "border-accent" : "border-gray-200 hover:border-gray-300 dark:border-white/10",
          fullWidth ? "w-full" : "min-w-[150px]",
          capitalize && "capitalize",
          className,
        )}
      >
        <span className={cn("truncate", !current && "text-gray-400")}>{current ? current.label : placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <Portal>
          <ul
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              minWidth: pos?.width ?? 150,
              maxWidth: Math.max(pos?.width ?? 150, 320),
              borderRadius: pos?.radius,
              // Hidden for the first frame, before `place()` has measured it.
              visibility: pos ? "visible" : "hidden",
            }}
            className="scroll-slim z-[60] max-h-64 overflow-auto border border-gray-100 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[var(--admin-elevated)]"
          >
            {opts.map((o, i) => {
              const sel = String(o.value) === String(value);
              return (
                <li key={String(o.value)} role="option" aria-selected={sel}>
                  <button
                    type="button"
                    onMouseEnter={() => setHi(i)}
                    onClick={() => choose(o.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                      capitalize && "capitalize",
                      sel ? "bg-accent/10 font-medium text-accent" : i === hi ? "bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-white/80" : "text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5",
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {sel ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Portal>
      )}
    </div>
  );
}
