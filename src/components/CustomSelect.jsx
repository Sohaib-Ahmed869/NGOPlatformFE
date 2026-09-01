import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import Portal from "./Portal";
import { cn } from "../utils/cn";

/**
 * CustomSelect — the single, themed replacement for the native <select> across
 * the admin portal. Options follow the tenant theme (accent highlight + Check
 * mark) instead of the browser's default dropdown, and it's dark-mode aware,
 * opens up or down based on available space, and closes on outside-click /
 * Escape / selection. Optionally searchable.
 *
 * Drop-in usage (keep the old control's look): move the native <select>'s
 * className onto `triggerClassName`, turn <option>s into `options`, and note
 * that `onChange` now receives the VALUE (not an event):
 *
 *   <CustomSelect
 *     value={status}
 *     onChange={setStatus}                       // (value) => void
 *     options={[{ value: "all", label: "All status" }, ...]}
 *     triggerClassName="border border-gray-200 rounded-xl px-3 py-2 text-sm ..."
 *   />
 *
 * Props:
 *  - value, onChange(value), options: [{ value, label, icon? }]
 *  - placeholder        text shown when nothing matches `value`
 *  - icon               leading icon component (lucide)
 *  - searchable         show a filter box at the top of the menu
 *  - searchPlaceholder  placeholder for that filter box
 *  - variant            "box" (bordered control, default) | "line" (underline)
 *  - disabled
 *  - className          wrapper sizing (e.g. "w-full", "sm:w-48", min-width)
 *  - triggerClassName   override/extend the trigger chrome (border/padding/etc.)
 *  - menuClassName      extend the dropdown panel
 *  - buttonProps        extra props spread onto the trigger button
 */
export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  icon: Icon,
  searchable = false,
  searchPlaceholder = "Search…",
  variant = "box",
  disabled = false,
  className,
  triggerClassName,
  menuClassName,
  buttonProps,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const naturalRef = useRef(0); // uncapped menu height, measured once per open

  const selected = options.find((o) => String(o.value) === String(value));
  const q = query.trim().toLowerCase();
  const filtered =
    searchable && q
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            String(o.value).toLowerCase().includes(q),
        )
      : options;

  useEffect(() => {
    if (!open) return;
    // The menu is portalled out of `ref` now, so exclude it explicitly —
    // otherwise mousedown on an option closes the menu before its click lands.
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* Placement. The menu is fixed to the viewport rather than absolute inside the
     trigger, because an absolute menu is clipped by any scrolling or
     `overflow-hidden` ancestor — a table cell, a card, a scroll pane — which is
     where this control usually lives. Positioning here also means the up/down
     decision can be made against the MEASURED menu, and the menu capped to the
     space that's actually there instead of running off-screen either way. */
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) { setOpen(false); return; } // anchor scrolled away
      if (!naturalRef.current) naturalRef.current = menuRef.current?.offsetHeight || 0;

      const GAP = 6;
      const EDGE = 8;
      const natural = Math.min(naturalRef.current || 240, 320);
      const below = window.innerHeight - r.bottom - GAP - EDGE;
      const above = r.top - GAP - EDGE;
      // Open upward when it doesn't fit below and there's more room above.
      const up = natural > below && above > below;
      const maxHeight = Math.max(120, Math.min(natural, up ? above : below));
      const width = Math.min(Math.max(r.width, 160), Math.min(320, window.innerWidth - EDGE * 2));

      setPos({
        top: up ? Math.max(EDGE, r.top - GAP - maxHeight) : Math.min(r.bottom + GAP, window.innerHeight - maxHeight - EDGE),
        left: Math.max(EDGE, Math.min(r.left, window.innerWidth - width - EDGE)),
        minWidth: r.width,
        maxWidth: Math.min(320, window.innerWidth - EDGE * 2),
        maxHeight,
        // Match the trigger's corner so the portalled panel doesn't come out
        // rounded on a square screen (or vice versa).
        radius: window.getComputedStyle(el).borderRadius,
      });
    };
    place();
    // `capture` — scroll events from an inner scroll container don't bubble.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, filtered.length]);


  const toggle = () => {
    if (disabled) return;
    if (!open) {
      setQuery("");
      setPos(null);
      naturalRef.current = 0; // re-measure; the option count may have changed
    }
    setOpen((v) => !v);
  };

  // Functional layout always applies; default visual chrome ONLY when the caller
  // didn't supply their own (cn has no tailwind-merge, so we mustn't emit
  // conflicting border/padding classes).
  const functional =
    "flex w-full items-center gap-2.5 text-left outline-none disabled:cursor-not-allowed disabled:opacity-60";
  const defaultChrome =
    variant === "line"
      ? "border-b border-gray-200 bg-transparent py-2.5 text-sm transition-colors focus:border-accent dark:border-white/15"
      : "border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:border-gray-300 focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]";

  return (
    <div className={cn("relative inline-block", className)} ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(functional, !triggerClassName && defaultChrome, triggerClassName)}
        {...buttonProps}
      >
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-gray-400" /> : null}
        <span
          className={cn(
            "flex-1 truncate",
            selected ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-white/40",
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <Portal>
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            minWidth: pos?.minWidth,
            maxWidth: pos?.maxWidth ?? 320,
            maxHeight: pos?.maxHeight,
            borderRadius: pos?.radius,
            // Hidden for the frame before `place()` has measured it.
            visibility: pos ? "visible" : "hidden",
          }}
          // z-110 sits ABOVE the dialog layer (modals are 70–90, the confirm
          // dialog is 100). A menu is always opened from something, so it has
          // to paint over whatever that something is — at z-60 a select inside
          // any modal opened its list underneath the modal's own backdrop,
          // where it was both invisible and unclickable.
          className={cn(
            "z-[110] flex w-max flex-col overflow-hidden border border-gray-100 bg-white shadow-xl dark:border-white/10 dark:bg-[var(--admin-elevated)]",
            menuClassName,
          )}
          role="listbox"
        >
          {searchable ? (
            <div className="shrink-0 border-b border-gray-100 p-2 dark:border-white/10">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white"
              />
            </div>
          ) : null}
          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-gray-400">No matches</p>
            ) : (
              filtered.map((o) => {
                const isSel = String(o.value) === String(value);
                const OptIcon = o.icon;
                return (
                  <button
                    key={String(o.value)}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => {
                      onChange?.(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      isSel
                        ? "bg-accent/10 font-medium text-accent"
                        : "text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5",
                    )}
                  >
                    {OptIcon ? <OptIcon className="h-4 w-4 shrink-0" /> : null}
                    <span className="flex-1 truncate">{o.label}</span>
                    {isSel ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
        </Portal>
      ) : null}
    </div>
  );
}

export default CustomSelect;
