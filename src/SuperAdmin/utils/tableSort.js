import { useMemo } from "react";

/**
 * Client-side sorting for tables that already hold every row.
 *
 * Server-paged screens must sort on the server — sorting the 25 rows you were
 * handed reorders a page, which looks like sorting and isn't: the largest value
 * in the table may well be on page 4. This is only for lists loaded whole (the
 * operator team, which is a handful of people).
 *
 * Three rules the naive comparator gets wrong:
 *
 *   Blanks sink. A missing value is not "before A" or "after Z", it's absent.
 *   Sorting by "Last seen" descending should not open with a column of
 *   never-signed-in operators just because `undefined` happens to compare low.
 *   Empties go last in BOTH directions.
 *
 *   Text compares like text. `"Zoe" < "alice"` is true by code point, so a
 *   plain `<` puts every capitalised name above every lowercase one.
 *   localeCompare with numeric collation also means "Item 10" follows
 *   "Item 9" rather than "Item 1".
 *
 *   Ties keep their order. Array.prototype.sort is stable, so rows that match
 *   on the sorted column stay in whatever order the previous sort left them —
 *   which makes a second sort feel like a refinement rather than a reshuffle.
 */

export const isBlank = (v) => v === null || v === undefined || v === "";

/**
 * Compares two PRESENT values. Blanks are handled by the caller, above the
 * direction flip — see `sortRows`. Kept total anyway so a stray blank can't
 * throw.
 */
export function compareValues(a, b) {
  if (isBlank(a) && isBlank(b)) return 0;
  if (isBlank(a)) return 1;
  if (isBlank(b)) return -1;

  if (a instanceof Date || b instanceof Date) {
    return new Date(a).getTime() - new Date(b).getTime();
  }
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" || typeof b === "boolean") return (a ? 1 : 0) - (b ? 1 : 0);

  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}

/**
 * The sort itself, as a plain function — no React, so it can be exercised
 * directly rather than only through a component.
 *
 * @param rows       the full array
 * @param sort       { key, dir } — `key` must exist in `accessors` or rows pass through
 * @param accessors  { columnKey: (row) => comparable }
 */
export function sortRows(rows, sort, accessors) {
  const get = sort?.key ? accessors?.[sort.key] : null;
  if (!get || !Array.isArray(rows) || rows.length < 2) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;

  // Copy: sorting in place would mutate the caller's (often cached) array.
  return [...rows].sort((rowA, rowB) => {
    const a = get(rowA);
    const b = get(rowB);
    // Blanks are settled BEFORE the direction flip, deliberately. Folding them
    // into the comparison and then multiplying by `dir` sends them to whichever
    // end the flip happens to put them — so "Last login, newest first" opened
    // with every operator who has never signed in. Absent is absent in both
    // directions, and it belongs at the bottom either way.
    const aBlank = isBlank(a);
    const bBlank = isBlank(b);
    if (aBlank || bBlank) return aBlank && bBlank ? 0 : aBlank ? 1 : -1;

    return compareValues(a, b) * dir;
  });
}

/**
 * `sortRows`, memoised on the things that can actually change its result.
 *
 * Destructured deliberately: callers often rebuild the `{key, dir}` object on
 * every render, and depending on that identity would re-sort the whole list
 * each time even though the order can't have changed.
 */
export function useTableSort(rows, sort, accessors) {
  const key = sort?.key;
  const dir = sort?.dir;
  return useMemo(() => sortRows(rows, { key, dir }, accessors), [rows, key, dir, accessors]);
}

export default useTableSort;
