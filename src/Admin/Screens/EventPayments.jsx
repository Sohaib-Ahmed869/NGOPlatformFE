import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  DollarSign,
  CheckCircle,
  Clock,
  RotateCcw,
  Ticket,
  CalendarDays,
  Users,
  Mail,
  Phone,
  Hash,
  MessageSquare,
  Receipt,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import PageHeader from "../components/PageHeader";
import eventsService from "../../services/events.service";
import { cn } from "../../utils/cn";

const ITEMS_PER_PAGE = 10;

const DEFAULT_STATS = { paidCount: 0, pendingCount: 0, refundedCount: 0, totalCollected: 0, currency: "AUD" };
const DEFAULT_PAGINATION = { total: 0, pages: 0, currentPage: 1 };

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "refunded", label: "Refunded" },
];

const formatMoney = (amount, currency = "AUD") => {
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(amount || 0);
  } catch {
    return `$${Number(amount || 0).toFixed(2)} ${currency}`;
  }
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" }) : "—";

const statusStyle = (s) => {
  const m = {
    paid: "bg-green-50 text-green-700",
    pending: "bg-yellow-50 text-yellow-700",
    refunded: "bg-blue-50 text-blue-700",
  };
  return m[s] || "bg-gray-100 text-gray-600";
};

const fadeWrap = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/* ── Sharp stat tile (matches Campaign / Program Payments) ────────────── */
function StatCard({ icon: Icon, label, value, tone = "accent" }) {
  const tones = {
    accent: "bg-accent/10 text-accent",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="flex items-center gap-3 border border-gray-100 bg-white p-3.5 shadow-sm">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center", tones[tone])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-primary" title={String(value)}>
          {value}
        </p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  return (
    <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-semibold capitalize", statusStyle(status))}>
      {status}
    </span>
  );
}

export default function EventPayments() {
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ ...DEFAULT_PAGINATION });
  const [stats, setStats] = useState({ ...DEFAULT_STATS });

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [eventOptions, setEventOptions] = useState([{ value: "all", label: "All events" }]);

  const [detail, setDetail] = useState(null);

  // Paid events for the event filter dropdown.
  useEffect(() => {
    eventsService
      .getAll()
      .then((data) => {
        const opts = (data?.events || [])
          .filter((e) => e.isPaid)
          .map((e) => ({ value: e._id, label: e.title }));
        setEventOptions([{ value: "all", label: "All events" }, ...opts]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await eventsService.listPayments({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchTerm,
          paymentStatus: selectedStatus,
          eventId: selectedEvent,
        });
        if (!active) return;
        setPayments(res?.data?.payments || []);
        setPagination(res?.data?.pagination || DEFAULT_PAGINATION);
        setStats(res?.data?.stats || DEFAULT_STATS);
      } catch {
        if (active) toast.error("Failed to load event payments");
      } finally {
        if (active) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    };
    fetchPayments();
    return () => {
      active = false;
    };
  }, [currentPage, searchTerm, selectedStatus, selectedEvent]);

  const onFilter = (setter) => (value) => {
    setCurrentPage(1);
    setter(value);
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const res = await eventsService.listPayments({
        page: 1,
        limit: 5000,
        search: searchTerm,
        paymentStatus: selectedStatus,
        eventId: selectedEvent,
      });
      const rows = res?.data?.payments || [];
      if (!rows.length) {
        toast.error("No payments to export");
        return;
      }
      const esc = (f) => {
        if (f === null || f === undefined) return "";
        const s = String(f);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const headers = ["Registrant", "Email", "Phone", "Event", "Amount", "Currency", "Seats", "Status", "Stripe Payment Intent", "Receipt URL", "Date"].join(",");
      const lines = rows.map((p) =>
        [
          esc(p.name),
          esc(p.email),
          esc(p.phone),
          esc(p.event?.title || ""),
          p.amountPaid ?? 0,
          esc(p.currency),
          1 + (p.numberOfGuests || 0),
          esc(p.paymentStatus),
          esc(p.stripePaymentIntentId),
          esc(p.stripeReceiptUrl),
          esc(new Date(p.createdAt).toLocaleString()),
        ].join(","),
      );
      const csv = [headers, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `event_payments_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch {
      toast.error("Failed to export payments");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading && initialLoad) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader />
      </div>
    );
  }

  if (detail) {
    return <PaymentDetail payment={detail} onBack={() => setDetail(null)} />;
  }

  const filtersActive = !!searchTerm || selectedStatus !== "all" || selectedEvent !== "all";

  return (
    <div className="lg:p-6 mt-20 lg:mt-0">
      <PageHeader
        eyebrow="Events"
        title="Event Payments"
        subtitle={`${pagination.total || 0} payment${pagination.total === 1 ? "" : "s"} for your paid events`}
        actions={
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </button>
        }
      />

      <div className="space-y-5">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={DollarSign} label="Total collected" value={formatMoney(stats.totalCollected, stats.currency)} tone="green" />
          <StatCard icon={CheckCircle} label="Paid" value={stats.paidCount} tone="accent" />
          <StatCard icon={Clock} label="Pending" value={stats.pendingCount} tone="amber" />
          <StatCard icon={RotateCcw} label="Refunded" value={stats.refundedCount} tone="blue" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => {
                setCurrentPage(1);
                setSearchTerm(e.target.value);
              }}
              placeholder="Search by name or email…"
              className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
            />
          </div>
          <CustomSelect
            value={selectedStatus}
            onChange={onFilter(setSelectedStatus)}
            options={STATUS_OPTIONS}
            triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            className="sm:min-w-[150px]"
          />
          <CustomSelect
            value={selectedEvent}
            onChange={onFilter(setSelectedEvent)}
            options={eventOptions}
            searchable={eventOptions.length > 8}
            triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            className="sm:min-w-[180px]"
          />
        </div>

        {/* Table */}
        <div className="relative">
          {loading && !initialLoad && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 text-sm font-medium text-accent">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {payments.length === 0 && !loading ? (
              <motion.div
                key="empty"
                variants={fadeWrap}
                initial="hidden"
                animate="show"
                exit="exit"
                className="border border-gray-100 bg-white p-12 text-center shadow-sm"
              >
                <Ticket className="mx-auto mb-3 h-10 w-10 text-text-muted" />
                <p className="font-medium text-primary">No payments found</p>
                <p className="mt-1 text-sm text-text-muted">
                  {filtersActive ? "Try adjusting your filters." : "No event payments have been made yet."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={`table-${currentPage}-${selectedStatus}-${selectedEvent}`}
                variants={fadeWrap}
                initial="hidden"
                animate="show"
                exit="exit"
                className="overflow-hidden border border-gray-100 bg-white shadow-sm"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        <th className="px-4 py-3">Registrant</th>
                        <th className="px-4 py-3">Event</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Seats</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const initial = (p.name || "?").trim().charAt(0).toUpperCase();
                        const seats = 1 + (p.numberOfGuests || 0);
                        return (
                          <tr
                            key={p._id}
                            onClick={() => setDetail(p)}
                            className="cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/60"
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                                  {initial}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-primary">{p.name}</p>
                                  <p className="truncate text-xs text-text-muted">{p.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="max-w-[200px] px-4 py-2.5">
                              <p className="truncate text-primary">{p.event?.title || "—"}</p>
                              {p.event?.date && <p className="text-xs text-text-muted">{formatDate(p.event.date)}</p>}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-primary">{formatMoney(p.amountPaid, p.currency)}</td>
                            <td className="px-4 py-2.5 text-text-muted">
                              {seats}
                              {p.numberOfGuests > 0 && <span className="text-xs"> (+{p.numberOfGuests})</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusPill status={p.paymentStatus} />
                            </td>
                            <td className="px-4 py-2.5 text-text-muted">{formatDate(p.createdAt)}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                {p.stripeReceiptUrl && (
                                  <a
                                    href={p.stripeReceiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="View Stripe receipt"
                                    className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                                  >
                                    <Receipt className="h-4 w-4" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setDetail(p)}
                                  title="View details"
                                  className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <span className="text-xs text-text-muted">
              Showing {pagination.total ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–
              {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pg;
                if (pagination.pages <= 5) pg = i + 1;
                else if (currentPage <= 3) pg = i + 1;
                else if (currentPage >= pagination.pages - 2) pg = pagination.pages - (4 - i);
                else pg = currentPage - 2 + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={cn(
                      "grid h-8 w-8 place-items-center text-xs font-medium transition-colors",
                      currentPage === pg ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100",
                    )}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.pages}
                className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Full-screen payment detail "page" ────────────────────────────────── */
function PaymentDetail({ payment: p, onBack }) {
  const seats = 1 + (p.numberOfGuests || 0);
  const answers = p.answers && typeof p.answers === "object" ? Object.entries(p.answers) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="lg:p-6 mt-20 lg:mt-0">
      <button onClick={onBack} className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to payments
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Summary */}
          <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div className="min-w-0">
                <StatusPill status={p.paymentStatus} />
                <p className="mt-3 font-heading text-4xl font-bold text-primary">{formatMoney(p.amountPaid, p.currency)}</p>
                <p className="mt-1 truncate text-sm text-text-muted">
                  Payment for <span className="font-medium text-primary">{p.event?.title || "—"}</span>
                </p>
              </div>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Ticket className="h-7 w-7" />
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100 p-6 text-center">
              <div className="px-2">
                <p className="font-heading text-lg font-bold text-primary">{seats}</p>
                <p className="text-[11px] uppercase tracking-wide text-text-muted">{seats === 1 ? "Seat" : "Seats"}</p>
              </div>
              <div className="px-2">
                <p className="font-heading text-lg font-bold text-primary">{p.numberOfGuests || 0}</p>
                <p className="text-[11px] uppercase tracking-wide text-text-muted">Guests</p>
              </div>
              <div className="px-2">
                <p className="font-heading text-lg font-bold text-primary">{formatDate(p.event?.date)}</p>
                <p className="text-[11px] uppercase tracking-wide text-text-muted">Event date</p>
              </div>
            </div>
          </div>

          {/* Registrant & details */}
          <div className="border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 font-heading text-lg font-bold text-primary">Registrant &amp; details</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <DetailItem icon={Ticket} label="Registrant">{p.name || "—"}</DetailItem>
              <DetailItem icon={Mail} label="Email">
                {p.email ? <a href={`mailto:${p.email}`} className="break-all text-accent hover:underline">{p.email}</a> : "—"}
              </DetailItem>
              <DetailItem icon={Phone} label="Phone">
                {p.phone ? <a href={`tel:${p.phone}`} className="text-accent hover:underline">{p.phone}</a> : "—"}
              </DetailItem>
              <DetailItem icon={CalendarDays} label="Paid on">{formatDate(p.createdAt)}</DetailItem>
              <div className="sm:col-span-2">
                <DetailItem icon={Hash} label="Stripe Payment Intent">
                  <span className="break-all font-mono text-xs">{p.stripePaymentIntentId || "—"}</span>
                </DetailItem>
              </div>
            </div>
          </div>

          {/* Registration answers */}
          {answers.length > 0 && (
            <div className="border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-primary">
                <MessageSquare className="h-4 w-4 text-accent" /> Registration answers
              </h2>
              <div className="divide-y divide-gray-50">
                {answers.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                    <span className="text-text-muted">{k}</span>
                    <span className="text-right text-primary">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — receipt */}
        <div className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Receipt</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Receipt className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-lg font-bold text-primary">{formatMoney(p.amountPaid, p.currency)}</p>
                  <p className="text-xs capitalize text-text-muted">Card · {p.paymentStatus}</p>
                </div>
              </div>
              {p.stripeReceiptUrl ? (
                <a
                  href={p.stripeReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                >
                  <Receipt className="h-4 w-4" /> View Stripe receipt <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="mt-5 bg-gray-50 px-3 py-2.5 text-center text-xs text-text-muted">No hosted receipt for this payment.</p>
              )}
            </div>

            <div className="flex items-start gap-3 border border-emerald-100 bg-emerald-50/50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-xs leading-relaxed text-emerald-800">
                Paid securely by card via the organisation's Stripe account. The registration is confirmed for {seats} {seats === 1 ? "seat" : "seats"}.
              </p>
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
