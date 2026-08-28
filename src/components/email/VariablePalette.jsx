import { useMemo, useState } from "react";
import { Search, Braces, Info, ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * The clickable list of variables valid for the email being edited.
 *
 * Clicking a chip inserts {{ that.variable }} at the caret of whichever field
 * was last focused — which is the whole point: nobody should have to remember
 * or spell `subscription.nextPaymentDate`. Chips are grouped by their prefix so
 * a 30-variable email stays scannable.
 */

// `donation.amount` -> "donation". Ungrouped keys land under "General".
const groupOf = (key) => (key.includes(".") ? key.split(".")[0] : "general");

const SAMPLE_MAX = 34;
function sampleText(sample) {
  if (sample === undefined || sample === null || sample === "") return "";
  if (Array.isArray(sample)) return `${sample.length} item${sample.length === 1 ? "" : "s"}`;
  if (typeof sample === "boolean") return sample ? "yes" : "no";
  const s = String(sample);
  return s.length > SAMPLE_MAX ? `${s.slice(0, SAMPLE_MAX)}…` : s;
}

export default function VariablePalette({
  variables = [],
  onInsert,
  armed = true,
  collapsed = false,
  onToggleCollapse,
}) {
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const matched = term
      ? variables.filter(
          (v) => v.key.toLowerCase().includes(term) || String(v.label || "").toLowerCase().includes(term),
        )
      : variables;

    const map = new Map();
    for (const v of matched) {
      const g = groupOf(v.key);
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(v);
    }
    // `org` and `platform` are available everywhere and are the least
    // interesting, so they sink to the bottom of the list.
    const rank = (g) => (g === "platform" ? 3 : g === "org" ? 2 : g === "general" ? 1 : 0);
    return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
  }, [variables, q]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2">
        <Braces className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
          Variables
        </span>
        <span className="font-mono text-[10px] text-gray-300 dark:text-white/25">{variables.length}</span>
        {collapsed && (
          <span className="hidden truncate text-[10px] text-gray-400 xl:inline">
            — click to insert one at your cursor
          </span>
        )}
        {/* Collapsing hands the whole pinned column back to the preview. Only
            offered where the two share it — below xl each has its own tab. */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Show the variables" : "Collapse — give the preview the space"}
            className="ml-auto hidden h-7 w-7 place-items-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 xl:grid dark:hover:bg-white/10 dark:hover:text-white/80"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")} />
          </button>
        )}
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col", collapsed && "xl:hidden")}>
        {/* Insertion goes to the last-focused field, so before anything has
            been focused there is nowhere to put it. Saying so beats a dimmed
            list that looks broken, or a click that silently does nothing. */}
        {!armed && (
          <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] leading-snug text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
            Click into a field first — then pick a variable to drop it at your cursor.
          </p>
        )}

        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a variable…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85"
          />
        </div>

        <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
          {groups.length === 0 && (
            <p className="px-1 text-xs text-gray-400">Nothing matches “{q}”.</p>
          )}

          {/* Balanced columns rather than a grid: the groups vary a lot in
              height, and a grid leaves ragged gaps where multicol just flows.
              The column block itself is unconstrained, so the overflow stays
              vertical and the scroller above it does the scrolling. */}
          <div className="xl:columns-2 xl:gap-6 2xl:columns-3">
            {groups.map(([group, items]) => (
              <div key={group} className="mb-4 break-inside-avoid">
                <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  {group}
                </p>
                <div className="space-y-1">
                  {items.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => onInsert?.(`{{${v.key}}}`)}
                      title={`Insert {{${v.key}}}`}
                      className="group w-full rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-gray-200 hover:bg-gray-50 dark:hover:border-white/10 dark:hover:bg-white/5"
                    >
                      <span className="block truncate font-mono text-[11px] text-gray-700 dark:text-white/80">
                        {v.key}
                      </span>
                      <span className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="truncate text-[10px] text-gray-400">{v.label}</span>
                        {sampleText(v.sample) && (
                          <span className="truncate text-[10px] italic text-gray-400 dark:text-white/35">
                            {sampleText(v.sample)}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p
          title={'Hide a block when a value is missing using its "Show only if" setting.'}
          className="mt-2 flex items-center gap-1.5 truncate text-[10px] text-gray-400"
        >
          <Info className="h-3 w-3 shrink-0" />
          <span className="truncate">
            Filters: <code className="font-mono">{"{{amount | money}}"}</code>{" · "}
            <code className="font-mono">{"{{date | day}}"}</code>{" · "}
            <code className="font-mono">{'{{name | default:"there"}}'}</code>
          </span>
        </p>
      </div>
    </div>
  );
}
