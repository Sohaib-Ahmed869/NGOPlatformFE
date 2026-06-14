// Shared option sets for the admin Events screens. Keep in sync with the
// backend enums in models/event.js.

export const EVENT_TYPES = [
  { value: "fundraiser", label: "Fundraiser" },
  { value: "gala", label: "Gala / Dinner" },
  { value: "community", label: "Community Program" },
  { value: "awareness", label: "Awareness" },
  { value: "volunteer", label: "Volunteer Drive" },
  { value: "workshop", label: "Workshop" },
  { value: "webinar", label: "Webinar" },
  { value: "other", label: "Other" },
];

export const EVENT_TYPE_LABELS = EVENT_TYPES.reduce(
  (acc, t) => ((acc[t.value] = t.label), acc),
  {}
);

export const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const STATUS_LABELS = STATUS_OPTIONS.reduce(
  (acc, s) => ((acc[s.value] = s.label), acc),
  {}
);

// Tailwind badge classes per status (light admin theme).
export const STATUS_BADGE = {
  upcoming: "bg-accent/10 text-accent",
  ongoing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export const REGISTRATION_MODES = [
  { value: "none", label: "No registration", hint: "Info-only — visitors just see the event." },
  { value: "external", label: "External link", hint: "Send people to a link you provide." },
  { value: "internal", label: "On-site RSVP", hint: "Collect registrations here, with capacity & attendance." },
];

export const QUESTION_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Paragraph" },
  { value: "select", label: "Dropdown (choose one)" },
  { value: "checkbox", label: "Checkboxes (choose many)" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
];

// One-click registration question templates (prefill). Each becomes a normal
// question in the builder; the backend derives a stable `key` from the label.
export const QUESTION_TEMPLATES = [
  { label: "Dietary requirements", type: "select", required: false, options: ["None", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Other"] },
  { label: "Accessibility needs", type: "textarea", required: false, options: [] },
  { label: "T-shirt size", type: "select", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Emergency contact (name & phone)", type: "text", required: false, options: [] },
  { label: "Organisation / company", type: "text", required: false, options: [] },
  { label: "How did you hear about us?", type: "select", required: false, options: ["Social media", "Friend or family", "Email", "Our website", "Other"] },
  { label: "Age group", type: "select", required: false, options: ["Under 18", "18–30", "31–50", "51+"] },
  { label: "Special requests or notes", type: "textarea", required: false, options: [] },
];

// Starter packs — insert a sensible set of questions in one click.
export const QUESTION_PACKS = [
  {
    id: "attendee",
    label: "Attendee details",
    description: "Organisation, age group & how they heard about you",
    questions: [
      { label: "Organisation / company", type: "text", required: false, options: [] },
      { label: "Age group", type: "select", required: false, options: ["Under 18", "18–30", "31–50", "51+"] },
      { label: "How did you hear about us?", type: "select", required: false, options: ["Social media", "Friend or family", "Email", "Our website", "Other"] },
    ],
  },
  {
    id: "catering",
    label: "Catering & access",
    description: "Dietary needs & accessibility",
    questions: [
      { label: "Dietary requirements", type: "select", required: false, options: ["None", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Other"] },
      { label: "Accessibility needs", type: "textarea", required: false, options: [] },
    ],
  },
  {
    id: "volunteer",
    label: "Volunteer sign-up",
    description: "Availability, skills, t-shirt & emergency contact",
    questions: [
      { label: "Availability", type: "textarea", required: false, options: [] },
      { label: "Relevant skills or experience", type: "textarea", required: false, options: [] },
      { label: "T-shirt size", type: "select", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
      { label: "Emergency contact (name & phone)", type: "text", required: true, options: [] },
    ],
  },
];

// ── Event starter templates ──
// Pick one when creating an event to prefill the whole form (type, a description
// scaffold, registration mode + sensible questions). Tailored to NGO / charity
// events. `icon` is mapped to a lucide component in EventForm.
export const EVENT_TEMPLATES = [
  {
    id: "gala",
    name: "Charity Gala Dinner",
    tagline: "Formal fundraising dinner with seating & RSVPs.",
    icon: "gala",
    defaults: {
      eventType: "gala",
      registrationMode: "internal",
      description:
        "Join us for an elegant evening in support of our cause — dinner, guest speakers and a live auction. Every seat helps us make a difference.",
      allowGuests: true,
      maxGuestsPerRegistration: 1,
      isPaid: true,
      featured: true,
    },
    questions: [
      { label: "Dietary requirements", type: "select", required: false, options: ["None", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Other"] },
      { label: "Number of seats", type: "number", required: false, options: [] },
      { label: "Table / seating preference", type: "text", required: false, options: [] },
    ],
  },
  {
    id: "run",
    name: "Charity Walk / Run",
    tagline: "Sponsored fitness event with participant details.",
    icon: "run",
    defaults: {
      eventType: "fundraiser",
      registrationMode: "internal",
      description:
        "Lace up for a good cause! Walk or run to raise funds and awareness. All ages and fitness levels are welcome.",
      allowGuests: true,
      maxGuestsPerRegistration: 4,
    },
    questions: [
      { label: "T-shirt size", type: "select", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
      { label: "Age group", type: "select", required: false, options: ["Under 18", "18–30", "31–50", "51+"] },
      { label: "Emergency contact (name & phone)", type: "text", required: true, options: [] },
    ],
  },
  {
    id: "iftar",
    name: "Community Iftar / Meal",
    tagline: "Shared meal with headcount & dietary needs.",
    icon: "iftar",
    defaults: {
      eventType: "community",
      registrationMode: "internal",
      description:
        "Break bread with the community at our shared meal. Bring your family and friends — all are welcome at the table.",
      allowGuests: true,
      maxGuestsPerRegistration: 6,
    },
    questions: [
      { label: "Number of guests joining you", type: "number", required: false, options: [] },
      { label: "Dietary requirements", type: "select", required: false, options: ["None", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Other"] },
    ],
  },
  {
    id: "drive",
    name: "Donation Drive",
    tagline: "Collection drive — link out or info only.",
    icon: "drive",
    defaults: {
      eventType: "fundraiser",
      registrationMode: "none",
      description:
        "Help us reach our goal! Donate items or funds at our collection drive and be part of the change.",
      featured: true,
    },
    questions: [],
  },
  {
    id: "seminar",
    name: "Awareness Seminar / Webinar",
    tagline: "Talk or webinar with sign-ups.",
    icon: "seminar",
    defaults: {
      eventType: "awareness",
      registrationMode: "internal",
      description:
        "Join our session to learn about the issues we tackle and how you can help. A live Q&A with our team is included.",
    },
    questions: [
      { label: "Organisation / company", type: "text", required: false, options: [] },
      { label: "How did you hear about us?", type: "select", required: false, options: ["Social media", "Friend or family", "Email", "Our website", "Other"] },
    ],
  },
  {
    id: "volunteer",
    name: "Volunteer Day",
    tagline: "Hands-on volunteering with availability & skills.",
    icon: "volunteer",
    defaults: {
      eventType: "volunteer",
      registrationMode: "internal",
      description:
        "Give your time to make a direct impact. Join our volunteer day — no experience needed, just a willingness to help.",
    },
    questions: [
      { label: "Availability", type: "textarea", required: false, options: [] },
      { label: "Relevant skills or experience", type: "textarea", required: false, options: [] },
      { label: "T-shirt size", type: "select", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
      { label: "Emergency contact (name & phone)", type: "text", required: true, options: [] },
    ],
  },
  {
    id: "camp",
    name: "Medical / Health Camp",
    tagline: "Free camp with attendee health details.",
    icon: "camp",
    defaults: {
      eventType: "community",
      registrationMode: "internal",
      description:
        "Free health check-ups and consultations for the community. Register to reserve your slot and skip the queue.",
    },
    questions: [
      { label: "Age group", type: "select", required: false, options: ["Under 18", "18–30", "31–50", "51+"] },
      { label: "Specific health concerns (optional)", type: "textarea", required: false, options: [] },
    ],
  },
  {
    id: "cricket",
    name: "Cricket Charity Match",
    tagline: "Fundraising match — a family day out.",
    icon: "cricket",
    defaults: {
      eventType: "fundraiser",
      registrationMode: "internal",
      description:
        "Cheer on the teams at our charity cricket match — a fun day out for the whole family, all in support of our cause.",
      allowGuests: true,
      maxGuestsPerRegistration: 4,
      featured: true,
    },
    questions: [
      { label: "Number of seats", type: "number", required: false, options: [] },
      { label: "T-shirt size", type: "select", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    ],
  },
  {
    id: "ration",
    name: "Ration / Food Drive",
    tagline: "Collect & distribute ration hampers.",
    icon: "ration",
    defaults: {
      eventType: "community",
      registrationMode: "none",
      description:
        "Help us pack and distribute ration hampers to families in need. Every contribution helps put food on the table.",
      featured: true,
    },
    questions: [],
  },
  {
    id: "blood",
    name: "Blood Donation Camp",
    tagline: "Slot booking with donor details.",
    icon: "blood",
    defaults: {
      eventType: "community",
      registrationMode: "internal",
      description:
        "Give the gift of life. Register for our blood donation camp and reserve your slot with our medical partners.",
    },
    questions: [
      { label: "Blood group", type: "select", required: false, options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "Don't know"] },
      { label: "Age group", type: "select", required: false, options: ["Under 18", "18–30", "31–50", "51+"] },
      { label: "Have you donated before?", type: "select", required: false, options: ["Yes", "No"] },
    ],
  },
  {
    id: "school",
    name: "Back-to-School Drive",
    tagline: "Sponsor supplies for students.",
    icon: "school",
    defaults: {
      eventType: "community",
      registrationMode: "none",
      description:
        "Help kids start the school year right. Donate supplies or sponsor a student at our back-to-school drive.",
      featured: true,
    },
    questions: [],
  },
  {
    id: "auction",
    name: "Charity Auction",
    tagline: "Bid on items to support the cause.",
    icon: "auction",
    defaults: {
      eventType: "fundraiser",
      registrationMode: "internal",
      description:
        "Bid on exclusive items and experiences to support our work. Every winning bid makes a real difference.",
      allowGuests: true,
      maxGuestsPerRegistration: 1,
      isPaid: true,
      featured: true,
    },
    questions: [
      { label: "Number of seats", type: "number", required: false, options: [] },
      { label: "Dietary requirements", type: "select", required: false, options: ["None", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Other"] },
    ],
  },
  {
    id: "eid",
    name: "Eid Gift Distribution",
    tagline: "Spread joy with gifts for families.",
    icon: "eid",
    defaults: {
      eventType: "community",
      registrationMode: "internal",
      description:
        "Spread Eid joy! Join us as we distribute gifts and sweets to children and families in our community.",
    },
    questions: [
      { label: "Number of children", type: "number", required: false, options: [] },
      { label: "Age groups of children", type: "text", required: false, options: [] },
    ],
  },
];

// Display name for an event's type, honouring the custom "other" label.
export const eventTypeDisplay = (event) =>
  event?.eventType === "other" && event?.eventTypeOther
    ? event.eventTypeOther
    : EVENT_TYPE_LABELS[event?.eventType] || event?.eventType || "—";
