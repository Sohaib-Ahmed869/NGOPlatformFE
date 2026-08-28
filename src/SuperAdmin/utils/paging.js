/**
 * Page sizes offered across the console's list screens.
 *
 * These live apart from <SAPagination> because a module that exports both a
 * component and plain constants loses fast refresh — editing the component
 * then does a full reload and drops the screen's state, which on a filtered,
 * paged table is exactly the state you were in the middle of using.
 *
 * 10 is here for narrow screens and for demos; 100 is the practical ceiling
 * for a table you scan by eye, and every server list caps well above it.
 */
export const PAGE_SIZES = [10, 25, 50, 100];
export const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((n) => ({ value: n, label: String(n) }));
export const DEFAULT_PAGE_SIZE = 25;

/** Clamp a stored/URL page size back onto the offered set. */
export const normalisePageSize = (value, fallback = DEFAULT_PAGE_SIZE) =>
  PAGE_SIZES.includes(Number(value)) ? Number(value) : fallback;
