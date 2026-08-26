import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard, Heart, Users, Paintbrush, RefreshCcw, Target,
  CalendarDays, Settings, Search, Bell, ChevronDown, Check, Plus,
  ArrowUpRight, MoreHorizontal,
} from "lucide-react";
import { V, EASE } from "./ui";

/**
 * ProductTour — the section where the marketing site finally shows the product.
 *
 * Everything else on this page is flat illustration: good for the charity story,
 * useless for answering "what is this software?". A CEO comparing platforms wants
 * to see the admin they'll live in, so this renders it — not a screenshot (which
 * would go stale the moment the app changes, and is pinned to one tenant's brand)
 * but the real UI vocabulary rebuilt in HTML off the same V tokens as the rest of
 * the page. It recolours with the platform theme and stays crisp at any zoom.
 *
 * The four panes mirror the actual admin nav (see src/Admin/navConfig.js):
 * Dashboard, Donations, Donors, Website. Nothing is claimed here that the
 * product doesn't ship.
 */

/* ── Tabs ─────────────────────────────────────────────────────────────────
   Each tab names the surface AND what it does, because the tab rail is doing
   double duty as a feature list for anyone who never clicks. */
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, blurb: "Every number your board asks for, on one screen." },
  { id: "donations", label: "Donations", icon: Heart, blurb: "One-off, monthly and instalment gifts in one ledger." },
  { id: "donors", label: "Donors", icon: Users, blurb: "The full supporter record — history, contact, causes." },
  { id: "website", label: "Your website", icon: Paintbrush, blurb: "Your brand, your pages, your own web address." },
];

/* Sidebar rail — the real admin groups, trimmed to what fits the frame. */
const RAIL = [
  { icon: LayoutDashboard, label: "Dashboard", tab: "dashboard" },
  { icon: Heart, label: "Donations", tab: "donations" },
  { icon: RefreshCcw, label: "Subscriptions" },
  { icon: Users, label: "Donors", tab: "donors" },
  { icon: Target, label: "Programs" },
  { icon: CalendarDays, label: "Events" },
  { icon: Paintbrush, label: "Branding", tab: "website" },
  { icon: Settings, label: "Settings" },
];

/* ── Entrance helper ──────────────────────────────────────────────────────
   The panes mount with the page, long before the section is scrolled to, so
   framer's `initial` has already been consumed by the time the frame comes into
   view — gating on `initial` alone leaves every bar and progress fill parked at
   its end state and the section arrives dead. `play` therefore drives the
   ANIMATE target, not the initial one: hidden at mount, animating the moment
   inView flips. Under reduced motion we skip straight to the end state and
   never subscribe. */
const enter = ({ play, reduce }, from, to, transition) => (
  reduce
    ? { initial: false, animate: to }
    : { initial: from, animate: play ? to : from, transition }
);

/* ── Small shared primitives ─────────────────────────────────────────────
   The mock UI needs its own scale: it sits inside a frame that is itself only
   ~60% of the page width, so app type runs smaller than page type and is set
   in fixed px rather than the fluid page ladder. Everything is token-coloured. */
const Panel = ({ children, className = "", style = {} }) => (
  <div className={`rounded-[14px] ${className}`}
    style={{ background: V.surface, border: `1px solid ${V.line}`, ...style }}>
    {children}
  </div>
);

const Dot = ({ tone }) => (
  <span aria-hidden className="inline-block h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: tone }} />
);

/* Initials avatar — no image requests inside a decorative mock. */
const Avatar = ({ name, size = 26 }) => {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-semibold"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: V.surface2, color: V.primary, border: `1px solid ${V.line}`,
      }}>
      {initials}
    </span>
  );
};

/* ── Pane 1 · Dashboard ──────────────────────────────────────────────────── */

const KPIS = [
  { label: "Raised this month", value: "$48,920", delta: "+12.4%" },
  { label: "Active donors", value: "1,284", delta: "+86" },
  { label: "Monthly giving", value: "$11,350", delta: "+4.1%" },
  { label: "Avg. gift", value: "$74", delta: "+$6" },
];

// A fortnight of daily totals. Hand-set rather than random so the silhouette is
// stable between renders and reads as a real week-on-week rhythm (weekends dip).
const BARS = [38, 52, 44, 61, 73, 40, 30, 58, 69, 82, 74, 91, 52, 46];

const RECENT = [
  { name: "Aisha Rahman", fund: "Emergency Appeal", amt: "$250", when: "2m ago", kind: "One-off" },
  { name: "Tom Becker", fund: "Clean Water", amt: "$40", when: "18m ago", kind: "Monthly" },
  { name: "Priya Nair", fund: "General Fund", amt: "$1,000", when: "1h ago", kind: "One-off" },
  { name: "James Okonkwo", fund: "Winter Shelter", amt: "$75", when: "3h ago", kind: "Monthly" },
];

function DashboardPane(m) {
  return (
    <div className="grid gap-3">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPIS.map((k, i) => (
          <motion.div key={k.label}
            {...enter(m, { opacity: 0, y: 10 }, { opacity: 1, y: 0 },
              { duration: 0.45, delay: 0.05 + i * 0.06, ease: EASE })}>
            <Panel className="p-3">
              <p className="text-[10.5px] font-medium leading-tight" style={{ color: V.inkFaint }}>{k.label}</p>
              <p className="mt-1.5 text-[19px] font-bold leading-none tracking-tight" style={{ color: V.ink }}>{k.value}</p>
              <p className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: V.success }}>
                <ArrowUpRight className="h-3 w-3" />{k.delta}
              </p>
            </Panel>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        {/* Chart */}
        <Panel className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12.5px] font-semibold" style={{ color: V.ink }}>Donations</p>
              <p className="text-[10.5px]" style={{ color: V.inkFaint }}>Last 14 days</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium"
              style={{ background: V.surface2, color: V.primary }}>
              Daily <ChevronDown className="h-3 w-3" />
            </span>
          </div>

          {/* Bars grow from the baseline on first view. scaleY + bottom origin
              keeps it to a compositor-friendly transform. */}
          <div className="mt-4 flex h-[112px] items-end gap-[5px]">
            {BARS.map((h, i) => (
              <motion.span key={i} className="flex-1 rounded-t-[4px]"
                style={{
                  transformOrigin: "bottom",
                  background: i === BARS.length - 3
                    ? `linear-gradient(180deg, ${V.primary}, ${V.glow})`
                    : `rgba(var(--tenant-primary-rgb), .13)`,
                }}
                {...enter(m, { height: `${h}%`, scaleY: 0 }, { height: `${h}%`, scaleY: 1 },
                  { duration: 0.6, delay: 0.15 + i * 0.03, ease: EASE })}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9.5px]" style={{ color: V.inkFaint }}>
            <span>2 Aug</span><span>9 Aug</span><span>16 Aug</span>
          </div>
        </Panel>

        {/* Live feed */}
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-semibold" style={{ color: V.ink }}>Recent gifts</p>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium" style={{ color: V.success }}>
              <Dot tone={V.success} /> Live
            </span>
          </div>
          <ul className="mt-3 grid gap-2.5">
            {RECENT.map((r, i) => (
              <motion.li key={r.name} className="flex items-center gap-2.5"
                {...enter(m, { opacity: 0, x: 8 }, { opacity: 1, x: 0 },
                  { duration: 0.4, delay: 0.25 + i * 0.08, ease: EASE })}>
                <Avatar name={r.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-semibold" style={{ color: V.ink }}>{r.name}</span>
                  <span className="block truncate text-[10px]" style={{ color: V.inkFaint }}>{r.fund} · {r.when}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[12px] font-bold" style={{ color: V.ink }}>{r.amt}</span>
                  <span className="block text-[9.5px]" style={{ color: V.inkFaint }}>{r.kind}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ── Pane 2 · Donations ──────────────────────────────────────────────────── */

const LEDGER = [
  { name: "Aisha Rahman", fund: "Emergency Appeal", kind: "One-off", amt: "$250.00", status: "Paid", ref: "#DN-4821" },
  { name: "Tom Becker", fund: "Clean Water", kind: "Monthly", amt: "$40.00", status: "Paid", ref: "#DN-4820" },
  { name: "Priya Nair", fund: "General Fund", kind: "One-off", amt: "$1,000.00", status: "Paid", ref: "#DN-4819" },
  { name: "Daniel Okafor", fund: "Winter Shelter", kind: "Instalment 3/6", amt: "$125.00", status: "Scheduled", ref: "#DN-4818" },
  { name: "Maria Santos", fund: "Clean Water", kind: "Monthly", amt: "$25.00", status: "Paid", ref: "#DN-4817" },
  { name: "Eleanor Whitcombe", fund: "General Fund", kind: "One-off", amt: "$500.00", status: "Refunded", ref: "#DN-4816" },
];

const STATUS_TONE = {
  Paid: { fg: V.success, bg: "rgba(5,150,105,.10)" },
  Scheduled: { fg: V.accent, bg: "rgba(245,158,11,.14)" },
  Refunded: { fg: V.inkFaint, bg: "rgba(var(--tenant-primary-rgb), .07)" },
};

function Toolbar({ children, cta }) {
  return (
    <div className="flex items-center gap-2 border-b p-3" style={{ borderColor: V.line }}>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2.5 py-1.5"
        style={{ background: V.surface2 }}>
        <Search className="h-3 w-3 shrink-0" style={{ color: V.inkFaint }} />
        <span className="truncate text-[10.5px]" style={{ color: V.inkFaint }}>{children}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[10.5px] font-medium sm:inline-flex"
        style={{ border: `1px solid ${V.line}`, color: V.inkSoft }}>
        Filter <ChevronDown className="h-3 w-3" />
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[10.5px] font-semibold text-white"
        style={{ background: V.primary }}>
        <Plus className="h-3 w-3" />{cta}
      </span>
    </div>
  );
}

function DonationsPane(m) {
  return (
    <Panel className="overflow-hidden">
      <Toolbar cta="Export">Search donations, donors or reference…</Toolbar>

      {/* Header row is hidden below sm — at that width the rows collapse to a
          two-line card and column labels would have nothing to label. */}
      <div className="hidden grid-cols-[1.6fr_1.2fr_1fr_.8fr_.7fr] gap-3 px-4 py-2 text-[9.5px] font-semibold uppercase tracking-wide sm:grid"
        style={{ color: V.inkFaint, background: V.surface2 }}>
        <span>Donor</span><span>Fund</span><span>Type</span><span className="text-right">Amount</span><span>Status</span>
      </div>

      <ul>
        {LEDGER.map((row, i) => {
          const tone = STATUS_TONE[row.status];
          return (
            <motion.li key={row.ref}
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-t px-4 py-2.5 sm:grid-cols-[1.6fr_1.2fr_1fr_.8fr_.7fr]"
              style={{ borderColor: V.line2 }}
              {...enter(m, { opacity: 0, y: 6 }, { opacity: 1, y: 0 },
                { duration: 0.4, delay: 0.06 + i * 0.05, ease: EASE })}>
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={row.name} size={24} />
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-semibold" style={{ color: V.ink }}>{row.name}</span>
                  <span className="block text-[9.5px]" style={{ color: V.inkFaint }}>{row.ref}</span>
                </span>
              </span>
              <span className="hidden truncate text-[11px] sm:block" style={{ color: V.inkSoft }}>{row.fund}</span>
              <span className="hidden text-[11px] sm:block" style={{ color: V.inkSoft }}>{row.kind}</span>
              <span className="text-right text-[12px] font-bold sm:text-right" style={{ color: V.ink }}>{row.amt}</span>
              <span className="hidden sm:block">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[9.5px] font-semibold"
                  style={{ background: tone.bg, color: tone.fg }}>
                  <Dot tone={tone.fg} />{row.status}
                </span>
              </span>
            </motion.li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ── Pane 3 · Donors ─────────────────────────────────────────────────────── */

const DONORS = [
  { name: "Aisha Rahman", email: "aisha.r@example.com", total: "$4,280", gifts: 22, since: "2023", tag: "Monthly", pct: 88 },
  { name: "Priya Nair", email: "p.nair@example.com", total: "$3,150", gifts: 9, since: "2024", tag: "Major gift", pct: 64 },
  { name: "Tom Becker", email: "tbecker@example.com", total: "$1,920", gifts: 48, since: "2022", tag: "Monthly", pct: 40 },
  { name: "Maria Santos", email: "m.santos@example.com", total: "$860", gifts: 34, since: "2024", tag: "Monthly", pct: 18 },
];

function DonorsPane(m) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_.62fr]">
      <Panel className="overflow-hidden">
        <Toolbar cta="Add donor">Search supporters by name, email or tag…</Toolbar>
        <ul>
          {DONORS.map((d, i) => (
            <motion.li key={d.name} className="flex items-center gap-3 border-t px-4 py-3"
              style={{ borderColor: V.line2 }}
              {...enter(m, { opacity: 0, y: 6 }, { opacity: 1, y: 0 },
                { duration: 0.4, delay: 0.06 + i * 0.07, ease: EASE })}>
              <Avatar name={d.name} size={30} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[12px] font-semibold" style={{ color: V.ink }}>{d.name}</span>
                  <span className="shrink-0 rounded-full px-1.5 py-[1px] text-[9px] font-semibold"
                    style={{ background: V.surface2, color: V.primary }}>{d.tag}</span>
                </span>
                <span className="block truncate text-[10px]" style={{ color: V.inkFaint }}>{d.email}</span>
                {/* Lifetime-giving bar — the one number a fundraiser sorts by. */}
                <span aria-hidden className="mt-1.5 block h-[3px] w-full overflow-hidden rounded-full"
                  style={{ background: "rgba(var(--tenant-primary-rgb), .09)" }}>
                  <motion.span className="block h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }}
                    {...enter(m, { width: 0 }, { width: `${d.pct}%` },
                      { duration: 0.8, delay: 0.2 + i * 0.07, ease: EASE })} />
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[12.5px] font-bold" style={{ color: V.ink }}>{d.total}</span>
                <span className="block text-[9.5px]" style={{ color: V.inkFaint }}>{d.gifts} gifts · since {d.since}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </Panel>

      {/* Donor record — shows that a row opens into something real. */}
      <Panel className="p-4">
        <div className="flex items-center gap-2.5">
          <Avatar name="Aisha Rahman" size={38} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold" style={{ color: V.ink }}>Aisha Rahman</span>
            <span className="block text-[10px]" style={{ color: V.inkFaint }}>Supporter since 2023</span>
          </span>
          <MoreHorizontal className="ml-auto h-4 w-4 shrink-0" style={{ color: V.inkFaint }} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {[["Lifetime", "$4,280"], ["This year", "$1,140"], ["Gifts", "22"], ["Avg. gift", "$195"]].map(([k, v]) => (
            <span key={k} className="rounded-[10px] px-2.5 py-2" style={{ background: V.surface2 }}>
              <span className="block text-[9.5px]" style={{ color: V.inkFaint }}>{k}</span>
              <span className="block text-[13px] font-bold" style={{ color: V.ink }}>{v}</span>
            </span>
          ))}
        </div>

        <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: V.inkFaint }}>Timeline</p>
        <ul className="mt-2 grid gap-2">
          {[
            ["Gift received", "$250 · Emergency Appeal"],
            ["Receipt sent", "Automatically, by email"],
            ["Monthly gift", "$40 · Clean Water"],
          ].map(([t, s], i) => (
            <li key={t} className="flex gap-2">
              <span className="mt-[5px] flex flex-col items-center">
                <Dot tone={i === 0 ? V.primary : V.inkFaint} />
                {i < 2 && <span className="mt-0.5 block w-px flex-1" style={{ background: V.line }} />}
              </span>
              <span className="pb-0.5">
                <span className="block text-[11px] font-semibold" style={{ color: V.ink }}>{t}</span>
                <span className="block text-[9.5px]" style={{ color: V.inkFaint }}>{s}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ── Pane 4 · Website ────────────────────────────────────────────────────── */

const SWATCHES = ["#047857", "#0F766E", "#1D4ED8", "#9333EA", "#B45309", "#BE123C"];
const PAGES = ["Home", "About us", "Our programs", "Donate", "Events", "Contact"];

function WebsitePane(m) {
  return (
    <div className="grid gap-3 lg:grid-cols-[.72fr_1fr]">
      {/* The controls a non-technical fundraiser actually touches. */}
      <Panel className="p-4">
        <p className="text-[12.5px] font-semibold" style={{ color: V.ink }}>Portal branding</p>
        <p className="text-[10px]" style={{ color: V.inkFaint }}>Changes go live instantly.</p>

        <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: V.inkFaint }}>Brand colour</p>
        <div className="mt-2 flex gap-1.5">
          {SWATCHES.map((c, i) => (
            <motion.span key={c} className="grid h-6 w-6 place-items-center rounded-full"
              style={{ background: c, outline: i === 0 ? `2px solid ${V.ink}` : "none", outlineOffset: 2 }}
              {...enter(m, { scale: 0 }, { scale: 1 },
                { duration: 0.35, delay: 0.1 + i * 0.05, ease: EASE })}>
              {i === 0 && <Check className="h-3 w-3 text-white" />}
            </motion.span>
          ))}
        </div>

        <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: V.inkFaint }}>Web address</p>
        <span className="mt-1.5 flex items-center rounded-full px-2.5 py-1.5 text-[10.5px]"
          style={{ background: V.surface2 }}>
          <span className="font-semibold" style={{ color: V.ink }}>hopebridge</span>
          <span style={{ color: V.inkFaint }}>.org.au</span>
          <Check className="ml-auto h-3 w-3" style={{ color: V.success }} />
        </span>

        <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: V.inkFaint }}>Pages</p>
        <ul className="mt-1.5 grid gap-1">
          {PAGES.map((p) => (
            <li key={p} className="flex items-center gap-1.5 text-[10.5px]" style={{ color: V.inkSoft }}>
              <Check className="h-3 w-3 shrink-0" style={{ color: V.success }} />{p}
            </li>
          ))}
        </ul>
      </Panel>

      {/* Live preview of the donor-facing site — the point being that the donor
          never sees Donexus, they see the charity. */}
      <Panel className="overflow-hidden">
        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: V.line }}>
          <span className="text-[10px] font-semibold" style={{ color: V.inkFaint }}>Preview</span>
          <span className="ml-auto rounded-full px-2 py-[3px] text-[9.5px] font-semibold"
            style={{ background: "rgba(5,150,105,.10)", color: V.success }}>Published</span>
        </div>

        <div style={{ background: V.bg }}>
          {/* charity nav */}
          <div className="flex items-center gap-2 px-4 pb-2 pt-3">
            <span className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white"
              style={{ background: V.primary }}>H</span>
            <span className="text-[10.5px] font-bold" style={{ color: V.ink }}>Hope Bridge</span>
            <span className="ml-auto hidden gap-2 text-[9px] sm:flex" style={{ color: V.inkSoft }}>
              <span>About</span><span>Programs</span><span>Events</span>
            </span>
            <span className="rounded-full px-2 py-[3px] text-[9px] font-semibold text-white" style={{ background: V.primary }}>
              Donate
            </span>
          </div>

          {/* charity hero + donation form */}
          <div className="grid gap-2.5 px-4 pb-4 pt-2 sm:grid-cols-[1fr_.85fr]">
            <div>
              <p className="text-[15px] font-bold leading-[1.15] tracking-tight" style={{ color: V.ink }}>
                Clean water for<br />1,000 families.
              </p>
              <p className="mt-1.5 text-[9.5px] leading-relaxed" style={{ color: V.inkSoft }}>
                Every gift is matched this month by our partners.
              </p>
              <span aria-hidden className="mt-2.5 block h-[5px] w-full overflow-hidden rounded-full"
                style={{ background: "rgba(var(--tenant-primary-rgb), .12)" }}>
                <motion.span className="block h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }}
                  {...enter(m, { width: 0 }, { width: "72%" },
                    { duration: 1, delay: 0.25, ease: EASE })} />
              </span>
              <p className="mt-1 text-[9px] font-semibold" style={{ color: V.inkSoft }}>
                $36,120 raised of $50,000
              </p>
            </div>

            <Panel className="p-2.5">
              <p className="text-[9.5px] font-semibold" style={{ color: V.inkFaint }}>Choose an amount</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1">
                {["$25", "$50", "$100"].map((a, i) => (
                  <span key={a} className="grid place-items-center rounded-full py-1 text-[9.5px] font-semibold"
                    style={i === 1
                      ? { background: V.primary, color: "#fff" }
                      : { background: V.surface2, color: V.inkSoft }}>
                    {a}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                {["One-off", "Monthly"].map((a, i) => (
                  <span key={a} className="grid place-items-center rounded-full py-1 text-[9.5px] font-semibold"
                    style={i === 1
                      ? { background: V.surface2, color: V.primary, border: `1px solid ${V.line}` }
                      : { background: V.surface2, color: V.inkSoft }}>
                    {a}
                  </span>
                ))}
              </div>
              <span className="mt-2 grid place-items-center rounded-full py-1.5 text-[10px] font-bold text-white"
                style={{ background: V.primary }}>
                Give $50
              </span>
              <p className="mt-1.5 text-center text-[8.5px]" style={{ color: V.inkFaint }}>
                Secured by Stripe · Receipt sent instantly
              </p>
            </Panel>
          </div>
        </div>
      </Panel>
    </div>
  );
}

const PANES = { dashboard: DashboardPane, donations: DonationsPane, donors: DonorsPane, website: WebsitePane };

/* ── The frame ───────────────────────────────────────────────────────────── */

export default function ProductTour() {
  const [tab, setTab] = useState("dashboard");
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const tabRefs = useRef([]);

  // Passed to every pane; see enter(). `play` flips once the frame is actually
  // on screen so the bars and progress fills animate when you arrive at the
  // section rather than to an empty viewport.
  const m = { play: inView, reduce };

  const Pane = PANES[tab];
  const active = TABS.find((t) => t.id === tab);

  // Roving-tabindex keyboard support: ←/→ move between tabs, Home/End jump to
  // the ends. Without this the rail is a mouse-only control.
  const onKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = null;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div ref={ref}>
      {/* Tab rail. Doubles as a feature list — see TABS. */}
      <div role="tablist" aria-label="Product areas" onKeyDown={onKeyDown}
        className="mt-[clamp(28px,3vw,44px)] flex flex-wrap justify-center gap-2">
        {TABS.map((t, i) => {
          const on = t.id === tab;
          return (
            <button key={t.id} type="button" role="tab" id={`tour-tab-${t.id}`}
              ref={(el) => { tabRefs.current[i] = el; }}
              aria-selected={on} aria-controls={`tour-panel-${t.id}`} tabIndex={on ? 0 : -1}
              onClick={() => setTab(t.id)}
              className="relative inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold transition-colors"
              style={{
                color: on ? "#fff" : V.inkSoft,
                border: `1px solid ${on ? "transparent" : V.line}`,
                background: on ? "transparent" : V.surface,
              }}>
              {/* Shared layout pill — the fill slides between tabs rather than
                  cutting, which is what makes the rail feel like one control. */}
              {on && (
                <motion.span layoutId="tour-pill" aria-hidden className="absolute inset-0 rounded-full"
                  style={{ background: V.primary }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }} />
              )}
              <t.icon className="relative h-4 w-4" />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* One line of copy that changes with the tab, so the rail explains itself. */}
      <div className="mt-4 flex min-h-[22px] justify-center">
        <AnimatePresence mode="wait">
          <motion.p key={active.id} className="text-center text-[14.5px]" style={{ color: V.inkSoft }}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE }}>
            {active.blurb}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* App window */}
      <motion.div
        className="mx-auto mt-[clamp(24px,2.6vw,40px)] overflow-hidden rounded-[20px]"
        style={{
          background: V.surface,
          border: `1px solid ${V.line}`,
          boxShadow: "0 40px 80px -32px rgba(var(--tenant-primary-rgb), .28)",
        }}
        {...enter({ play: inView, reduce }, { opacity: 0, y: 28 }, { opacity: 1, y: 0 },
          { duration: 0.8, ease: EASE })}>

        {/* Browser chrome — the URL is the pitch: it's the charity's own domain. */}
        <div className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-4"
          style={{ borderColor: V.line, background: V.surface2 }}>
          <span aria-hidden className="flex gap-1.5">
            {["#F87171", "#FBBF24", "#34D399"].map((c) => (
              <span key={c} className="block h-[9px] w-[9px] rounded-full" style={{ background: c, opacity: 0.75 }} />
            ))}
          </span>
          <span className="mx-auto flex max-w-[280px] flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1"
            style={{ background: V.surface, border: `1px solid ${V.line}` }}>
            <span aria-hidden className="block h-[9px] w-[7px] rounded-[2px]"
              style={{ border: `1.5px solid ${V.success}`, borderTopWidth: 3, borderRadius: 2 }} />
            <span className="truncate text-[10.5px]" style={{ color: V.inkSoft }}>
              hopebridge.org.au<span style={{ color: V.inkFaint }}>/admin</span>
            </span>
          </span>
          <span aria-hidden className="w-[46px]" />
        </div>

        {/* App shell */}
        <div className="flex" style={{ minHeight: "clamp(340px, 34vw, 460px)" }}>
          {/* Sidebar — hidden under md; the panes carry the story on a phone and
              a 60px icon strip there would be decoration, not information. */}
          <aside aria-hidden className="hidden w-[172px] shrink-0 flex-col border-r p-3 md:flex"
            style={{ borderColor: V.line, background: V.surface2 }}>
            <div className="flex items-center gap-2 px-1.5 pb-3">
              <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                style={{ background: V.primary }}>H</span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-bold leading-tight" style={{ color: V.ink }}>Hope Bridge</span>
                <span className="block text-[9px] leading-tight" style={{ color: V.inkFaint }}>Admin Portal</span>
              </span>
            </div>

            <nav className="grid gap-[2px]">
              {RAIL.map((item) => {
                const on = item.tab === tab;
                return (
                  <span key={item.label}
                    className="flex items-center gap-2 rounded-full px-2.5 py-[7px] text-[11px] font-medium transition-colors"
                    style={on
                      ? { background: "rgba(var(--tenant-accent-rgb), .18)", color: V.primary, fontWeight: 600 }
                      : { color: V.inkSoft }}>
                    <item.icon className="h-[14px] w-[14px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                );
              })}
            </nav>
          </aside>

          {/* Main */}
          <div className="min-w-0 flex-1">
            {/* Topbar */}
            <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: V.line }}>
              <span className="text-[12.5px] font-bold" style={{ color: V.ink }}>{active.label}</span>
              <span className="ml-auto flex items-center gap-2">
                <Bell className="h-[15px] w-[15px]" style={{ color: V.inkFaint }} />
                <Avatar name="Sarah Mitchell" size={24} />
              </span>
            </div>

            {/* Pane */}
            <div className="p-3 sm:p-4" style={{ background: V.bg }}>
              <AnimatePresence mode="wait">
                <motion.div key={tab} role="tabpanel" id={`tour-panel-${tab}`} aria-labelledby={`tour-tab-${tab}`}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: EASE }}>
                  <Pane {...m} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
