/**
 * Content config for the giving suite.
 *
 * These are the DEFAULTS. Each page merges any tenant CMS overrides
 * (usePageContent) on top of these, so admins can override copy/cards without a
 * code change, and untouched fields fall back to sensible defaults here.
 */

/* ── Islamic Giving hub ───────────────────────────────────────────────────── */

// Icon names are resolved to lucide components in the page (keeps config plain
// data so it can later move to the CMS/JSON without importing React).
export const GIVING_PATHS = [
  {
    to: "/Ramadan",
    icon: "Moon",
    eyebrow: "The blessed month",
    title: "Ramadan Giving",
    description: "Automate your daily sadaqah across the last 10 nights and never miss the rewards of Laylatul Qadr.",
    cta: "Give this Ramadan",
  },
  {
    to: "/zakat/calculator",
    icon: "Calculator",
    eyebrow: "Fulfil your obligation",
    title: "Zakat Calculator",
    description: "Work out exactly what you owe in seconds, then pay your Zakat directly to the cause of your choice.",
    cta: "Calculate my Zakat",
  },
];

export const GIVING_FORMS = [
  { icon: "Coins", title: "Zakat", text: "2.5% of qualifying wealth held for a lunar year — one of the five pillars of Islam." },
  { icon: "HandHeart", title: "Sadaqah", text: "Voluntary charity given any time, in any amount, for any cause close to your heart." },
  { icon: "Sparkles", title: "Zakat al-Fitr", text: "A small obligatory gift given before Eid prayer that purifies the fast." },
  { icon: "Gem", title: "Fidya & Kaffarah", text: "Compensation for missed fasts — feeding those in need on your behalf." },
];

export const GIVING_TRUST = [
  { icon: "ShieldCheck", label: "100% of your Zakat distributed" },
  { icon: "Heart", label: "Directed to your chosen cause" },
  { icon: "Star", label: "Receipted instantly for your records" },
];

/* ── Zakat calculator ─────────────────────────────────────────────────────── */

// Nisab thresholds (minimum wealth on which Zakat is due). Track market prices.
export const NISAB = {
  gold: { label: "Gold", sub: "87.48g", value: 8723.64 },
  silver: { label: "Silver", sub: "612.36g", value: 612.78 },
};

export const ZAKAT_RATE = 0.025;

export const ZAKAT_ASSET_FIELDS = [
  { key: "cashInHand", label: "Cash in hand & bank", icon: "Wallet", hint: "Savings, current accounts and cash" },
  { key: "goldValue", label: "Value of gold", icon: "Gem" },
  { key: "silverValue", label: "Value of silver", icon: "Coins" },
  { key: "investments", label: "Investments & shares", icon: "TrendingUp" },
  { key: "businessInventory", label: "Business inventory", icon: "Briefcase", hint: "Stock and goods for resale" },
];

export const ZAKAT_STEPS = [
  { n: "01", icon: "Wallet", title: "Add your assets", text: "Total your cash, gold, silver, shares and business stock held for a lunar year." },
  { n: "02", icon: "Scale", title: "Subtract liabilities", text: "Deduct debts due now and check your net wealth against the Nisab threshold." },
  { n: "03", icon: "HandCoins", title: "Pay your 2.5%", text: "Give your Zakat and we'll deliver it to those who qualify." },
];

/* ── Ramadan giving ───────────────────────────────────────────────────────── */

export const RAMADAN_TEN_NIGHTS = [
  { key: "feed", image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80", amount: "Feed a family of 5", price: 7, description: "Donate $7 each night for a food / ration bag for a family of 5 in the last 10 nights." },
  { key: "educate", image: "https://images.unsplash.com/photo-1497375638960-ca368c7231e4?w=600&q=80", amount: "Educate a child", price: 30, description: "Donate $30 each night to support a child's education during the last 10 nights." },
  { key: "water", image: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80", amount: "Build a hand pump", price: 60, description: "Donate $60 each night to fund a large hand pump providing clean water." },
];

export const RAMADAN_DAILY = [
  { key: "d5", image: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80", amount: "Give $5 a night", price: 5, description: "Consistent daily support for those in need — small acts, multiplied across the blessed nights." },
  { key: "d10", image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80", amount: "Give $10 a night", price: 10, description: "Provide essential aid every night and make a lasting impact through the last 10 nights." },
  { key: "d20", image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80", amount: "Give $20 a night", price: 20, description: "Sustain vital programs and bring meaningful change throughout Ramadan." },
];

/* ── Suite sub-navigation (connects the three pages) ──────────────────────── */

export const GIVING_NAV = [
  { to: "/giving", label: "Overview", icon: "HandHeart", end: true },
  { to: "/zakat/calculator", label: "Zakat Calculator", icon: "Calculator" },
  { to: "/Ramadan", label: "Ramadan Giving", icon: "Moon" },
];

/* Default hero images per page (used unless the tenant sets hero.image in CMS). */
export const GIVING_HERO_IMG = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1600&q=80";
export const ZAKAT_HERO_IMG = "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=80";
export const RAMADAN_HERO_IMG = "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=1600&q=80";
export const RAMADAN_MISSION_IMG = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1000&q=80";
