import { memo } from "react";
import SASelect from "./SASelect";
import { PAGE_SIZE_OPTIONS } from "../utils/paging";
import { cn } from "../../utils/cn";

/**
 * The console's list footer: what you're looking at, how many rows per page,
 * and the way to the next one.
 *
 * This existed five times over in slightly different shapes — different
 * wording, different page-size options, some with a rows control and some
 * without, one that hid the count when there was only a single page. The count
 * is the part worth being careful about: "1–25 of 240" and "1–9 of 9" are
 * answers to different questions, and the second one only gets asked because
 * the first one is always shown. Hiding it on a single page is exactly when
 * the operator most wants to know they're seeing everything.
 *
 * `onPrefetch` is optional and fires on hover/focus of a pager button, so a
 * screen that caches pages can have the next one ready before the click lands.
 */

function SAPagination({
  page,
  pages,
  total,
  limit,
  // How many rows are actually on screen. Differs from `limit` on the last
  // page, and the range has to say 231–240, not 231–255.
  shown,
  onPage,
  onLimit,
  onPrefetch,
  disabled = false,
  sizes = PAGE_SIZE_OPTIONS,
  className,
}) {
  const safePages = Math.max(1, pages || 1);
  const count = typeof shown === "number" ? shown : 0;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = (page - 1) * limit + count;

  if (!total) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-1",
        className,
      )}
    >
      <span className="font-mono text-xs text-gray-400">
        {from}–{to} of {total.toLocaleString()}
        {safePages > 1 ? ` · page ${page} of ${safePages}` : ""}
      </span>

      <div className="flex items-center gap-3">
        {onLimit && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="hidden sm:inline">Rows</span>
            {/* The console's dropdown, not a native <select>: that one draws
                the OS menu, which ignores the theme. */}
            <SASelect
              value={limit}
              onChange={(v) => onLimit(Number(v))}
              options={sizes}
              align="right"
              className="!min-w-0 w-[68px] !px-2 !py-1 !text-xs"
            />
          </span>
        )}

        {safePages > 1 && (
          <div className="flex gap-2">
            <PageBtn
              disabled={disabled || page <= 1}
              onClick={() => onPage(page - 1)}
              onPrefetch={() => onPrefetch?.(page - 1)}
            >
              Previous
            </PageBtn>
            <PageBtn
              disabled={disabled || page >= safePages}
              onClick={() => onPage(page + 1)}
              onPrefetch={() => onPrefetch?.(page + 1)}
            >
              Next
            </PageBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function PageBtn({ children, disabled, onClick, onPrefetch }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={disabled ? undefined : onPrefetch}
      onFocus={disabled ? undefined : onPrefetch}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:bg-transparent dark:text-white/75 dark:hover:bg-white/5"
    >
      {children}
    </button>
  );
}

export default memo(SAPagination);
