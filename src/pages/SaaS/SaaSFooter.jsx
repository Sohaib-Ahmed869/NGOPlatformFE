import React from "react";
import { Link } from "react-router-dom";
import { HeartHandshake, ArrowRight, Mail, MapPin, Phone, Facebook, Instagram, Twitter, Linkedin } from "lucide-react";
import { useTenant } from "../../context/TenantContext";

const productLinks = [
  { label: "Features", to: "/#features" },
  { label: "How it works", to: "/#how" },
  { label: "Pricing", to: "/plans" },
  { label: "Get started", to: "/register" },
];
const supportLinks = [
  { label: "Contact us", to: "/contact" },
  { label: "Sign in", to: "/login" },
];

/* Mirrors the tenant public footer: a dark gradient derived from the brand
   (--tenant-sidebar-top → bottom), accent uppercase section headers, white/55
   links with an accent hover arrow, and accent-framed contact tiles. Logo, name,
   description, contact details and socials are dynamic (SuperAdmin → Platform). */
export default function SaaSFooter() {
  const { platform } = useTenant();
  const name = platform?.name || "NGO Platform";
  const logo = platform?.logo || platform?.logoDark || ""; // light logo for the dark footer
  const description =
    platform?.description ||
    "The warm, all-in-one platform that helps charities raise funds, welcome donors and run campaigns — with their own branded portal.";
  const email = platform?.contactEmail || "support@ngoplatform.com";
  const phone = platform?.contactPhone || "";
  const address = platform?.address || "";
  const social = [
    { key: "facebook", href: platform?.socialLinks?.facebook, icon: Facebook },
    { key: "instagram", href: platform?.socialLinks?.instagram, icon: Instagram },
    { key: "twitter", href: platform?.socialLinks?.twitter, icon: Twitter },
    { key: "linkedin", href: platform?.socialLinks?.linkedin, icon: Linkedin },
  ].filter((s) => s.href);

  return (
    <footer
      className="relative z-10 overflow-hidden font-body text-white"
      style={{
        background:
          "linear-gradient(180deg, var(--tenant-sidebar-top, #0D241E) 0%, var(--tenant-sidebar-bottom, #081712) 100%)",
      }}
    >
      {/* Hairline accent top edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      {/* Soft accent glows */}
      <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-accent/[0.07] blur-3xl" />

      <div className="relative mx-auto max-w-[1280px] px-8 pb-10 pt-16">
        <div className="grid grid-cols-1 gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
          {/* Brand */}
          <div>
            {logo ? (
              <img src={logo} alt={name} className="h-10 w-auto max-w-[200px] object-contain" />
            ) : (
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-10 w-10 place-items-center rounded-token-btn text-white"
                  style={{ background: "linear-gradient(135deg, var(--tenant-accent), var(--pf-accent-2, #065F46))" }}
                >
                  <HeartHandshake className="h-5 w-5" />
                </span>
                <span className="text-[17px] font-extrabold tracking-tight text-white">{name}</span>
              </div>
            )}
            <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-white/55">{description}</p>
            <Link
              to="/register"
              className="mt-6 inline-flex items-center gap-2 rounded-token-btn bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
            >
              Start your portal <ArrowRight className="h-4 w-4" />
            </Link>

            {social.length > 0 && (
              <div className="mt-6 flex gap-2.5">
                {social.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-10 w-10 place-items-center rounded-token-btn border border-white/15 text-white/60 transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-white"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Platform */}
          <div>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Platform</h4>
            <div className="space-y-1">
              {productLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  className="group flex items-center justify-between py-1.5 text-sm text-white/55 transition-colors hover:text-accent"
                >
                  {l.label}
                  <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Support</h4>
            <div className="space-y-1">
              {supportLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  className="group flex items-center justify-between py-1.5 text-sm text-white/55 transition-colors hover:text-accent"
                >
                  {l.label}
                  <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Get in touch</h4>
            <div className="space-y-3">
              <a
                href={`mailto:${email}`}
                className="group flex items-center gap-3 text-sm text-white/55 transition-colors hover:text-white"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-token-btn border border-white/10 text-accent transition-all group-hover:border-accent group-hover:bg-accent/10">
                  <Mail className="h-4 w-4" />
                </span>
                {email}
              </a>
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="group flex items-center gap-3 text-sm text-white/55 transition-colors hover:text-white"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-token-btn border border-white/10 text-accent transition-all group-hover:border-accent group-hover:bg-accent/10">
                    <Phone className="h-4 w-4" />
                  </span>
                  {phone}
                </a>
              ) : null}
              {address ? (
                <div className="flex items-center gap-3 text-sm text-white/55">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-token-btn border border-white/10 text-accent">
                    <MapPin className="h-4 w-4" />
                  </span>
                  {address}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row">
          <div>&copy; {new Date().getFullYear()} {name} &middot; Made with care for charities</div>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-accent">Privacy</a>
            <a href="#" className="transition-colors hover:text-accent">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
