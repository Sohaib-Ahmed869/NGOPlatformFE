import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";
import { CTABand } from "../giving";

/* Call-to-action band section (dynamic page builder). Receives a section's
   `data` fields as props. Mirrors the closing CTA on pages/About/page.jsx. */
const CtaBandSection = ({
  title,
  text,
  primaryCtaText,
  primaryCtaLink,
  secondaryCtaText,
  secondaryCtaLink,
}) => {
  const hasPrimary = primaryCtaText && primaryCtaText.trim();
  const hasSecondary = secondaryCtaText && secondaryCtaText.trim();

  return (
    <CTABand title={title} text={text}>
      {hasPrimary && (
        <Link
          to={primaryCtaLink || "#"}
          className="inline-flex items-center gap-2 rounded-token-btn bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
        >
          {primaryCtaText} <Heart className="h-4 w-4" />
        </Link>
      )}
      {hasSecondary && (
        <Link
          to={secondaryCtaLink || "#"}
          className="inline-flex items-center gap-2 rounded-token-btn border-token border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          {secondaryCtaText} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </CTABand>
  );
};

export default CtaBandSection;
