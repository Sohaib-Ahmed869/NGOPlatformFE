/**
 * Comprehensive theme presets for organisation portals.
 * 4 categories × 10 themes = 40 total presets.
 * Each theme defines: primary (text/headings), accent (buttons/CTA), bg (page background),
 * sidebar (dark surface), surface (cards/panels).
 */

const themeCategories = [
  {
    id: "warm",
    name: "Warm & Classic",
    description: "Traditional charity aesthetics with warm, inviting tones",
    themes: [
      { id: "default", name: "Golden Sands", primary: "#2C2418", accent: "#C9A84C", bg: "#FAF7F2", sidebar: "#3D3226", surface: "#FFFFFF", desc: "The classic charity look" },
      { id: "warm-amber", name: "Amber Glow", primary: "#3E2723", accent: "#FF8F00", bg: "#FFF8E1", sidebar: "#4E342E", surface: "#FFFFFF", desc: "Rich amber warmth" },
      { id: "warm-terracotta", name: "Terracotta", primary: "#4A2C2A", accent: "#C75B39", bg: "#FBF0EB", sidebar: "#5D4037", surface: "#FFFFFF", desc: "Earthy terracotta tones" },
      { id: "warm-burgundy", name: "Burgundy", primary: "#3C1421", accent: "#9C254D", bg: "#FDF2F4", sidebar: "#4A1A2E", surface: "#FFFFFF", desc: "Deep, rich burgundy" },
      { id: "warm-copper", name: "Copper", primary: "#3B2F2F", accent: "#B87333", bg: "#FAF6F0", sidebar: "#4B3B3B", surface: "#FFFFFF", desc: "Warm metallic copper" },
      { id: "warm-mahogany", name: "Mahogany", primary: "#2E1503", accent: "#8B4513", bg: "#FDF5EE", sidebar: "#3E2513", surface: "#FFFFFF", desc: "Deep mahogany wood" },
      { id: "warm-cinnamon", name: "Cinnamon", primary: "#3B1F0B", accent: "#D2691E", bg: "#FFF5EB", sidebar: "#4A2E1A", surface: "#FFFFFF", desc: "Spiced cinnamon warmth" },
      { id: "warm-rust", name: "Rust", primary: "#2D1B0E", accent: "#A0522D", bg: "#FAF0E6", sidebar: "#3D2B1E", surface: "#FFFFFF", desc: "Vintage rust aesthetic" },
      { id: "warm-honey", name: "Honey", primary: "#2C2418", accent: "#DAA520", bg: "#FFFEF5", sidebar: "#3C3428", surface: "#FFFFFF", desc: "Sweet honey gold" },
      { id: "warm-clay", name: "Clay", primary: "#3A2A1F", accent: "#CC7722", bg: "#F8F0E3", sidebar: "#4A3A2F", surface: "#FFFFFF", desc: "Natural clay tones" },
    ],
  },
  {
    id: "modern",
    name: "Modern & Bold",
    description: "Contemporary designs with vibrant, high-contrast accents",
    themes: [
      { id: "modern-crimson", name: "Crimson", primary: "#1A1A2E", accent: "#E94560", bg: "#F8F9FA", sidebar: "#16213E", surface: "#FFFFFF", desc: "Bold and contemporary" },
      { id: "modern-electric", name: "Electric Blue", primary: "#0D1B2A", accent: "#0077B6", bg: "#F0F4F8", sidebar: "#1B2838", surface: "#FFFFFF", desc: "Electric energy" },
      { id: "modern-violet", name: "Violet", primary: "#1A1A2E", accent: "#7C3AED", bg: "#F5F3FF", sidebar: "#1E1B4B", surface: "#FFFFFF", desc: "Regal purple accents" },
      { id: "modern-magenta", name: "Magenta", primary: "#1C1C2E", accent: "#DB2777", bg: "#FDF2F8", sidebar: "#2D1B36", surface: "#FFFFFF", desc: "Vibrant magenta pop" },
      { id: "modern-coral", name: "Coral", primary: "#1A1A2A", accent: "#F97316", bg: "#FFF7ED", sidebar: "#2A1A1A", surface: "#FFFFFF", desc: "Warm coral energy" },
      { id: "modern-cyan", name: "Cyan", primary: "#0F172A", accent: "#06B6D4", bg: "#ECFEFF", sidebar: "#0E1F33", surface: "#FFFFFF", desc: "Cool cyan freshness" },
      { id: "modern-rose", name: "Rose Gold", primary: "#1C1917", accent: "#E11D48", bg: "#FFF1F2", sidebar: "#2C2927", surface: "#FFFFFF", desc: "Elegant rose accents" },
      { id: "modern-indigo", name: "Indigo", primary: "#1E1B4B", accent: "#4F46E5", bg: "#EEF2FF", sidebar: "#1E1B4B", surface: "#FFFFFF", desc: "Deep indigo depth" },
      { id: "modern-emerald", name: "Emerald Pop", primary: "#0F172A", accent: "#10B981", bg: "#F0FDF4", sidebar: "#162032", surface: "#FFFFFF", desc: "Bold emerald contrast" },
      { id: "modern-slate", name: "Slate", primary: "#0F172A", accent: "#6366F1", bg: "#F8FAFC", sidebar: "#1E293B", surface: "#FFFFFF", desc: "Sleek and minimal" },
    ],
  },
  {
    id: "nature",
    name: "Nature & Earth",
    description: "Organic, natural palettes inspired by the environment",
    themes: [
      { id: "nature-forest", name: "Forest", primary: "#1B4332", accent: "#40916C", bg: "#F0FFF4", sidebar: "#1A3A2A", surface: "#FFFFFF", desc: "Deep forest greens" },
      { id: "nature-ocean", name: "Ocean", primary: "#0C4A6E", accent: "#0284C7", bg: "#F0F9FF", sidebar: "#0A3A5E", surface: "#FFFFFF", desc: "Calming ocean blues" },
      { id: "nature-sage", name: "Sage", primary: "#3D405B", accent: "#81B29A", bg: "#F4F1DE", sidebar: "#2D3040", surface: "#FFFFFF", desc: "Earthy sage greens" },
      { id: "nature-lavender", name: "Lavender Fields", primary: "#3B3355", accent: "#9B72CF", bg: "#F5F0FF", sidebar: "#2B2345", surface: "#FFFFFF", desc: "Soft lavender blooms" },
      { id: "nature-moss", name: "Moss", primary: "#2D3B2D", accent: "#5C8A4D", bg: "#F2F7F0", sidebar: "#1D2B1D", surface: "#FFFFFF", desc: "Subtle moss greens" },
      { id: "nature-sand", name: "Sand Dune", primary: "#4A4035", accent: "#C4A35A", bg: "#FAF6ED", sidebar: "#3A3025", surface: "#FFFFFF", desc: "Desert sand warmth" },
      { id: "nature-sky", name: "Clear Sky", primary: "#1E3A5F", accent: "#4DA8DA", bg: "#F0F8FF", sidebar: "#152A4A", surface: "#FFFFFF", desc: "Open sky clarity" },
      { id: "nature-stone", name: "River Stone", primary: "#374151", accent: "#6B7280", bg: "#F3F4F6", sidebar: "#1F2937", surface: "#FFFFFF", desc: "Smooth stone neutrals" },
      { id: "nature-sunset", name: "Sunset", primary: "#2B2D42", accent: "#EF8354", bg: "#FFF8F0", sidebar: "#1B1D32", surface: "#FFFFFF", desc: "Warm sunset glow" },
      { id: "nature-meadow", name: "Meadow", primary: "#2D4A22", accent: "#7CB342", bg: "#F1F8E9", sidebar: "#1D3A12", surface: "#FFFFFF", desc: "Fresh meadow greens" },
    ],
  },
  {
    id: "professional",
    name: "Professional & Clean",
    description: "Corporate-ready designs that inspire trust and credibility",
    themes: [
      { id: "pro-classic", name: "Classic Blue", primary: "#2D3436", accent: "#0984E3", bg: "#FFFFFF", sidebar: "#2C3E50", surface: "#F8F9FA", desc: "Trusted corporate blue" },
      { id: "pro-charcoal", name: "Charcoal", primary: "#2D3436", accent: "#636E72", bg: "#FFFFFF", sidebar: "#2D3436", surface: "#F5F6FA", desc: "Sophisticated charcoal" },
      { id: "pro-navy", name: "Navy", primary: "#1B2A4A", accent: "#2E86C1", bg: "#FAFBFC", sidebar: "#152238", surface: "#FFFFFF", desc: "Authoritative navy" },
      { id: "pro-steel", name: "Steel", primary: "#263238", accent: "#546E7A", bg: "#FAFAFA", sidebar: "#1C2832", surface: "#FFFFFF", desc: "Industrial steel" },
      { id: "pro-graphite", name: "Graphite", primary: "#212121", accent: "#424242", bg: "#FAFAFA", sidebar: "#1A1A1A", surface: "#FFFFFF", desc: "Premium graphite" },
      { id: "pro-royal", name: "Royal", primary: "#1A237E", accent: "#3949AB", bg: "#F5F5FF", sidebar: "#0D1457", surface: "#FFFFFF", desc: "Royal blue prestige" },
      { id: "pro-teal", name: "Teal", primary: "#1A3C34", accent: "#009688", bg: "#F0FDFA", sidebar: "#0D2C24", surface: "#FFFFFF", desc: "Professional teal" },
      { id: "pro-burgundy", name: "Executive", primary: "#2C1320", accent: "#880E4F", bg: "#FFF5F8", sidebar: "#1C0810", surface: "#FFFFFF", desc: "Executive burgundy" },
      { id: "pro-midnight", name: "Midnight", primary: "#0A0E27", accent: "#5C6BC0", bg: "#F8F9FF", sidebar: "#060A1A", surface: "#FFFFFF", desc: "Deep midnight" },
      { id: "pro-titanium", name: "Titanium", primary: "#37474F", accent: "#78909C", bg: "#ECEFF1", sidebar: "#263238", surface: "#FFFFFF", desc: "Sleek titanium" },
    ],
  },
];

/**
 * Flat lookup map: themeId → theme object with category info
 */
const themeMap = {};
themeCategories.forEach((cat) => {
  cat.themes.forEach((theme) => {
    themeMap[theme.id] = { ...theme, categoryId: cat.id, categoryName: cat.name };
  });
});

/**
 * Get a theme by ID, with fallback to default.
 */
export function getThemeById(id) {
  return themeMap[id] || themeMap["default"];
}

/**
 * Get all theme IDs for backend enum.
 */
export function getAllThemeIds() {
  return Object.keys(themeMap);
}

export { themeCategories, themeMap };
export default themeCategories;
