/**
 * Frontend half of the section (block) registry. The backend
 * (config/sectionTypes.js) owns each type's schema + defaults; here we pair each
 * `type` with its renderer component (public site) and an icon (admin builder).
 * Keep the `type` keys in sync with the backend registry.
 */
import {
  Image as ImageIcon,
  FileText,
  LayoutGrid,
  Layers,
  TrendingUp,
  Users,
  Building2,
  Quote as QuoteIcon,
  Megaphone,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import HeroSection from "../components/sections/Hero";
import RichTextSection from "../components/sections/RichTextBlock";
import CardGridSection from "../components/sections/CardGrid";
import FeatureGridSection from "../components/sections/FeatureGrid";
import ImageTextSection from "../components/sections/ImageText";
import StatsBandSection from "../components/sections/StatsBand";
import TeamGridSection from "../components/sections/TeamGrid";
import LogosStripSection from "../components/sections/LogosStrip";
import QuoteSection from "../components/sections/Quote";
import CtaBandSection from "../components/sections/CtaBand";
import GallerySection from "../components/sections/Gallery";
import FaqSection from "../components/sections/Faq";

// type → renderer component (used by PageSections on the public site).
export const SECTION_COMPONENTS = {
  hero: HeroSection,
  richText: RichTextSection,
  cardGrid: CardGridSection,
  featureGrid: FeatureGridSection,
  imageText: ImageTextSection,
  statsBand: StatsBandSection,
  teamGrid: TeamGridSection,
  logosStrip: LogosStripSection,
  quote: QuoteSection,
  ctaBand: CtaBandSection,
  gallery: GallerySection,
  faq: FaqSection,
};

// type → icon (used by the admin section builder: add menu + row headers).
export const SECTION_ICONS = {
  hero: ImageIcon,
  richText: FileText,
  cardGrid: LayoutGrid,
  featureGrid: Sparkles,
  imageText: Layers,
  statsBand: TrendingUp,
  teamGrid: Users,
  logosStrip: Building2,
  quote: QuoteIcon,
  ctaBand: Megaphone,
  gallery: ImageIcon,
  faq: MessageSquare,
};

export const sectionIcon = (type) => SECTION_ICONS[type] || LayoutGrid;
