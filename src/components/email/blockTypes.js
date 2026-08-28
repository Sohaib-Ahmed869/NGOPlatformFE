import {
  Heading,
  Type,
  MousePointerClick,
  Minus,
  MoveVertical,
  LayoutList,
  Megaphone,
  List,
  Image,
  Quote,
  Table,
  Code2,
  Sparkles,
  ListOrdered,
  BarChart3,
  PenLine,
} from "lucide-react";

/**
 * The block-builder's schema.
 *
 * Every block type declares its icon, the props a new one starts with, and the
 * FIELDS that edit it. The inspector renders itself from `fields` rather than
 * having a hand-written form per type, so adding a block type here is the only
 * change needed to expose it in the UI — no new components.
 *
 * `type` on a field maps to a control in BlockInspector:
 *   text | textarea | rich | url | number | color | select | align | tone
 *   rows      label/value repeater (the details panel)
 *   columns   table column repeater
 *   items     plain string list
 *
 * `rich` fields accept {{variables}} and limited inline HTML (<strong>, <em>,
 * <a>, <br/>), which is why they get the variable palette's insert button.
 *
 * Keep the keys here in step with services/emailBlocks.js on the backend — that
 * file is what actually renders them, and it silently skips anything it doesn't
 * recognise.
 */

const ALIGN_FIELD = { key: "align", label: "Align", type: "align" };

export const BLOCK_TYPES = [
  {
    type: "heading",
    label: "Heading",
    icon: Heading,
    hint: "A section title.",
    create: () => ({ type: "heading", text: "Your heading", level: 2, align: "left" }),
    fields: [
      {
        key: "eyebrow",
        label: "Eyebrow",
        type: "text",
        optional: true,
        placeholder: "YOUR RECEIPT",
        help: "A small accent label above the heading. Does more for how composed an email looks than anything else here.",
      },
      { key: "text", label: "Text", type: "rich", rows: 2 },
      {
        key: "level",
        label: "Size",
        type: "select",
        options: [
          [1, "Large"],
          [2, "Medium"],
          [3, "Small"],
        ],
      },
      {
        key: "font",
        label: "Typeface",
        type: "select",
        options: [
          ["serif", "Serif — editorial"],
          ["sans", "Sans — matches the body"],
        ],
      },
      ALIGN_FIELD,
      { key: "color", label: "Colour", type: "color", optional: true },
    ],
    summary: (b) => b.text,
  },
  {
    type: "hero",
    label: "Statement figure",
    icon: Sparkles,
    hint: "The one number that matters, set large — an amount received, a total raised.",
    create: () => ({
      type: "hero",
      label: "AMOUNT RECEIVED",
      figure: "{{donation.amount | money:donation.currency}}",
      caption: "",
      align: "center",
    }),
    fields: [
      { key: "label", label: "Eyebrow", type: "text", optional: true },
      { key: "figure", label: "Figure", type: "rich", rows: 1 },
      { key: "caption", label: "Caption", type: "rich", rows: 2, optional: true },
      ALIGN_FIELD,
      // Codes and references want monospace and open tracking, not a tight serif.
      { key: "mono", label: "Monospace (for codes)", type: "toggle" },
      { key: "color", label: "Figure colour", type: "color", optional: true },
      { key: "background", label: "Background", type: "color", optional: true },
    ],
    summary: (b) => b.figure,
  },
  {
    type: "steps",
    label: "Steps",
    icon: ListOrdered,
    hint: "Numbered next steps with accent discs. Clearer than a numbered list, and consistent across clients.",
    create: () => ({
      type: "steps",
      items: [
        { title: "First step", text: "" },
        { title: "Then this", text: "" },
      ],
    }),
    fields: [
      {
        key: "items",
        label: "Steps",
        type: "rows",
        spec: {
          a: "title",
          b: "text",
          aLabel: "Step title",
          bLabel: "Description (optional)",
          showIf: false,
          addLabel: "Add step",
        },
      },
    ],
    summary: (b) => `${(b.items || []).length} step${(b.items || []).length === 1 ? "" : "s"}`,
  },
  {
    type: "stats",
    label: "Figures",
    icon: BarChart3,
    hint: "Two or three figures side by side — payments made, total given, days left.",
    create: () => ({
      type: "stats",
      items: [
        { value: "", label: "Given" },
        { value: "", label: "Payments" },
      ],
    }),
    fields: [
      {
        key: "items",
        label: "Figures",
        type: "rows",
        spec: {
          a: "label",
          b: "value",
          aLabel: "Caption, e.g. Total given",
          bLabel: "{{subscription.totalGiven | money}}",
          showIf: false,
          addLabel: "Add figure",
        },
      },
    ],
    summary: (b) => `${(b.items || []).length} figure${(b.items || []).length === 1 ? "" : "s"}`,
  },
  {
    type: "signature",
    label: "Signature",
    icon: PenLine,
    hint: "A human sign-off — monogram, name, role. An email that ends with a person reads as written, not triggered.",
    create: () => ({
      type: "signature",
      note: "With gratitude,",
      name: "{{org.name}}",
      role: "",
    }),
    fields: [
      { key: "note", label: "Sign-off line", type: "rich", rows: 2, optional: true },
      { key: "name", label: "Name", type: "text" },
      { key: "role", label: "Role", type: "text", optional: true },
    ],
    summary: (b) => b.name,
  },
  {
    type: "paragraph",
    label: "Text",
    icon: Type,
    hint: "A paragraph. Supports <strong>, <em>, <a> and <br/>.",
    create: () => ({ type: "paragraph", text: "Write something here.", align: "left" }),
    fields: [
      { key: "text", label: "Text", type: "rich", rows: 5 },
      ALIGN_FIELD,
      { key: "size", label: "Font size", type: "number", placeholder: "15", optional: true },
      { key: "color", label: "Colour", type: "color", optional: true },
    ],
    summary: (b) => b.text,
  },
  {
    type: "button",
    label: "Button",
    icon: MousePointerClick,
    hint: "A call to action. The block disappears if the link is empty.",
    create: () => ({ type: "button", label: "Click here", url: "", align: "center", style: "solid" }),
    fields: [
      { key: "label", label: "Button text", type: "text" },
      { key: "url", label: "Link", type: "url", placeholder: "https://… or {{org.donateUrl}}" },
      {
        key: "note",
        label: "Note under the button",
        type: "rich",
        rows: 2,
        optional: true,
        placeholder: "Or paste this link: {{invite.url}}",
      },
      { key: "arrow", label: "Show the arrow", type: "toggle" },
      ALIGN_FIELD,
      {
        key: "style",
        label: "Style",
        type: "select",
        options: [
          ["solid", "Solid"],
          ["outline", "Outline"],
        ],
      },
      { key: "color", label: "Colour", type: "color", optional: true },
    ],
    summary: (b) => b.label,
  },
  {
    type: "panel",
    label: "Details panel",
    icon: LayoutList,
    hint: "The boxed label/value list used for receipts, bookings and summaries.",
    create: () => ({
      type: "panel",
      title: "Details",
      rows: [{ label: "Reference", value: "" }],
    }),
    fields: [
      { key: "title", label: "Panel title", type: "text", optional: true },
      {
        key: "rows",
        label: "Rows",
        type: "rows",
        spec: { strong: true },
        help: "A+ sets a row larger — use it for the figure the reader is looking for.",
      },
    ],
    summary: (b) => `${(b.rows || []).length} row${(b.rows || []).length === 1 ? "" : "s"}`,
  },
  {
    type: "callout",
    label: "Callout",
    icon: Megaphone,
    hint: "A tinted notice — good for warnings and reassurance.",
    create: () => ({ type: "callout", text: "Something worth noticing.", tone: "info" }),
    fields: [
      { key: "text", label: "Text", type: "rich", rows: 3 },
      { key: "tone", label: "Tone", type: "tone" },
    ],
    summary: (b) => b.text,
  },
  {
    type: "list",
    label: "List",
    icon: List,
    hint: "Bulleted or numbered points.",
    create: () => ({ type: "list", style: "bullet", items: ["First point"] }),
    fields: [
      {
        key: "style",
        label: "Style",
        type: "select",
        options: [
          ["bullet", "Bulleted"],
          ["number", "Numbered"],
        ],
      },
      { key: "items", label: "Items", type: "items" },
    ],
    summary: (b) => `${(b.items || []).length} item${(b.items || []).length === 1 ? "" : "s"}`,
  },
  {
    type: "table",
    label: "Table",
    icon: Table,
    hint: "Repeats one row per entry in a list variable, e.g. donation.items.",
    create: () => ({
      type: "table",
      source: "",
      columns: [
        { label: "Item", value: "{{this.label}}", align: "left" },
        { label: "Amount", value: "{{this.amount | money}}", align: "right" },
      ],
      showTotal: false,
      totalLabel: "Total",
      totalValue: "",
    }),
    fields: [
      {
        key: "source",
        label: "List variable",
        type: "text",
        placeholder: "donation.items",
        help: "Inside the columns, use {{this.…}} for each entry's own fields.",
      },
      { key: "columns", label: "Columns", type: "columns" },
      { key: "showTotal", label: "Show a total row", type: "toggle" },
      { key: "totalLabel", label: "Total label", type: "text", showWhen: (b) => b.showTotal },
      { key: "totalValue", label: "Total value", type: "rich", rows: 1, showWhen: (b) => b.showTotal },
    ],
    summary: (b) => b.source || "no list chosen",
  },
  {
    type: "image",
    label: "Image",
    icon: Image,
    hint: "Remote image. Many mail clients block these until the reader allows them, so never put essential information in one.",
    create: () => ({ type: "image", src: "", alt: "", align: "center", width: 0 }),
    fields: [
      { key: "src", label: "Image URL", type: "url" },
      { key: "alt", label: "Alt text", type: "text" },
      { key: "href", label: "Links to", type: "url", optional: true },
      { key: "width", label: "Max width (px)", type: "number", placeholder: "auto", optional: true },
      ALIGN_FIELD,
    ],
    summary: (b) => b.alt || b.src,
  },
  {
    type: "quote",
    label: "Quote",
    icon: Quote,
    hint: "An accent-barred pull quote.",
    create: () => ({ type: "quote", text: "Something someone said.", cite: "" }),
    fields: [
      { key: "text", label: "Quote", type: "rich", rows: 3 },
      { key: "cite", label: "Attribution", type: "text", optional: true },
    ],
    summary: (b) => b.text,
  },
  {
    type: "divider",
    label: "Divider",
    icon: Minus,
    hint: "A horizontal rule.",
    create: () => ({ type: "divider" }),
    fields: [
      { key: "mark", label: "Centred mark", type: "toggle" },
      { key: "color", label: "Colour", type: "color", optional: true },
    ],
    summary: (b) => (b.mark ? "—&#9670;—" : "—"),
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: MoveVertical,
    hint: "Vertical breathing room.",
    create: () => ({ type: "spacer", size: 24 }),
    fields: [{ key: "size", label: "Height (px)", type: "number", placeholder: "16" }],
    summary: (b) => `${b.size || 16}px`,
  },
  {
    type: "html",
    label: "Custom HTML",
    icon: Code2,
    hint: "An escape hatch. Use table-based, inline-styled HTML — email clients ignore <style> and flexbox.",
    create: () => ({ type: "html", html: "<p>Custom markup</p>" }),
    fields: [{ key: "html", label: "HTML", type: "textarea", rows: 8, mono: true }],
    summary: (b) => String(b.html || "").replace(/<[^>]*>/g, "").slice(0, 60),
  },
];

export const BLOCK_BY_TYPE = Object.fromEntries(BLOCK_TYPES.map((b) => [b.type, b]));

export const TONE_OPTIONS = [
  { value: "info", label: "Info", color: "#3b82f6" },
  { value: "success", label: "Success", color: "#10b981" },
  { value: "warning", label: "Warning", color: "#f59e0b" },
  { value: "danger", label: "Danger", color: "#ef4444" },
  { value: "neutral", label: "Neutral", color: "#6b7280" },
];

/** Client-side id for a newly added block; the server keeps whatever it's given. */
export const newBlockId = () => `b${Math.random().toString(36).slice(2, 9)}`;

/** A fresh block of `type`, ready to drop on the canvas. */
export function createBlock(type) {
  const def = BLOCK_BY_TYPE[type];
  if (!def) return null;
  return { id: newBlockId(), ...def.create() };
}

/** One-line preview text for a block card, stripped of markup and truncated. */
export function blockSummary(block) {
  const def = BLOCK_BY_TYPE[block?.type];
  if (!def) return "";
  const raw = def.summary?.(block) ?? "";
  const text = String(raw).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 70 ? `${text.slice(0, 70)}…` : text;
}
