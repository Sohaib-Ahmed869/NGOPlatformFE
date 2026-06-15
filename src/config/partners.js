/**
 * Content config for the Our Partners page.
 *
 * These are the DEFAULTS. The page merges any tenant CMS overrides
 * (usePageContent "partners") on top, so admins can change copy/cards/logos
 * without a code change, and untouched fields fall back to these.
 *
 * Icon names are plain strings (resolved to lucide components in the page) so
 * this stays serialisable / CMS-ready — mirrors src/config/giving.js.
 */

export const PARTNERS_HERO_IMG =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&q=80";

// Image shown beside the "Become a partner" enquiry form.
export const PARTNERS_FORM_IMG =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=80";

// Partnership types for the enquiry form (value must match the backend enum).
export const PARTNER_TYPES = [
  { value: "corporate", label: "Corporate partnership" },
  { value: "community", label: "Community group" },
  { value: "in-kind", label: "In-kind support" },
  { value: "ambassador", label: "Ambassador" },
  { value: "other", label: "Other" },
];

// Headline numbers shown in the band under the hero.
export const PARTNERS_STATS = [
  { value: "40+", label: "Partner organisations" },
  { value: "12", label: "Communities reached" },
  { value: "10+", label: "Years of collaboration" },
  { value: "100%", label: "Reaches the cause" },
];

// "Why partner with us" — the value of working together.
export const PARTNERS_WHY = [
  {
    icon: "Globe",
    title: "Greater reach",
    text: "Together we extend further into communities than any of us could alone — multiplying the good we do.",
  },
  {
    icon: "ShieldCheck",
    title: "Trusted delivery",
    text: "Established processes, on-the-ground teams and full transparency mean your support is delivered with care.",
  },
  {
    icon: "TrendingUp",
    title: "Measurable impact",
    text: "We report back on outcomes, not just intentions — so every partnership shows real, lasting change.",
  },
];

// "Ways to get involved" — the different kinds of partnership. `type` maps to
// the enquiry form's partnership type so a card can prefill it.
export const PARTNERS_WAYS = [
  {
    icon: "Building2",
    type: "corporate",
    title: "Corporate partnership",
    text: "Align your brand with meaningful causes through sponsorship, matched giving and workplace fundraising.",
  },
  {
    icon: "Users",
    type: "community",
    title: "Community groups",
    text: "Mosques, schools and local organisations joining hands to serve those closest to home.",
  },
  {
    icon: "Boxes",
    type: "in-kind",
    title: "In-kind support",
    text: "Donate goods, services, venues or expertise — practical help that stretches every dollar further.",
  },
  {
    icon: "Megaphone",
    type: "ambassador",
    title: "Become an ambassador",
    text: "Champion our work, share our story and help bring more hands to the mission.",
  },
];

// The partner logos / names grid.
export const PARTNERS_DEFAULT = [
  { logo: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=300&q=80", name: "Community Aid Network" },
  { logo: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=300&q=80", name: "Bright Futures Foundation" },
  { logo: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=300&q=80", name: "Unity Education Trust" },
  { logo: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=300&q=80", name: "Global Relief Alliance" },
  { logo: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=300&q=80", name: "Hope Bridge Initiative" },
  { logo: "https://images.unsplash.com/photo-1497375638960-ca368c7231e4?w=300&q=80", name: "Compassion Partners" },
  { logo: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=300&q=80", name: "Impact Giving Foundation" },
  { logo: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=300&q=80", name: "Community Sports League" },
  { logo: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=300&q=80", name: "Cultural Heritage Group" },
  { logo: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=300&q=80", name: "Humanity First Foundation" },
  { logo: "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=300&q=80", name: "Brothers in Need" },
  { logo: "https://images.unsplash.com/photo-1526958097901-5e6d742d3371?w=300&q=80", name: "Multicultural Community Group" },
];
