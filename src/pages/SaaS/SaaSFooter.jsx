import React from "react";
import { Link } from "react-router-dom";
import { HeartHandshake } from "lucide-react";

const V = {
  bg: "#F3F8F5", surface: "#FFFFFF", surface2: "#E7F2EC",
  line: "rgba(6,40,30,.08)", ink: "#102A23", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "#047857", primary2: "#065F46",
};

const font = "'Outfit', system-ui, sans-serif";

export default function SaaSFooter() {
  return (
    <footer className="relative z-10" style={{ fontFamily: font, padding: "56px 0 32px", borderTop: `1px solid ${V.line}` }}>
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)] gap-8 pb-9">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 text-[16px] font-semibold">
              <div className="w-9 h-9 rounded-xl grid place-items-center text-white"
                style={{ background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.35), 0 6px 16px -6px rgba(4,120,87,.6)` }}>
                <HeartHandshake className="w-[19px] h-[19px]" />
              </div>
              <span style={{ color: V.ink }}>NGO Platform</span>
            </div>
            <p className="mt-3.5 text-sm leading-relaxed max-w-[290px]" style={{ color: V.inkSoft }}>
              The warm, all-in-one platform that helps charities raise funds, welcome donors and run
              campaigns — with their own branded portal.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3.5 text-[12px] font-semibold tracking-[.08em] uppercase" style={{ color: V.inkFaint }}>Platform</h4>
            <div className="space-y-1.5">
              <Link to="/#features" className="block py-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: V.inkSoft }}>Features</Link>
              <Link to="/plans" className="block py-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: V.inkSoft }}>Pricing</Link>
              <Link to="/register" className="block py-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: V.inkSoft }}>Get started</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-3.5 text-[12px] font-semibold tracking-[.08em] uppercase" style={{ color: V.inkFaint }}>Support</h4>
            <div className="space-y-1.5">
              <Link to="/contact" className="block py-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: V.inkSoft }}>Contact us</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-3.5 text-[12px] font-semibold tracking-[.08em] uppercase" style={{ color: V.inkFaint }}>Get in touch</h4>
            <div className="space-y-1.5">
              <p className="py-1.5 text-sm" style={{ color: V.inkSoft }}>support@ngoplatform.com</p>
              <p className="py-1.5 text-sm" style={{ color: V.inkSoft }}>Sydney, NSW, Australia</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 text-xs"
          style={{ borderTop: `1px solid ${V.line}`, color: V.inkFaint }}>
          <div>&copy; {new Date().getFullYear()} NGO Platform &middot; Made with care for charities</div>
          <div className="flex gap-6">
            <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: V.inkFaint }}>Privacy</a>
            <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: V.inkFaint }}>Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
