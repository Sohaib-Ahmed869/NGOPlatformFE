import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";
import { PageHero, icon as resolveIcon } from "../giving";

/* Hero banner section (dynamic page builder). Receives a section's `data`
   fields as props. Mirrors the hero on pages/About/page.jsx. */
const HeroSection = ({
  eyebrow,
  title,
  subtitle,
  image,
  icon,
  primaryCtaText,
  primaryCtaLink,
  secondaryCtaText,
  secondaryCtaLink,
}) => {
  const Icon = resolveIcon(icon || "HandHeart");
  const hasPrimary = primaryCtaText && primaryCtaText.trim();
  const hasSecondary = secondaryCtaText && secondaryCtaText.trim();

  return (
    <PageHero image={image} icon={Icon} eyebrow={eyebrow} title={title} subtitle={subtitle}>
      {(hasPrimary || hasSecondary) && (
        <div className="flex flex-wrap justify-center gap-3">
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
        </div>
      )}
    </PageHero>
  );
};

export default HeroSection;
