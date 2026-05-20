import React from "react";
import { Link } from "react-router-dom";

const V = {
  bg: "#F7F4FB", surface: "#FFFFFF", surface2: "#F2EDF8",
  line: "rgba(28,15,55,.08)", ink: "#1A0D2E", inkSoft: "#5B4A7A", inkFaint: "#9D90B5",
  primary: "#7C3AED", primary2: "#6D28D9",
};

const font = "'Space Grotesk', system-ui, sans-serif";
const mono = "'JetBrains Mono', monospace";

export default function SaaSFooter() {
  return (
    <footer className="relative z-10" style={{ fontFamily: font, padding: "56px 0 32px", borderTop: `1px solid ${V.line}` }}>
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)] gap-8 pb-9">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 text-[15px] font-medium">
              <div className="w-6 h-6 rounded-md grid place-items-center text-white text-[11px] font-bold"
                style={{ background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.35), 0 0 16px rgba(124,58,237,.35)` }}>
                N
              </div>
              <span style={{ color: V.ink }}>NGO Platform</span>
            </div>
            <p className="mt-3.5 text-sm leading-relaxed max-w-[280px]" style={{ color: V.inkSoft }}>
              Multi-tenant infrastructure for charity organisations. Donations, campaigns, donor CRM — built for charity ops.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3.5 text-[11px] font-medium tracking-[.12em] uppercase" style={{ fontFamily: mono, color: V.inkFaint }}>Product</h4>
            <div className="space-y-1.5">
              <Link to="/#features" className="block py-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: V.inkSoft }}>Features</Link>
              <Link to="/plans" className="block py-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: V.inkSoft }}>Pricing</Link>
              <Link to="/register" className="block py-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: V.inkSoft }}>Register</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-3.5 text-[11px] font-medium tracking-[.12em] uppercase" style={{ fontFamily: mono, color: V.inkFaint }}>Support</h4>
            <div className="space-y-1.5">
              <Link to="/contact" className="block py-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: V.inkSoft }}>Contact</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-3.5 text-[11px] font-medium tracking-[.12em] uppercase" style={{ fontFamily: mono, color: V.inkFaint }}>Contact</h4>
            <div className="space-y-1.5">
              <p className="py-1.5 text-sm" style={{ color: V.inkSoft }}>support@ngoplatform.com</p>
              <p className="py-1.5 text-sm" style={{ color: V.inkSoft }}>Sydney, NSW, Australia</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 text-xs"
          style={{ fontFamily: mono, borderTop: `1px solid ${V.line}`, color: V.inkFaint }}>
          <div>&copy; {new Date().getFullYear()} NGO Platform &middot; v2.4.1</div>
          <div className="flex gap-6">
            <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: V.inkFaint }}>Privacy</a>
            <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: V.inkFaint }}>Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
