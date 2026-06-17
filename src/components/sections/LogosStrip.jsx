import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { reveal } from "../giving";
import partnersService from "../../services/partners.service";

/**
 * Cache the public-partners fetch for the page load so multiple logo strips
 * (e.g. one on Home and one on Our Partners) share a single request. A fresh
 * full page load refetches, so newly published partners appear without a hard
 * refresh of this module.
 */
let _publicPartnersPromise = null;
function fetchPublicPartners() {
  if (!_publicPartnersPromise) {
    _publicPartnersPromise = partnersService
      .publicList()
      .then((res) => (Array.isArray(res?.items) ? res.items : []))
      .catch(() => []);
  }
  return _publicPartnersPromise;
}

const key = (l) => (l?.name || "").trim().toLowerCase();

/* Each partner tile is a link when it has a website, else a plain card. */
function Tile({ website, className, children }) {
  if (website) {
    return (
      <a href={website} target="_blank" rel="noreferrer noopener" className={className}>
        {children}
      </a>
    );
  }
  return <div className={className}>{children}</div>;
}

/* Partner wall — each logo normalised inside a clean card (uniform size, name
 * caption, hover lift), so disparate user-uploaded logos look tidy and premium.
 *
 * `source` (manual | approved | both) decides where the logos come from:
 *  - manual   → just the hand-curated `items` list
 *  - approved → partners approved + published via the "Become a partner" form
 *               (falls back to the manual list if none are published yet)
 *  - both     → curated logos first, then approved partners (de-duped by name)
 */
export default function LogosStripSection({ eyebrow, heading, items, source = "manual" }) {
  const manual = Array.isArray(items) ? items.filter((l) => l && l.logo) : [];
  const wantsDynamic = source === "approved" || source === "both";
  const [dynamic, setDynamic] = useState([]);

  useEffect(() => {
    let alive = true;
    if (wantsDynamic) {
      fetchPublicPartners().then((list) => {
        if (alive) {
          setDynamic(
            list.map((p) => ({ logo: p.logo, name: p.name, website: p.website })).filter((l) => l.logo),
          );
        }
      });
    }
    return () => {
      alive = false;
    };
  }, [wantsDynamic]);

  let logos = manual;
  if (source === "approved") {
    logos = dynamic.length ? dynamic : manual; // fall back so the section never collapses
  } else if (source === "both") {
    const seen = new Set(manual.map(key).filter(Boolean));
    const extra = dynamic.filter((l) => {
      const k = key(l);
      if (k && seen.has(k)) return false;
      if (k) seen.add(k);
      return true;
    });
    logos = [...manual, ...extra];
  }

  if (!logos.length) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50/60 px-6 py-16 lg:py-24">
      {/* soft decorative washes */}
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        {(eyebrow || heading) && (
          <motion.div {...reveal()} className="mb-10 text-center lg:mb-12">
            {eyebrow && (
              <span className="inline-flex items-center gap-1.5 rounded-token bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                {eyebrow}
              </span>
            )}
            {heading && <h2 className="mt-3 font-heading text-2xl font-bold text-primary md:text-3xl">{heading}</h2>}
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {logos.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, ease: "easeOut", delay: (i % 4) * 0.06 }}
            >
              <Tile
                website={l.website}
                className="group relative flex h-full flex-col rounded-token border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/30 hover:shadow-xl hover:shadow-black/5"
              >
                {l.website && (
                  <ExternalLink className="absolute right-3 top-3 z-10 h-3.5 w-3.5 text-gray-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                )}

                {/* Framed logo plate — gives small/disparate logos a tidy, uniform home */}
                <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-token bg-gray-50/80 p-4 ring-1 ring-inset ring-gray-100 transition-all duration-300 group-hover:bg-accent/[0.04] group-hover:ring-accent/20">
                  <img
                    src={l.logo}
                    alt={l.name || "Partner logo"}
                    loading="lazy"
                    className="max-h-20 w-auto max-w-[85%] object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>

                {/* Name */}
                {l.name && (
                  <div className="mt-3.5 flex flex-1 items-center justify-center px-1 text-center">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-primary transition-colors duration-300 group-hover:text-accent">
                      {l.name}
                    </p>
                  </div>
                )}
              </Tile>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
