import { memo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * The console's table header row, with sorting.
 *
 * Every table here already rendered its headers the same way — a list of
 * labels mapped to identically-classed `<th>`s — so they become one component
 * rather than seven copies that drift. A column is sortable when it has a
 * `key`; ones without (Actions, spacers, derived columns with nothing behind
 * them) render as plain labels, which is how you can tell at a glance what can
 * be sorted and what can't.
 *
 * ── Direction ──────────────────────────────────────────────────────────────
 * Clicking a NEW column sorts it in the direction that column is actually
 * useful in, not blindly ascending: "Created" opens newest-first, "Name" opens
 * A–Z. A table that answers "what happened recently" by showing you the oldest
 * row first is technically sorted and practically useless. Clicking the column
 * you're already on flips it.
 *
 * Columns are declared as:
 *   { label, key?, defaultDir?, align?, className?, title? }
 *
 * `aria-sort` is on the cell rather than the button because that's the
 * property screen readers announce for a column, and the button is only the
 * control that changes it.
 */

// `whitespace-nowrap` because a wrapped header is never what anyone wanted:
// these labels are one or two short words, and letting "Last login" break in
// half makes the header row taller than the data and ragged against its
// neighbours. Tables here already scroll horizontally when they must.
const TH_BASE =
  "whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-white/60";

function SATableHead({ columns, sort, onSort, className, rowStyle, rowClassName }) {
  const activeKey = sort?.key || null;
  const activeDir = sort?.dir === "asc" ? "asc" : "desc";

  return (
    <thead className={className}>
      <tr
        className={cn("border-b border-gray-100 text-left dark:border-white/10", rowClassName)}
        style={rowStyle}
      >
        {columns.map((c, i) => {
          const col = typeof c === "string" ? { label: c } : c;
          const sortable = !!col.key && typeof onSort === "function";
          const active = sortable && col.key === activeKey;
          const alignCls =
            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "";

          return (
            <th
              key={col.key || col.label || `col-${i}`}
              scope="col"
              aria-sort={active ? (activeDir === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined}
              className={cn(TH_BASE, alignCls, col.className)}
            >
              {sortable ? (
                <button
                  type="button"
                  onClick={() =>
                    onSort({
                      key: col.key,
                      // Same column → flip. New column → whatever reads right
                      // for that kind of data.
                      dir: active ? (activeDir === "asc" ? "desc" : "asc") : col.defaultDir || "asc",
                    })
                  }
                  title={col.title || `Sort by ${col.label}`}
                  className={cn(
                    "group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase tracking-wider transition-colors",
                    col.align === "right" && "flex-row-reverse",
                    active ? "text-accent" : "hover:text-gray-700 dark:hover:text-white/85",
                  )}
                >
                  {col.label}
                  {active ? (
                    activeDir === "asc" ? (
                      <ChevronUp className="h-3 w-3 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    )
                  ) : (
                    // Present but nearly invisible until hover: the affordance
                    // has to exist without turning the header into a row of
                    // arrows competing with the labels.
                    <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-40" />
                  )}
                </button>
              ) : (
                col.label
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

export default memo(SATableHead);
