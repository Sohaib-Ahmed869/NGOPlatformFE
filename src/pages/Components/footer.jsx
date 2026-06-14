import { Mail, Phone, MapPin, HeartHandshake, ArrowRight, ArrowUpRight } from "lucide-react";
import { FaFacebookF, FaInstagram, FaXTwitter, FaLinkedinIn, FaWhatsapp } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTenant } from "../../context/TenantContext";
import { SOCIAL_META, socialHref } from "../../config/socialIcons";

// Real brand icon components (replaces the old inline SVG paths).
const SOCIAL_ICONS = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  twitter: FaXTwitter,
  linkedin: FaLinkedinIn,
  whatsapp: FaWhatsapp,
};

const Footer = () => {
  const { organisation, branding, pages, isPathEnabled } = useTenant();
  const reduce = useReducedMotion();

  const orgName = organisation?.name || "";
  const year = new Date().getFullYear();

  // Description is the tenant's own tagline (dynamic), with a graceful default.
  const description =
    branding?.tagline?.trim() ||
    `Supporting our community through the generosity of people like you — every contribution makes a difference.`;

  // Only the socials the org has actually filled in.
  const socials = organisation?.socialLinks || {};
  const socialList = SOCIAL_META
    .map((m) => ({ key: m.key, label: m.label, href: socialHref(m.key, socials[m.key]) }))
    .filter((s) => s.href);

  // Footer nav is derived from the tenant's real enabled top-level pages —
  // never hardcoded, so it always matches the site's actual navigation.
  const navLinks = (pages || [])
    .filter((p) => p.enabled !== false && p.showInNav !== false && !p.navParentKey)
    .sort((a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0))
    .map((p) => ({ to: p.path, label: p.navLabel || p.key }))
    .filter((l) => l.to);

  // Structured address → formatted lines, falling back to the legacy single line.
  const ad = organisation?.addressDetails || {};
  const cityLine = [[ad.city, ad.state].filter(Boolean).join(", "), ad.postalCode].filter(Boolean).join(" ").trim();
  const structuredLines = [ad.line1, ad.line2, cityLine, ad.country].map((x) => (x || "").trim()).filter(Boolean);
  const addressLines = structuredLines.length ? structuredLines : organisation?.address ? [organisation.address] : [];

  const showDonate = isPathEnabled("/donate");

  const reveal = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
  });

  return (
    <footer className="relative overflow-hidden text-white">
      {/* Dynamic dark background — derived from the tenant's theme colours */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, var(--tenant-sidebar-top, #2C2418) 0%, var(--tenant-sidebar-bottom, #1F1A12) 100%)` }}
      />
      {/* Soft accent glows on the edges */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-accent/[0.07] blur-3xl" />
      {/* Accent hairline along the very top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      {/* Faint subtle dot texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px", color: "#fff" }}
      />
      {/* Faint brand wordmark — runs vertically along the right edge */}
      {orgName && (
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden select-none items-center pr-2 xl:flex 2xl:pr-6">
          <span
            className="font-heading text-[6rem] font-bold uppercase leading-none tracking-tight text-white/[0.05] 2xl:text-[8rem]"
            style={{ writingMode: "vertical-rl" }}
          >
            {orgName}
          </span>
        </div>
      )}

      <div className="relative mx-auto w-full max-w-screen-2xl px-6 pt-12 pb-6 sm:pt-16 sm:pb-8 lg:px-10 xl:px-16">
        {/* Top CTA bar — only when donations are enabled */}
        {showDonate && (
          <motion.div
            {...reveal()}
            className="mb-10 flex flex-col items-center justify-between gap-6 border-b border-white/10 pb-10 md:mb-14 md:flex-row md:pb-12"
          >
            <div className="text-center md:text-left">
              <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                <HeartHandshake className="h-3.5 w-3.5" /> Get involved
              </span>
              <h3 className="font-heading text-2xl font-bold text-white md:text-3xl">Ready to make a difference?</h3>
              <p className="mt-2 font-body text-sm text-white/50">Your contribution can change lives. Start today.</p>
            </div>
            <Link
              to="/donate"
              className="group inline-flex w-full items-center justify-center gap-2 bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-light hover:shadow-[0_0_30px_rgba(var(--tenant-accent-rgb,201,168,76),0.3)] sm:w-auto"
            >
              Donate Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        )}

        {/* Columns — Brand / Explore / Contact, balanced across the full width */}
        <motion.div {...reveal(0.05)} className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-5">
            {organisation && (
              <div className="mb-4 flex items-center gap-2.5">
                {branding?.logo || branding?.logoDark ? (
                  <img
                    src={branding.logo || branding.logoDark}
                    alt={orgName}
                    className="-ml-1 block h-10 w-auto max-w-[190px] object-contain object-left"
                  />
                ) : (
                  <>
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded text-white"
                      style={{ backgroundColor: branding?.accentColor || "#C9A84C" }}
                    >
                      <HeartHandshake className="h-[18px] w-[18px]" />
                    </span>
                    <span className="font-heading text-lg font-bold text-white">{orgName}</span>
                  </>
                )}
              </div>
            )}
            <p className="mb-6 max-w-md text-sm leading-relaxed text-white/60">{description}</p>
            {socialList.length > 0 && (
              <div>
                <p className="mb-3 font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Follow us</p>
                <div className="flex flex-wrap items-center gap-2.5">
                  {socialList.map((s) => {
                    const Icon = SOCIAL_ICONS[s.key];
                    return (
                      <a
                        key={s.key}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        className="flex h-10 w-10 items-center justify-center border border-white/15 text-white/60 transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-white"
                      >
                        {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Explore — single-column nav with hover arrow */}
          {navLinks.length > 0 && (
            <nav className="lg:col-span-3">
              <h4 className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.2em] text-accent">Explore</h4>
              <ul className="space-y-0">
                {navLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="group flex items-center justify-between py-1.5 font-body text-sm text-white/60 transition-colors hover:text-accent"
                    >
                      <span className="transition-transform duration-300 group-hover:translate-x-1">{link.label}</span>
                      <ArrowUpRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Contact */}
          <div className="lg:col-span-4">
            <h4 className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.2em] text-accent">Contact</h4>
            <ul className="space-y-4">
              {organisation?.contactEmail && (
                <li>
                  <a href={`mailto:${organisation.contactEmail}`} className="group flex items-center gap-3 font-body text-sm">
                    <span className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 text-accent transition-all group-hover:border-accent group-hover:bg-accent/10">
                      <Mail className="h-4 w-4" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-white/30">Email us</span>
                      <span className="break-all text-white/60 transition-colors group-hover:text-accent">{organisation.contactEmail}</span>
                    </span>
                  </a>
                </li>
              )}
              {organisation?.contactPhone && (
                <li>
                  <a href={`tel:${organisation.contactPhone}`} className="group flex items-center gap-3 font-body text-sm">
                    <span className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 text-accent transition-all group-hover:border-accent group-hover:bg-accent/10">
                      <Phone className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-white/30">Call us</span>
                      <span className="text-white/60 transition-colors group-hover:text-accent">{organisation.contactPhone}</span>
                    </span>
                  </a>
                </li>
              )}
              {addressLines.length > 0 && (
                <li className="flex items-start gap-3 font-body text-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 text-accent">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-white/30">Visit us</span>
                    <span className="text-white/60">
                      {addressLines.map((line, i) => (
                        <span key={i} className="block leading-snug">
                          {line}
                        </span>
                      ))}
                    </span>
                  </span>
                </li>
              )}
            </ul>
          </div>
        </motion.div>

        {/* Copyright — closing line */}
        <div className="mt-8">
          <p className="text-center font-body text-xs tracking-wide text-white/30 sm:text-left">
            &copy; {year} {orgName || "All rights reserved"}{orgName ? ". All rights reserved." : ""}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
