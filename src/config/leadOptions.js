// Shared option lists for the "Express interest" lead form (pages/SaaS/GetStarted.jsx)
// and the SuperAdmin Leads detail screen — one place for the value/label pairs so
// a submitted lead's chips read the same way an operator sees them.

export const CAUSE_AREAS = [
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "poverty", label: "Poverty relief" },
  { value: "zakat", label: "Zakat & Islamic giving" },
  { value: "environment", label: "Environment" },
  { value: "children", label: "Children & youth" },
  { value: "disaster_relief", label: "Disaster relief" },
  { value: "animal_welfare", label: "Animal welfare" },
  { value: "arts_culture", label: "Arts & culture" },
  { value: "human_rights", label: "Human rights" },
  { value: "other", label: "Other" },
];

export const STAFF_SIZES = [
  { value: "1-5", label: "1–5" },
  { value: "6-20", label: "6–20" },
  { value: "21-50", label: "21–50" },
  { value: "51-200", label: "51–200" },
  { value: "200+", label: "200+" },
];

export const BUDGET_RANGES = [
  { value: "under_50k", label: "Under $50k" },
  { value: "50k_250k", label: "$50k – $250k" },
  { value: "250k_1m", label: "$250k – $1M" },
  { value: "1m_5m", label: "$1M – $5M" },
  { value: "5m_plus", label: "$5M+" },
];

export const DONOR_DB_SIZES = [
  { value: "under_500", label: "Under 500" },
  { value: "500_2500", label: "500 – 2,500" },
  { value: "2500_10000", label: "2,500 – 10,000" },
  { value: "10000_plus", label: "10,000+" },
  { value: "unsure", label: "Not sure" },
];

export const CURRENT_TOOLS = [
  { value: "spreadsheets", label: "Spreadsheets" },
  { value: "salesforce_npsp", label: "Salesforce NPSP" },
  { value: "bloomerang", label: "Bloomerang" },
  { value: "donorperfect", label: "DonorPerfect" },
  { value: "kindful", label: "Kindful" },
  { value: "little_green_light", label: "Little Green Light" },
  { value: "custom", label: "A custom/in-house system" },
  { value: "none", label: "Nothing yet" },
  { value: "other", label: "Other" },
];

export const CHALLENGES = [
  { value: "donor_management", label: "Donor management" },
  { value: "online_giving", label: "Online giving" },
  { value: "recurring", label: "Recurring donations" },
  { value: "p2p_campaigns", label: "Peer-to-peer campaigns" },
  { value: "volunteers", label: "Volunteer management" },
  { value: "events", label: "Events" },
  { value: "email", label: "Email & newsletters" },
  { value: "reporting", label: "Reporting" },
  { value: "zakat_tools", label: "Zakat tools" },
  { value: "branding_website", label: "Branding & website" },
  { value: "other", label: "Other" },
];

export const TIMELINES = [
  { value: "immediately", label: "Immediately" },
  { value: "this_month", label: "This month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "this_year", label: "This year" },
  { value: "just_researching", label: "Just researching" },
];

export const DECISION_ROLES = [
  { value: "decision_maker", label: "I'm the decision maker" },
  { value: "influencer", label: "I influence the decision" },
  { value: "researching_for_others", label: "I'm researching for someone else" },
];

export const CONTACT_ROLES = [
  "Executive Director",
  "Fundraising Lead",
  "Operations",
  "IT",
  "Board Member",
  "Other",
];

function labelFrom(list, value) {
  return list.find((o) => o.value === value)?.label || value || "";
}

export const causeAreaLabel = (v) => labelFrom(CAUSE_AREAS, v);
export const staffSizeLabel = (v) => labelFrom(STAFF_SIZES, v);
export const budgetRangeLabel = (v) => labelFrom(BUDGET_RANGES, v);
export const donorDbSizeLabel = (v) => labelFrom(DONOR_DB_SIZES, v);
export const currentToolLabel = (v) => labelFrom(CURRENT_TOOLS, v);
export const challengeLabel = (v) => labelFrom(CHALLENGES, v);
export const timelineLabel = (v) => labelFrom(TIMELINES, v);
export const decisionRoleLabel = (v) => labelFrom(DECISION_ROLES, v);
