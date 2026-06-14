import React from "react";
import { useTenant } from "../../context/TenantContext";

const Logo = ({ className = "", size = "default", textColor = "text-primary" }) => {
  const { organisation, branding } = useTenant();

  const sizes = {
    small: { icon: 28, text: "text-lg" },
    default: { icon: 36, text: "text-xl" },
    large: { icon: 48, text: "text-2xl" },
  };
  const s = sizes[size] || sizes.default;

  // When a logo image exists it already carries the brand mark/wordmark, so
  // show it on its own. Generic light-background context → prefer the dark
  // logo, fall back to the light variant. Otherwise the heart icon + org name.
  const logoSrc = branding?.logoDark || branding?.logo;
  if (logoSrc) {
    return (
      <div className={`flex items-center ${className}`}>
        <img
          src={logoSrc}
          alt={organisation?.name || "Logo"}
          style={{ height: s.icon }}
          className="w-auto object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 38c0 0 4-2 8-2s6 2 10 6c4 4 6 8 6 8"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M56 38c0 0-4-2-8-2s-6 2-10 6c-4 4-6 8-6 8"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M32 46l-1.5-1.4C22 37.4 16 32 16 25.5 16 20.3 20.3 16 25.5 16c2.9 0 5.7 1.4 6.5 3.5C32.8 17.4 35.6 16 38.5 16 43.7 16 48 20.3 48 25.5c0 6.5-6 11.9-14.5 19.1L32 46z"
          className="fill-accent"
        />
      </svg>
      <span className={`font-heading font-bold ${s.text} ${textColor}`}>
        {organisation?.name || "NGO Platform"}
      </span>
    </div>
  );
};

export default Logo;
