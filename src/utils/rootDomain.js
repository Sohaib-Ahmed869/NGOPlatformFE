/**
 * Where tenant portals live: `<slug>.<rootDomain>`.
 *
 * VITE_ROOT_DOMAIN is the explicit override, but it is easy to forget (an unset
 * value used to produce links to `slug.undefined`), so the default is derived
 * from the host actually being served:
 *
 *   localhost:5173        → localhost:5173        → acme.localhost:5173
 *   www.charities.ltd     → charities.ltd         → acme.charities.ltd
 *   charities.ltd         → charities.ltd         → acme.charities.ltd
 *   acme.charities.ltd    → charities.ltd         (an existing tenant host still
 *                                                  resolves the shared root)
 *
 * Browsers resolve *.localhost to the loopback address, so subdomain links work
 * in local development with no hosts-file entry.
 */

/** The shared root domain (may include a :port in development). */
export function rootDomain() {
  const configured = import.meta.env.VITE_ROOT_DOMAIN;
  if (configured && configured !== "undefined") return String(configured).replace(/^\.+|\.+$/g, "");

  const { host } = window.location; // hostname + :port
  const [hostname, port] = host.split(":");

  // Loopback / bare host — use as-is (subdomains of localhost are valid).
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || !hostname.includes(".")) {
    return host;
  }

  const labels = hostname.split(".");
  // Keep the registrable domain: last two labels, or three for a two-part public
  // suffix such as .co.uk / .org.uk / .com.au.
  const twoPartSuffix = labels.length >= 3 && /^(co|com|org|net|gov|ac|edu)$/.test(labels[labels.length - 2]);
  const keep = twoPartSuffix ? 3 : 2;
  const base = labels.slice(-Math.min(keep, labels.length)).join(".");
  return port ? `${base}:${port}` : base;
}

/** Absolute origin of a tenant portal, matching the current page's protocol. */
export function tenantOrigin(slug) {
  const scheme = window.location.protocol === "https:" ? "https" : "http";
  return `${scheme}://${slug}.${rootDomain()}`;
}
