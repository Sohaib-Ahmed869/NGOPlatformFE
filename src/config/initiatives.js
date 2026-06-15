/**
 * Content config for the four "initiative" pages (Education, Water, Food,
 * Emergencies). These are the DEFAULTS — each page merges tenant CMS overrides
 * (usePageContent) on top, so admins can edit copy/cards/stats/video without a
 * code change. Media is image-first: a `videoId` is optional and only renders a
 * video when set, so a page can never show a broken "Video unavailable" embed.
 *
 * Icon names are plain strings resolved to lucide components in InitiativePage.
 */

export const INITIATIVES = {
  education: {
    icon: "GraduationCap",
    hero: {
      eyebrow: "Education",
      title: "Education",
      subtitle: "Building futures through learning, one child at a time.",
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80",
    },
    mission: {
      eyebrow: "Our mission",
      heading: "Educating every child deprived of quality learning",
      text: "We believe that to progress, education for girls must become our goal. We aim to educate every child in every corner of the country who is deprived of quality education, equipping them with the values and skills to thrive — and steer the nation forward.",
      image: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80",
      videoId: "",
    },
    donateBanner: {
      title: "Support Education Today",
      image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80",
    },
    focusHeading: "Our Focus Areas",
    focusAreas: [
      { image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&q=80", title: "Community schooling system", description: "We foster knowledge and non-cognitive development to change lives, equipping students with the values and skills to thrive in all aspects of life." },
      { image: "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=600&q=80", title: "Awareness initiatives", description: "Family counselling, psychological care for students, medical camps, and professional capacity-building training for staff." },
      { image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80", title: "Professional development", description: "We empower teachers with innovative teaching methods, skills-building and mentorship so they can better support every student." },
    ],
    feature: {
      eyebrow: "At the heart of what we do",
      heading: "Education remains at the heart of our mission",
      text: "Through our Incentive for Education program we support students academically while ensuring their families are nourished and thriving. Our Skills Development program gives young people the tools to shape their futures and become valuable contributors to society.",
      image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80",
      videoId: "",
    },
    stats: {
      heading: "Our Impact in Numbers",
      items: [
        { value: "21 Schools", tags: ["14 IN KARACHI", "3 IN AZAD KASHMIR", "2 IN NOWSHERA", "1 IN LAHORE", "1 IN FAISALABAD"] },
        { value: "6,500+ Students", tags: ["2,555 GIRLS", "2,393 BOYS"] },
        { value: "240+ Teachers", tags: ["45 NON-TEACHING STAFF"] },
        { value: "9 New Schools", tags: ["SCOUTED FOR ADOPTION"] },
        { value: "3 Skill Centres", tags: ["FAISALABAD", "THARPARKAR", "LANDI KOTAL"] },
      ],
    },
  },

  water: {
    icon: "Droplets",
    hero: {
      eyebrow: "Clean Water",
      title: "Clean Water",
      subtitle: "Access to safe, clean water for every community.",
      image: "https://images.unsplash.com/photo-1519455953755-af066f52f1a6?auto=format&fit=crop&w=1600&q=80",
    },
    mission: {
      eyebrow: "Our mission",
      heading: "Clean water facilities for people in need",
      text: "Millions in Pakistan have limited or no access to water, and a lack of clean water leads to many health issues. It is one of our core goals to help procure and provide clean water facilities to the communities that need them most.",
      image: "https://images.unsplash.com/photo-1538300342682-cf57afb97285?w=800&q=80",
      videoId: "",
    },
    donateBanner: {
      title: "Provide Clean Water",
      image: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&q=80",
    },
    focusHeading: "Our Focus Areas",
    focusAreas: [
      { image: "https://images.unsplash.com/photo-1594398901394-4e34939a4fd0?w=600&q=80", title: "Water pipelines", description: "Despite the challenge of installing pipelines in villages and camps without electricity, we have laid multiple pipelines delivering thousands of gallons daily to local communities." },
      { image: "https://images.unsplash.com/photo-1581888227599-779811939961?w=600&q=80", title: "Solar-powered supply", description: "Solar panels give communities access to water while reducing emissions. Our tank at Khajuri Bazar provides 10,000 gallons to 5,000 households." },
      { image: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&q=80", title: "Clean water, new beginnings", description: "From R.O. plants in Balochistan to handpumps in Sindh, our clean-water initiatives transform lives through something as fundamental as clean water." },
    ],
  },

  food: {
    icon: "Utensils",
    hero: {
      eyebrow: "Food Security",
      title: "Food Security",
      subtitle: "No family should ever have to go hungry.",
      image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1600&q=80",
    },
    mission: {
      eyebrow: "Our mission",
      heading: "Immediate, healthy food for the underprivileged",
      text: "With our vision of providing basic necessities to the underprivileged, our teams deliver immediate assistance to sustain life, improve health and support the morale of affected communities.",
      image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80",
      videoId: "",
    },
    donateBanner: {
      title: "Help Feed a Family",
      image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80",
    },
    focusHeading: "Our Focus Areas",
    focusAreas: [
      { image: "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=600&q=80", title: "Ration drives in Pakistan", description: "We organise ration drives providing essential food and supplies to low-income families — especially during emergencies, natural disasters and Ramadan." },
      { image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80", title: "Ramadan food drive", description: "Our Ramadan Food Drive provides food and essentials to underprivileged families, engaging local donors and volunteers in the spirit of giving." },
    ],
    feature: {
      eyebrow: "Community kitchen",
      heading: "Strengthening communities through essential support",
      text: "Our Soup Kitchen offers free, nutritious meals to homeless and underprivileged individuals. Volunteers prepare and serve the meals, fostering compassion and inclusivity for the most vulnerable in our communities.",
      image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80",
      videoId: "",
    },
    stats: {
      heading: "Our Impact in Numbers",
      items: [
        { value: "300,000 People Fed" },
        { value: "80,900 Iftars Served" },
        { value: "6,000+ People", tagline: "Facilitated with flood relief drives" },
        { value: "170,600+ Rations Served" },
      ],
    },
  },

  emergencies: {
    icon: "LifeBuoy",
    hero: {
      eyebrow: "Emergency Relief",
      title: "Emergency Relief",
      subtitle: "Rapid, compassionate response when it matters most.",
      image: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1600&q=80",
    },
    mission: {
      eyebrow: "Our mission",
      heading: "Rebuilding lives and fostering resilience",
      text: "In Chakwal, essential rations gave families a month of food security, and we are building homes for underprivileged widows in Hoshab, Balochistan with support from our donors. These efforts reflect our commitment to rebuilding lives in communities facing hardship.",
      image: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80",
      videoId: "",
    },
    donateBanner: {
      title: "Support Emergency Relief",
      image: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80",
    },
    focusHeading: "Our Previous Projects",
    focusAreas: [
      { image: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80", title: "Beirut Crisis Appeal", description: "After the Beirut explosions, we partnered with AusRelief and presented AUD 5,000 on behalf of our community to support relief activities for those left without food and safe spaces." },
      { image: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80", title: "Australian Bushfires Support", description: "Coordinating with the NSW Rural Fire Service, we donated drinking water and essential items to support victims of the bushfire crisis across NSW." },
      { image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80", title: "COVID-19 Support", description: "We provided food packs sustaining 36,000 families in Pakistan for over two weeks, and extended aid to underprivileged communities in Bangladesh and across Australia." },
      { image: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80", title: "Turkey & Syria Earthquake", description: "We worked alongside implementation partners to deliver emergency relief in Turkey and Syria after the devastating earthquake that affected millions." },
    ],
  },
};

/* ── "Our Initiatives" hub (/initiatives) ─────────────────────────────────── */

export const INITIATIVES_HERO_IMG =
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80";

// Fallback hub cards (real copy lives in the CMS and wins over these).
export const INITIATIVES_HUB_CARDS = [
  { icon: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80", title: "Education", link: "/initiative-1", description: "The progress of a nation rests in the hands of its mothers, daughters and sisters — so we put learning first." },
  { icon: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80", title: "Food", link: "/initiative-3", description: "Healthy meals for those in need, sustaining lives locally and overseas through ration drives and kitchens." },
  { icon: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&q=80", title: "Water", link: "/initiative-2", description: "Millions have limited or no access to clean water — we build the wells, pipelines and filtration to change that." },
  { icon: "https://images.unsplash.com/photo-1603321544554-f416a9a11fcb?w=600&q=80", title: "Emergencies", link: "/initiative-4", description: "Rapid relief for struggling families during disasters, delivered without discrimination, when it matters most." },
  { icon: "https://images.unsplash.com/photo-1538300342682-cf57afb97285?w=600&q=80", title: "Clean Water", link: "#", description: "Sustainable clean-water solutions through wells, filtration systems and long-term infrastructure projects." },
  { icon: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80", title: "Women Empowerment", link: "#", description: "Skills training, microfinance support and education that build self-reliant women and communities." },
];

// Sub-navigation tying the initiatives section together (Overview + the four
// programs). Icons resolve via the shared ICONS map in components/giving.jsx.
export const INITIATIVES_NAV = [
  { to: "/initiatives", label: "Overview", icon: "LayoutGrid", end: true },
  { to: "/initiative-1", label: "Education", icon: "GraduationCap" },
  { to: "/initiative-2", label: "Water", icon: "Droplets" },
  { to: "/initiative-3", label: "Food", icon: "Utensils" },
  { to: "/initiative-4", label: "Emergencies", icon: "LifeBuoy" },
];

export default INITIATIVES;
