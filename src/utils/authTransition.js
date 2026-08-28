/**
 * Leaving the SuperAdmin console for its sign-in page.
 *
 * Signing out has to be a HARD navigation, not a client-side route change:
 * about twenty services in src/services keep module-level `_cache` variables
 * that a React Router transition leaves untouched, so the next operator to
 * sign in on the same page load can be served the previous one's data. Only a
 * document reload is guaranteed to drop all of them.
 *
 * The cost of that guarantee is the flash — the browser paints its own canvas
 * between unload and the next page's first paint, and that canvas is white.
 * Coming out of a dark console into a dark sign-in page through a frame of
 * white is what reads as "not smooth". So the reload stays, and the two edges
 * of it get covered:
 *
 *   1. On the way out, a veil fades the console to the ground colour and the
 *      document's own background is set to the same, so the unload paint is
 *      already that colour.
 *   2. On the way in, a pre-paint snippet in index.html sets the same colour
 *      before the bundle has even parsed, so the arriving page never shows
 *      white either.
 *
 * The two ends have to agree on the colour, which is why it lives here rather
 * than in the chrome that draws it — index.html cannot import from a module,
 * so this file is the source and PlatformAuthChrome reads from it.
 */

export const GROUND_TOP = "#0a1512";
export const GROUND_BOTTOM = "#060b09";
export const GROUND_GRADIENT = `linear-gradient(180deg,${GROUND_TOP},${GROUND_BOTTOM})`;

/**
 * Are we currently on one of the console's dark pre-auth pages?
 *
 * The console runs on the `admin.` subdomain and everything inside it is a
 * light theme; only these three routes paint the dark ground. `/login` on a
 * TENANT subdomain is a light page, which is why the host has to be part of
 * the test and the path alone is not enough.
 *
 * index.html carries a hand-copied version of this predicate -- it runs before
 * any module has parsed, so it cannot import. Change one, change the other.
 */
export function onAuthGround() {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname.split(".")[0] === "admin" &&
    /^\/(login|forgot-password|accept-invite)/.test(window.location.pathname)
  );
}

const FADE_MS = 200;

/**
 * Fade the current page down to the auth ground, then reload into `path`.
 * Returns immediately; the navigation happens when the fade completes.
 */
export function leaveToAuth(path = "/login") {
  const go = () => window.location.assign(path);

  if (typeof document === "undefined") return go();

  // Set on the document itself, not just the veil: this is the colour the
  // browser holds on screen while the next document is being fetched.
  document.documentElement.style.background = GROUND_GRADIENT;
  if (document.body) document.body.style.background = GROUND_GRADIENT;

  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !document.body) return go();

  const veil = document.createElement("div");
  veil.setAttribute("aria-hidden", "true");
  // `pointer-events:all` is load-bearing: it swallows a second click on the
  // logout button while the fade is running, which would otherwise queue a
  // second navigation.
  veil.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "opacity:0",
    `background:${GROUND_GRADIENT}`,
    `transition:opacity ${FADE_MS}ms ease`,
    "pointer-events:all",
  ].join(";");
  document.body.appendChild(veil);

  // Two frames, not one: the element has to be laid out with opacity 0 before
  // the change to 1 counts as a transition rather than an initial value.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      veil.style.opacity = "1";
    });
  });

  window.setTimeout(go, FADE_MS + 40);
}
