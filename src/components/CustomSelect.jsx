import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
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
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
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
  const scrolls = searchable || options.length > 7;

  const toggle = () => {
    if (disabled) return;
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        // Open upward when there isn't room below and there's more room above.
        setDropUp(spaceBelow < 300 && rect.top > spaceBelow);
      }
      setQuery("");
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
        <div
          className={cn(
            "absolute left-0 z-40 w-max min-w-full max-w-[20rem] overflow-hidden border border-gray-100 bg-white shadow-xl dark:border-white/10 dark:bg-[var(--admin-elevated)]",
            dropUp ? "bottom-full mb-2" : "top-full mt-2",
            menuClassName,
          )}
          role="listbox"
        >
          {searchable ? (
            <div className="border-b border-gray-100 p-2 dark:border-white/10">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white"
              />
            </div>
          ) : null}
          <div className={cn("p-1.5", scrolls && "max-h-60 overflow-auto")}>
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
      ) : null}
    </div>
  );
}

export default CustomSelect;
