import { Mail, Phone, MapPin, HeartHandshake } from "lucide-react";
import { Link } from "react-router-dom";
import { useTenant } from "../../context/TenantContext";

const Footer = () => {
  const { organisation, branding } = useTenant();
  return (
    <footer className="relative overflow-hidden">
      {/* Warm dark background — uses tenant sidebar colors */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, var(--tenant-sidebar-top, #4A3F30) 0%, var(--tenant-sidebar-bottom, #3D3226) 100%)` }} />
      {/* Subtle golden sheen */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent/[0.02] via-transparent to-accent/[0.02] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-10">
        {/* Top CTA bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-14 mb-14 border-b border-accent/10">
          <div>
            <h3 className="font-heading text-2xl md:text-3xl font-bold text-[#F5EDE0] mb-2">
              Ready to make a difference?
            </h3>
            <p className="text-[#EDE4D3]/40 font-body text-sm">
              Your contribution can change lives. Start today.
            </p>
          </div>
          <Link
            to="/donate"
            className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-accent to-accent-light text-primary font-semibold rounded-full px-8 py-3.5 overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(201,168,76,0.25)]"
          >
            <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <span className="relative">Donate Now</span>
            <svg className="w-4 h-4 relative group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </Link>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* About */}
          <div className="lg:col-span-1">
            {/* Org logo + name */}
            {organisation && (
              <div className="flex items-center gap-2.5 mb-4">
                {branding?.logo ? (
                  <img src={branding.logo} alt={organisation.name} className="h-8 w-8 object-contain rounded" />
                ) : (
                  <div className="w-8 h-8 rounded flex items-center justify-center text-white" style={{ backgroundColor: branding?.accentColor || "#C9A84C" }}>
                    <HeartHandshake className="w-[18px] h-[18px]" />
                  </div>
                )}
                <span className="text-[#F5EDE0] font-heading font-bold text-lg">{organisation.name}</span>
              </div>
            )}
            <p className="text-[#EDE4D3]/50 text-sm leading-relaxed mb-6">
              {branding?.tagline || "Empowering communities worldwide through education, healthcare, food security, and emergency relief. Every donation makes a difference."}
            </p>
            <div className="flex items-center gap-3">
              {[
                { label: "Twitter", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z", href: "#" },
                { label: "Facebook", icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z", href: "#" },
                { label: "Instagram", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z", href: "#" },
                { label: "LinkedIn", icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z", href: "#" },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="w-9 h-9 rounded-full border border-accent/15 flex items-center justify-center text-[#EDE4D3]/40 hover:text-accent hover:border-accent/40 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={s.icon}/></svg>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-body font-semibold text-accent tracking-[0.2em] uppercase mb-5">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { to: "/", label: "Home" },
                { to: "/about", label: "About Us" },
                { to: "/events", label: "Events" },
                { to: "/donate", label: "Donate" },
                { to: "/login", label: "Login" },
              ].map((link) => (
                <li key={link.to}><Link to={link.to} className="text-[#EDE4D3]/40 hover:text-accent transition-colors text-sm font-body">{link.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Our Work */}
          <div>
            <h4 className="text-xs font-body font-semibold text-accent tracking-[0.2em] uppercase mb-5">Our Work</h4>
            <ul className="space-y-3">
              {[
                { to: "/initiative-1", label: "Education" },
                { to: "/initiative-3", label: "Food Security" },
                { to: "/initiative-2", label: "Clean Water" },
                { to: "/initiative-4", label: "Emergency Relief" },
                { to: "/giving", label: "Islamic Giving" },
              ].map((link) => (
                <li key={link.to}><Link to={link.to} className="text-[#EDE4D3]/40 hover:text-accent transition-colors text-sm font-body">{link.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-body font-semibold text-accent tracking-[0.2em] uppercase mb-5">Contact</h4>
            <ul className="space-y-4">
              <li>
                <a href="mailto:info@hopegive.org" className="flex items-start gap-3 text-[#EDE4D3]/40 hover:text-accent transition-colors text-sm font-body">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  info@hopegive.org
                </a>
              </li>
              <li>
                <a href="tel:+18004673448" className="flex items-start gap-3 text-[#EDE4D3]/40 hover:text-accent transition-colors text-sm font-body">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  1-800-HOPEGIVE
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3 text-[#EDE4D3]/40 text-sm font-body">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>123 Charity Lane<br />Sydney, NSW 2000<br />Australia</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-accent/8 mt-14 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#EDE4D3]/25 text-xs font-body tracking-wide">
            &copy; 2025 All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-[#EDE4D3]/25 text-xs font-body">
            <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
