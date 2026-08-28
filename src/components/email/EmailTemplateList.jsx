import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  Lock,
  Paperclip,
  Pencil,
  ChevronRight,
  ChevronDown,
  Shield,
  CornerDownLeft,
  Inbox,
} from "lucide-react";
import TabLoader from "../TabLoader";
import SAErrorState from "../../SuperAdmin/components/SAErrorState";
import { cn } from "../../utils/cn";

/**
 * The catalogue browser, shared by the platform console and a charity's portal.
 *
 * The problem it solves: 43 emails in 13 categories, rendered flat, is four
 * screens of scrolling to reach "Platform team" — and the thing an operator
 * actually does here is *find one email and open it*. So the categories became
 * a standing rail rather than headings you scroll past, the filters stick to
 * the top instead of disappearing at the first scroll, and the keyboard can
 * drive the whole thing.
 *
 * The other half is subtraction. A badge on 30 of 43 rows is furniture, not
 * information, so "tenant-overridable" inverted into "platform only" on the 13
 * it actually distinguishes. "no failures" repeated 43 times is worse than
 * silence — an empty activity column now means nothing has gone wrong.
 *
 * Filters are lifted so the platform screen can put them in the URL; the tenant
 * tab keeps them local.
 */

const card =
  "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";

const STATUS_PILLS = [
  ["all", "All"],
  ["customised", "Customised"],
  ["default", "Default"],
  ["off", "Off"],
  ["failing", "Failing"],
];

const readCollapsed = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export default function EmailTemplateList({
  templates,
  groups,
  loading,
  error,
  onRetry,
  busyKeys,
  onToggle,
  onOpen,
  filters,
  onFilters,
  showScope = false,
  storageKey = "email-console-collapsed",
  emptyHint,
  // The other tabs keep this list mounted but hidden, so the shortcuts have to
  // be switched off with it — otherwise "/" would focus a search box nobody can
  // see while you're reading the send log.
  shortcuts = true,
}) {
  const { q = "", group = "all", status = "all" } = filters || {};
  const set = useCallback((patch) => onFilters({ ...filters, ...patch }), [filters, onFilters]);

  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [active, setActive] = useState(-1);
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey));

  /**
   * The search box types into local state and pushes to the owner on a delay.
   *
   * The platform console keeps filters in the URL, and a router navigation per
   * keystroke is a lot of machinery to spell "recei". Filtering itself runs off
   * the local term, so results are instant either way — the URL is only there
   * for refreshes and deep links, and it can afford to lag. `pushed` tracks
   * what we last handed over, so an outside change (Clear filters, the Back
   * button) is recognised as external and adopted rather than fought.
   */
  const [term, setTerm] = useState(q);
  const pushed = useRef(q);

  useEffect(() => {
    if (q === pushed.current) return;
    pushed.current = q;
    setTerm(q);
  }, [q]);

  useEffect(() => {
    if (term === pushed.current) return undefined;
    const t = setTimeout(() => {
      pushed.current = term;
      set({ q: term });
    }, 220);
    return () => clearTimeout(t);
  }, [term, set]);

  const clearSearch = useCallback(() => {
    pushed.current = "";
    setTerm("");
    set({ q: "" });
  }, [set]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...collapsed]));
    } catch {
      /* private mode — collapse state is a convenience, not data */
    }
  }, [collapsed, storageKey]);

  /* ── filtering ─────────────────────────────────────────────────────────
     Category counts are faceted: they reflect the search and status, so the
     rail shows you where the matches actually live rather than a static tally. */

  const matched = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return templates.filter((t) => {
      if (status === "customised" && !t.customised) return false;
      if (status === "default" && t.customised) return false;
      if (status === "off" && t.enabled) return false;
      if (status === "failing" && !t.failed30d) return false;
      if (!needle) return true;
      return (
        t.label.toLowerCase().includes(needle) ||
        t.key.toLowerCase().includes(needle) ||
        String(t.description || "").toLowerCase().includes(needle) ||
        String(t.audience || "").toLowerCase().includes(needle)
      );
    });
  }, [templates, term, status]);

  const facets = useMemo(() => {
    const map = new Map();
    for (const t of matched) {
      const f = map.get(t.group) || { count: 0, failed: 0, customised: 0 };
      f.count += 1;
      if (t.failed30d) f.failed += 1;
      if (t.customised) f.customised += 1;
      map.set(t.group, f);
    }
    return map;
  }, [matched]);

  const visible = useMemo(
    () => (group === "all" ? matched : matched.filter((t) => t.group === group)),
    [matched, group],
  );

  // Searching must never hide a hit behind a collapsed header.
  const forceOpen = !!term.trim() || status !== "all" || group !== "all";

  const sections = useMemo(() => {
    const byKey = new Map(groups.map((g) => [g.key, { ...g, items: [] }]));
    for (const t of visible) byKey.get(t.group)?.items.push(t);
    return [...byKey.values()].filter((g) => g.items.length);
  }, [visible, groups]);

  // What ↑/↓ walks: rows that are actually on screen.
  const navigable = useMemo(
    () => sections.flatMap((s) => (!forceOpen && collapsed.has(s.key) ? [] : s.items)),
    [sections, collapsed, forceOpen],
  );

  useEffect(() => setActive(-1), [term, group, status]);

  /* ── keyboard ──────────────────────────────────────────────────────────
     A 43-row list is exactly the size where reaching for the mouse for every
     hop is the slow part. "/" focuses search from anywhere on the screen. */

  useEffect(() => {
    if (!shortcuts) return undefined;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;

      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (e.key === "Escape" && typing && e.target === searchRef.current) {
        if (term) clearSearch();
        else searchRef.current.blur();
        return;
      }
      if (typing && e.target !== searchRef.current) return;
      if (!navigable.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, navigable.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && active >= 0 && navigable[active]) {
        e.preventDefault();
        onOpen(navigable[active]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigable, active, onOpen, term, clearSearch, shortcuts]);

  useEffect(() => {
    if (active < 0) return;
    listRef.current
      ?.querySelector(`[data-row-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const toggleSection = (key) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allCollapsed = sections.length > 0 && sections.every((s) => collapsed.has(s.key));
  const clearFilters = () => {
    pushed.current = "";
    setTerm("");
    onFilters({ q: "", group: "all", status: "all" });
  };
  const filtering = !!term.trim() || group !== "all" || status !== "all";

  /* ── render ────────────────────────────────────────────────────────────── */

  // The console's shared loading and failure states, not local ones. Every
  // other screen in this shell uses these two, and a loader that looks
  // different on one screen reads as a different KIND of wait.
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading emails" />
      </div>
    );
  }

  if (error) return <SAErrorState message={error} onRetry={onRetry} className="rounded-2xl" />;

  let rowIndex = -1;

  return (
    <div className="lg:flex lg:items-start lg:gap-5">
      {/* ── category rail ──
          top-20 clears the 64px fixed topbar both shells share. */}
      <nav className="mb-4 lg:sticky lg:top-20 lg:mb-0 lg:w-56 lg:shrink-0">
        <p className="mb-2 hidden font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400 lg:block">
          Categories
        </p>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:max-h-[calc(100vh-7rem)] lg:flex-col lg:overflow-y-auto lg:px-0 lg:pb-0">
          <RailItem
            label="All emails"
            count={matched.length}
            selected={group === "all"}
            onClick={() => set({ group: "all" })}
          />
          {groups.map((g) => {
            const f = facets.get(g.key);
            return (
              <RailItem
                key={g.key}
                label={g.label}
                count={f?.count || 0}
                failed={f?.failed || 0}
                customised={f?.customised || 0}
                dimmed={!f}
                selected={group === g.key}
                onClick={() => set({ group: group === g.key ? "all" : g.key })}
              />
            );
          })}
        </div>
      </nav>

      {/* ── list ── */}
      <div className="min-w-0 flex-1">
        <div
          className="sticky top-16 z-20 -mx-2 mb-3 px-2 pb-3 pt-2"
          style={{ backgroundColor: "var(--tenant-bg, #fff)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search emails…"
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-16 text-sm outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85"
              />
              {term ? (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-gray-200 px-1.5 py-0.5 font-mono text-[10px] text-gray-400 sm:block dark:border-white/10">
                  /
                </kbd>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-white/10">
              {STATUS_PILLS.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => set({ status: value })}
                  className={cn(
                    "rounded-[6px] px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    status === value
                      ? "bg-accent/10 text-accent"
                      : "text-gray-500 hover:text-gray-800 dark:text-white/45 dark:hover:text-white/80",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-gray-400">
            <span>
              {visible.length} of {templates.length} emails
              {filtering && (
                <button onClick={clearFilters} className="ml-2 font-medium text-accent hover:underline">
                  Clear filters
                </button>
              )}
            </span>
            {group === "all" && sections.length > 1 && !forceOpen && (
              <button
                onClick={() =>
                  setCollapsed(allCollapsed ? new Set() : new Set(sections.map((s) => s.key)))
                }
                className="font-medium hover:text-gray-600 dark:hover:text-white/70"
              >
                {allCollapsed ? "Expand all" : "Collapse all"}
              </button>
            )}
          </div>
        </div>

        {sections.length === 0 ? (
          <div className={cn(card, "px-6 py-14 text-center")}>
            <Inbox className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-white/15" />
            <p className="text-sm text-gray-500 dark:text-white/60">No emails match that.</p>
            <p className="mt-1 text-xs text-gray-400">{emptyHint || "Try a different search or category."}</p>
            {filtering && (
              <button onClick={clearFilters} className="mt-3 text-xs font-medium text-accent hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          // One guarded handler on the container instead of one per row:
          // moving the mouse drops the keyboard highlight, and once it is gone
          // this short-circuits rather than re-rendering 43 rows per hover.
          <div
            ref={listRef}
            className="space-y-4"
            onMouseOver={() => {
              if (active !== -1) setActive(-1);
            }}
          >
            {sections.map((s) => {
              const isCollapsed = !forceOpen && collapsed.has(s.key);
              return (
                <section key={s.key}>
                  <button
                    onClick={() => !forceOpen && toggleSection(s.key)}
                    disabled={forceOpen}
                    className="mb-1.5 flex w-full items-baseline gap-1.5 text-left"
                  >
                    {!forceOpen && (
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 self-center text-gray-300 transition-transform dark:text-white/25",
                          isCollapsed && "-rotate-90",
                        )}
                      />
                    )}
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white/85">{s.label}</h3>
                    <span className="min-w-0 truncate text-[11px] text-gray-400">{s.description}</span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-gray-300 dark:text-white/25">
                      {s.items.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className={cn(card, "divide-y divide-gray-100 dark:divide-white/10")}>
                      {s.items.map((t) => {
                        rowIndex += 1;
                        return (
                          <Row
                            key={t.key}
                            t={t}
                            index={rowIndex}
                            active={rowIndex === active}
                            busy={busyKeys.has(t.key)}
                            showScope={showScope}
                            // The parent's own handlers, passed straight down.
                            // Wrapping them in `() => onOpen(t)` here would mint
                            // two new functions per row per render and defeat
                            // the memo below — Row calls them with `t` instead.
                            onToggle={onToggle}
                            onOpen={onOpen}
                          />
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}

            {navigable.length > 1 && (
              <p className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-gray-300 dark:text-white/20">
                <kbd className="rounded border border-current px-1">↑</kbd>
                <kbd className="rounded border border-current px-1">↓</kbd>
                to move
                <CornerDownLeft className="ml-1 h-3 w-3" /> to open
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function RailItem({ label, count, failed = 0, customised = 0, selected, dimmed, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors lg:w-full lg:border-0 lg:px-2.5 lg:py-1.5",
        selected
          ? "border-accent/30 bg-accent/10 font-medium text-accent"
          : cn(
              "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5",
              dimmed && "opacity-40",
            ),
      )}
    >
      <span className="truncate lg:flex-1">{label}</span>
      {failed > 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" title={`${failed} failing`} />}
      {!failed && customised > 0 && (
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", selected ? "bg-accent" : "bg-accent/40")}
          title={`${customised} customised`}
        />
      )}
      <span className={cn("shrink-0 font-mono text-[10px]", selected ? "text-accent/70" : "text-gray-400")}>
        {count}
      </span>
    </button>
  );
}

/**
 * One catalogue row.
 *
 * Memoised, and the reason is measurable: this list is 43 rows of a dozen
 * elements each, and it re-renders on things that change nothing about most of
 * them — every keystroke in the search box, every ↑/↓ press (which moves the
 * highlight on exactly two rows), every switch you flip (one row), every
 * section you collapse. Unmemoised that was ~500 elements reconciled to move a
 * highlight one row down; the arrow keys are the whole point of this list, so
 * they are the thing that has to stay cheap.
 *
 * `t` objects are stable identities filtered out of the same array, and the
 * handlers come straight from the parent, so a row only re-renders when
 * something about THAT row changed.
 */
const Row = memo(function Row({ t, index, active, busy, showScope, onToggle, onOpen }) {
  const hasActivity = t.sent30d > 0 || t.failed30d > 0;
  const open = useCallback(() => onOpen(t), [onOpen, t]);
  const toggle = useCallback(() => onToggle(t), [onToggle, t]);

  return (
    <div
      data-row-index={index}
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 transition-colors",
        active ? "bg-accent/[0.06]" : "hover:bg-gray-50/70 dark:hover:bg-white/[0.02]",
      )}
    >
      <button onClick={open} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "text-sm font-medium",
              t.enabled ? "text-gray-800 dark:text-white/85" : "text-gray-400 line-through",
            )}
          >
            {t.label}
          </span>
          {t.customised && (
            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
              Custom
            </span>
          )}
          {showScope && t.scope !== "tenant" && (
            <span
              title="Platform mail — charities never see or edit this one"
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-white/10 dark:text-white/45"
            >
              <Shield className="h-2.5 w-2.5" /> Platform only
            </span>
          )}
          {t.required && (
            <span title="Required for legal or security reasons — can't be switched off">
              <Lock className="h-3 w-3 text-gray-300 dark:text-white/25" />
            </span>
          )}
          {t.hasAttachment && (
            <span title={t.hasAttachment}>
              <Paperclip className="h-3 w-3 text-blue-400" />
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">{t.description}</p>
      </button>

      {/* Fixed width so every switch lines up, empty when there's nothing to
          report — a column of "no failures" is noise, silence is the good news. */}
      <div className="hidden w-[92px] shrink-0 text-right sm:block">
        {hasActivity && (
          <>
            <p className="font-mono text-[11px] text-gray-500 dark:text-white/55">
              {(t.sent30d || 0).toLocaleString()} sent
            </p>
            {t.failed30d > 0 && (
              <p className="font-mono text-[10px] font-medium text-red-500">{t.failed30d} failed</p>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={t.enabled}
        aria-label={`${t.label} — ${t.enabled ? "on" : "off"}`}
        disabled={t.required || busy}
        onClick={toggle}
        title={
          t.required
            ? "This email can't be switched off"
            : t.enabled
              ? "Switch off — this email will stop sending"
              : "Switch on"
        }
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          t.enabled ? "bg-accent" : "bg-gray-200 dark:bg-white/15",
          busy && "animate-pulse",
          (t.required || busy) && "cursor-not-allowed opacity-45",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            t.enabled ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>

      <button
        onClick={open}
        aria-label={`Edit ${t.label}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-300 transition-colors hover:bg-gray-100 hover:text-accent dark:text-white/20 dark:hover:bg-white/10"
      >
        <Pencil className="hidden h-3.5 w-3.5 group-hover:block" />
        <ChevronRight className="h-4 w-4 group-hover:hidden" />
      </button>
    </div>
  );
});
