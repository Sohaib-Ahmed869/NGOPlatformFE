/**
 * Bring the top of a list back into view after paging.
 *
 * Clicking "Next" at the bottom of a long page otherwise leaves you at the
 * bottom of the NEXT page, reading its last rows first.
 *
 * Not `scrollIntoView`: the console's topbar is fixed, so aligning an element
 * to y=0 tucks its first rows underneath it. And it honours the OS
 * reduced-motion setting — a long smooth scroll is one of the motions people
 * turn that off for.
 */
const TOPBAR_OFFSET = 88; // 4rem topbar + breathing room

export function scrollToTopOf(el) {
  if (!el || typeof window === "undefined") return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - TOPBAR_OFFSET);
  // Already near the top (a short page) — don't animate a scroll to nowhere.
  if (Math.abs(top - window.scrollY) < 8) return;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}

export default scrollToTopOf;
