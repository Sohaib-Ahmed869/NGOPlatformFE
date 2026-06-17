import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Target,
  Megaphone,
  Ticket,
  DollarSign,
  Receipt,
  ExternalLink,
  Wallet,
  ArrowLeft,
  Calendar,
  Hash,
  ShieldCheck,
  ChevronRight,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DonationService from "../../services/donation.service";
import GoFundMeService from "../../services/goFundMeService";
import publicEventsService from "../../services/publicEvents.service";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";

// Session cache of the merged rows so the screen paints instantly on revisit
// (stale-while-revalidate) — same approach as the profile / donations screens.
let _paymentsCache = null;

const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";
const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const PAID = new Set(["paid", "completed"]);

const statusMeta = (s) => {
  const v = (s || "").toLowerCase();
  if (PAID.has(v)) return { label: "Paid", cls: "bg-green-50 text-green-700" };
  if (v === "pending" || v === "processing") return { label: "Pending", cls: "bg-yellow-50 text-yellow-700" };
  if (v === "failed") return { label: "Failed", cls: "bg-red-50 text-red-700" };
  if (v === "refunded") return { label: "Refunded", cls: "bg-blue-50 text-blue-700" };
  if (v === "cancelled") return { label: "Cancelled", cls: "bg-gray-100 text-gray-600" };
  return { label: s || "—", cls: "bg-gray-100 text-gray-600" };
};

const TYPE_META = {
  program: { label: "Program", icon: Target, cls: "bg-accent/10 text-accent" },
  campaign: { label: "Fundraiser", icon: Megaphone, cls: "bg-violet-50 text-violet-600" },
  event: { label: "Event", icon: Ticket, cls: "bg-amber-50 text-amber-600" },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "program", label: "Programs" },
  { value: "campaign", label: "Fundraisers" },
  { value: "event", label: "Events" },
];

// Merge the three settled responses into one normalised, date-sorted list.
function buildRows([programsRes, campaignsRes, eventsRes]) {
  const out = [];

  if (programsRes.status === "fulfilled") {
    (programsRes.value?.orders || [])
      .filter((o) => o.donationType === "Program Donation" || o.programId)
      .forEach((o) =>
        out.push({
          id: `program-${o._id}`,
          type: "program",
          title: o.items?.[0]?.title || "Program donation",
          amount: o.totalAmount,
          status: o.paymentStatus,
          date: o.createdAt,
          receiptUrl: o.stripeReceiptUrl || "",
          reference: o.transactionDetails?.stripePaymentIntentId || o.donationId || "",
          method: o.paymentMethod,
        }),
      );
  }

  if (campaignsRes.status === "fulfilled") {
    (campaignsRes.value?.donations || []).forEach((d) =>
      out.push({
        id: `campaign-${d._id}`,
        type: "campaign",
        title: d.goFundMeId?.title || "Fundraiser donation",
        amount: d.amount,
        status: d.paymentStatus,
        date: d.createdAt,
        receiptUrl: d.stripeReceiptUrl || "",
        reference: d.stripePaymentIntentId || "",
        method: d.paymentMethod,
        message: d.message,
      }),
    );
  }

  if (eventsRes.status === "fulfilled") {
    (Array.isArray(eventsRes.value) ? eventsRes.value : [])
      .filter((r) => r.paymentStatus && r.paymentStatus !== "free")
      .forEach((r) =>
        out.push({
          id: `event-${r._id}`,
          type: "event",
          title: r.eventId?.title || "Event registration",
          amount: r.amountPaid,
          status: r.paymentStatus,
          date: r.createdAt,
          receiptUrl: r.stripeReceiptUrl || "",
          reference: r.stripePaymentIntentId || "",
          guests: r.numberOfGuests || 0,
          eventDate: r.eventId?.date,
        }),
      );
  }

  out.sort((a, b) => new Date(b.date) - new Date(a.date));
  return out;
}

export default function UserPayments() {
  const [rows, setRows] = useState(_paymentsCache || []);
  const [loading, setLoading] = useState(!_paymentsCache);
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let active = true;
    const cold = !_paymentsCache;
    (async () => {
      const work = Promise.allSettled([
        DonationService.getUserDonations(),
        GoFundMeService.getMyDonations(),
        publicEventsService.myRegistrations(),
      ]).then((results) => ({
        rows: buildRows(results),
        allFailed: results.every((r) => r.status === "rejected"),
      }));
      // Only delay (for a smooth loader) on a true cold load.
      const { rows: merged, allFailed } = cold ? await withMinDelay(work) : await work;
      if (!active) return;
      _paymentsCache = merged;
      setRows(merged);
      setLoading(false);
      if (allFailed) toast.error("Couldn't load your payments");
    })();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const c = { all: rows.length, program: 0, campaign: 0, event: 0 };
    rows.forEach((r) => (c[r.type] += 1));
    return c;
  }, [rows]);

  const totalPaid = useMemo(
    () => rows.filter((r) => PAID.has((r.status || "").toLowerCase())).reduce((s, r) => s + (r.amount || 0), 0),
    [rows],
  );

  if (detail) {
    return <PaymentDetail row={detail} onBack={() => setDetail(null)} />;
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader />
      </div>
    );
  }

  const visible = filter === "all" ? rows : rows.filter((r) => r.type === filter);

  return (
    <div className="w-full space-y-6">
      {/* Header card with gradient band + integrated stats (profile style) */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Payment history</p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-white">My Payments</h1>
          <p className="mt-1 text-sm text-white/80">Your programs, fundraisers and events — all in one place.</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <HeaderStat icon={DollarSign} label="Total paid" value={money(totalPaid)} />
          <HeaderStat icon={Wallet} label="Payments" value={rows.length} />
          <HeaderStat icon={CreditCard} label="Causes" value={new Set(rows.map((r) => r.title)).size} />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "relative isolate inline-flex items-center gap-1.5 border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
                active
                  ? "border-accent text-accent"
                  : "border-gray-200 bg-white text-text-muted hover:border-accent/40 hover:text-primary",
              )}
            >
              {active && (
                <motion.span
                  layoutId="paymentsFilterActive"
                  className="absolute inset-0 -z-10 bg-accent/10"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                />
              )}
              {f.label}
              <span className={cn("text-xs", active ? "text-accent/70" : "text-gray-400")}>{counts[f.value] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center bg-accent/10 text-accent">
            <Receipt className="h-6 w-6" />
          </span>
          <p className="font-medium text-primary">No payments yet</p>
          <p className="mt-1 text-sm text-text-muted">
            {filter === "all" ? "Your program, fundraiser and event payments will appear here." : "Nothing in this category yet."}
          </p>
        </div>
      ) : (
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden border border-gray-100 bg-white shadow-sm"
        >
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Payment</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right" />
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const t = TYPE_META[r.type];
                  const st = statusMeta(r.status);
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => setDetail(r)}
                      className="group cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-accent/[0.035]"
                    >
                      <td className="px-4 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium", t.cls)}>
                          <t.icon className="h-3.5 w-3.5" /> {t.label}
                        </span>
                      </td>
                      <td className="max-w-[280px] px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className={cn("grid h-9 w-9 shrink-0 place-items-center", t.cls)}>
                            <t.icon className="h-4 w-4" />
                          </span>
                          <p className="truncate font-semibold text-primary" title={r.title}>{r.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-heading text-base font-bold tabular-nums text-primary">{money(r.amount)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold", st.cls)}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-text-muted">{formatDate(r.date)}</td>
                      <td className="px-4 py-4 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-gray-100 md:hidden">
            {visible.map((r, i) => {
              const t = TYPE_META[r.type];
              const st = statusMeta(r.status);
              return (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => setDetail(r)}
                  className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/[0.035] active:scale-[0.99]"
                >
                  <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center", t.cls)}>
                    <t.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium text-primary">{r.title}</p>
                      <span className="shrink-0 font-heading font-bold tabular-nums text-primary">{money(r.amount)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold", st.cls)}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {st.label}
                      </span>
                      <span>{t.label}</span>
                      <span>· {formatDate(r.date)}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading text-lg font-bold leading-none text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

/* ── Individual payment detail ────────────────────────────────────────── */
function PaymentDetail({ row: r, onBack }) {
  const t = TYPE_META[r.type];
  const st = statusMeta(r.status);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full space-y-6">
      <button onClick={onBack} className="group inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to payments
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Summary with gradient band */}
          <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 px-6 py-6" style={{ background: HEADER_GRADIENT }}>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </span>
                <p className="mt-3 font-heading text-4xl font-bold text-white">{money(r.amount)}</p>
                <p className="mt-1 truncate text-sm text-white/80">{r.title}</p>
              </div>
              <span className={cn("inline-flex shrink-0 px-2.5 py-1 text-[11px] font-semibold", st.cls)}>{st.label}</span>
            </div>
          </div>

          {/* Details */}
          <div className="border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
                <t.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-primary">Payment details</h2>
                <p className="mt-0.5 text-sm text-text-muted">{t.label} payment</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <DetailItem icon={t.icon} label={t.label}>{r.title}</DetailItem>
              <DetailItem icon={DollarSign} label="Amount">{money(r.amount)}</DetailItem>
              <DetailItem icon={ShieldCheck} label="Status">
                <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-semibold", st.cls)}>{st.label}</span>
              </DetailItem>
              <DetailItem icon={Calendar} label="Date">{formatDate(r.date)}</DetailItem>
              {r.type === "event" && (
                <DetailItem icon={Users} label="Seats">
                  {1 + (r.guests || 0)}{r.guests > 0 ? ` (+${r.guests} guest${r.guests > 1 ? "s" : ""})` : ""}
                </DetailItem>
              )}
              {r.method && <DetailItem icon={CreditCard} label="Method"><span className="capitalize">{r.method === "bank" ? "Bank transfer" : r.method}</span></DetailItem>}
              <div className="sm:col-span-2">
                <DetailItem icon={Hash} label="Reference">
                  <span className="break-all font-mono text-xs">{r.reference || "—"}</span>
                </DetailItem>
              </div>
              {r.message && (
                <div className="sm:col-span-2">
                  <DetailItem icon={Receipt} label="Your message">
                    <span className="italic">“{r.message}”</span>
                  </DetailItem>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — receipt */}
        <div className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Receipt</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-accent/10 text-accent">
                  <Receipt className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-lg font-bold text-primary">{money(r.amount)}</p>
                  <p className="text-xs text-text-muted">{formatDate(r.date)}</p>
                </div>
              </div>
              {r.receiptUrl ? (
                <a
                  href={r.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
                >
                  <Receipt className="h-4 w-4" /> View receipt <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="mt-5 bg-gray-50 px-3 py-2.5 text-center text-xs text-text-muted">No downloadable receipt for this payment.</p>
              )}
            </div>

            <div className="flex items-start gap-3 border border-emerald-100 bg-emerald-50/50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-xs leading-relaxed text-emerald-800">Thank you for your generosity — your contribution goes directly to the cause.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DetailItem({ icon: Icon, label, children }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        <Icon className="h-3.5 w-3.5 text-accent" /> {label}
      </p>
      <div className="mt-0.5 text-primary">{children}</div>
    </div>
  );
}
