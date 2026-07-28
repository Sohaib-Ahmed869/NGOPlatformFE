import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";

/* Shared closing CTA for the marketing site (home, plans, …). Extracted from the
   home page's editorial CTA so both pages reuse ONE component. Token-driven (themes
   with the brand colour) and self-contained (injects its own button CSS).
   The band is the brand gradient itself: primary → accent, left to right, with a
   short primary hold so the split reads roughly half and half (the 50/50 mix lands
   near 60%). Recolours with the SuperAdmin platform brand. */
const V = {
  primary: "var(--tenant-primary, #102A23)",
  accent: "var(--tenant-accent, #047857)",
  glow: "var(--tenant-accent-light, #059669)",
};

const css = `
.cta-btn{position:relative;overflow:hidden}
.cta-btn::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.55) 50%,transparent 65%);transform:translateX(-130%);transition:transform 1s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.cta-btn:hover::before{transform:translateX(130%)}
.cta-ghost{transition:background .3s,border-color .3s}
.cta-ghost:hover{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.5)}
`;

export default function CtaSection({
  title = "Ready to help your charity raise more?",
  primaryLabel = "Get started",
  primaryTo = "/register",
  secondaryLabel = "Talk to us",
  secondaryTo = "/contact",
  className = "px-6 pb-28",
}) {
  return (
    <section className={`relative z-[1] ${className}`}>
      <style>{css}</style>
      <div className="mx-auto max-w-[1120px]">
        <div className="relative overflow-hidden rounded-3xl px-8 py-9 sm:px-12 sm:py-10"
          style={{ background: `linear-gradient(90deg, ${V.primary} 0%, ${V.primary} 22%, ${V.accent} 100%)`, boxShadow: "0 40px 80px -42px rgba(0,0,0,.55)" }}>

          {/* Editorial geometric shapes */}
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 border-2" style={{ borderColor: "rgba(255,255,255,.14)" }} />
          <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-2 w-20" style={{ background: V.glow }} />
          <div aria-hidden className="pointer-events-none absolute bottom-4 left-9 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-16" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.08), transparent)" }} />

          <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:gap-10 md:text-left">
            {/* font-medium, not bold: matches the 500 the pages set on h1/h2, and
                this component also mounts OUTSIDE .saas-page (the register route),
                where that CSS rule can't reach it. */}
            <h2 className="max-w-[24ch] text-[clamp(21px,2.3vw,28px)] font-medium leading-[1.14] tracking-[-0.02em] text-white">{title}</h2>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
              <Link to={primaryTo}
                className="cta-btn group inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-[15px] font-semibold"
                style={{ background: "#fff", color: V.accent, boxShadow: "0 16px 34px -16px rgba(0,0,0,.5)" }}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link to={secondaryTo}
                className="cta-ghost inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold text-white"
                style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.30)", backdropFilter: "blur(4px)" }}>
                <MessageCircle className="h-[18px] w-[18px]" />
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
