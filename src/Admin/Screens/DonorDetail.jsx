import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Heart,
  TrendingUp,
  Hash,
  Cake,
  Globe,
  Gift,
  Repeat,
  Layers,
  User,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import donorsService from "../../services/donors.service";
import { HEADER_GRADIENT, money, fmtDate } from "./donorUtils";
import { HeaderStat, Avatar, TypeChip } from "./donorShared";

function SectionCard({ title, icon: Icon, right, className, children }) {
  return (
    <div className={cn("overflow-hidden border border-gray-100 bg-white shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
          {Icon && <Icon className="h-4 w-4 text-accent" />} {title}
        </h2>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted/70" />}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-text-muted/70">{label}</p>
        <p className="break-words font-medium text-gray-800">{value || "—"}</p>
      </div>
    </div>
  );
}

const TYPE_ROWS = [
  { key: "one-time", label: "One-time", color: "#10B981", icon: Gift },
  { key: "recurring", label: "Recurring", color: "#8B5CF6", icon: Repeat },
  { key: "installments", label: "Installments", color: "#F59E0B", icon: Layers },
];

const donationPill = (s) =>
  (s || "").toLowerCase() === "completed" || (s || "").toLowerCase() === "succeeded"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-amber-50 text-amber-700";

function ChartTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const p = payload[0]?.payload;
    return (
      <div className="border border-gray-200 bg-white p-3 shadow-md">
        <p className="text-xs font-medium text-primary">
          {p?.fullDate ? p.fullDate.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : ""}
        </p>
        <p className="mt-1 font-bold text-accent">{money(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

const DonorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const passed = location.state?.donor || null;
  const cameFromList = !!passed;
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const req = donorsService.details(id);
        const res = await (cameFromList ? req : withMinDelay(req));
        if (!alive) return;
        if (res?.data) setDonor(res.data);
        else setNotFound(true);
      } catch (err) {
        if (!alive) return;
        toast.error(err?.response?.data?.message || "Failed to load donor");
        setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const back = () => navigate("/admin/donors");

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading donor…" />
      </div>
    );
  }

  if (notFound || !donor) {
    return (
      <div className="w-full space-y-6">
        <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent">
          <ArrowLeft className="h-4 w-4" /> Back to donors
        </button>
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
            <User className="h-6 w-6" />
          </span>
          <p className="font-semibold text-gray-800">Donor not found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">This donor may have been removed.</p>
        </div>
      </div>
    );
  }

  // Merge any extra fields passed from the list (e.g. country/DOB) as a fallback.
  const d = { ...(passed || {}), ...donor };
  const history = donor.donationHistory || [];
  const total = donor.totalDonations || 0;
  const count = donor.donationCount ?? history.length;
  const average = count > 0 ? total / count : 0;

  const chartData = history
    .filter((h) => h.date)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((h) => ({ ...h, fullDate: new Date(h.date), label: new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }));

  const breakdown = donor.typeBreakdown || {};
  const maxTypeAmount = Math.max(1, ...TYPE_ROWS.map((t) => breakdown[t.key]?.amount || 0));

  return (
    <motion.div className="w-full space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
      {/* Back */}
      <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> Back to donors
      </button>

      {/* Header card with gradient band + integrated stats */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={d.name} size="lg" onGradient />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Donor</p>
              <h1 className="mt-0.5 truncate font-heading text-2xl font-bold text-white">{d.name || "Anonymous"}</h1>
              <p className="mt-0.5 truncate text-sm text-white/80">{d.email || "—"}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {d.donationType && <TypeChip type={d.donationType} />}
            {d.id && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-white/70" title={String(d.id)}>
                <Hash className="h-3.5 w-3.5" /> {String(d.id).slice(-8)}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <HeaderStat icon={DollarSign} label="Total donated" value={money(total)} />
          <HeaderStat icon={Heart} label="Donations" value={count} />
          <HeaderStat icon={TrendingUp} label="Average gift" value={money(average)} />
          <HeaderStat icon={Clock} label="Last donation" value={fmtDate(d.lastDonationDate)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-1">
          <SectionCard title="Contact" icon={User}>
            <div className="space-y-4">
              <InfoRow icon={Mail} label="Email" value={d.email} />
              <InfoRow icon={Phone} label="Phone" value={d.phone} />
              <InfoRow icon={MapPin} label="Address" value={d.fullAddress} />
              {d.country && <InfoRow icon={Globe} label="Country" value={d.country} />}
              {d.dateOfBirth && <InfoRow icon={Cake} label="Date of birth" value={fmtDate(d.dateOfBirth)} />}
              <InfoRow icon={Calendar} label="First donation" value={fmtDate(d.firstDonationDate)} />
            </div>
          </SectionCard>

          <SectionCard title="Giving breakdown" icon={TrendingUp}>
            {count === 0 ? (
              <p className="text-sm text-text-muted">No donations recorded yet.</p>
            ) : (
              <ul className="space-y-4">
                {TYPE_ROWS.map((t) => {
                  const b = breakdown[t.key] || { count: 0, amount: 0 };
                  const pct = maxTypeAmount > 0 ? Math.round((b.amount / maxTypeAmount) * 100) : 0;
                  return (
                    <li key={t.key}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="inline-flex items-center gap-2 font-medium text-primary">
                          <span className="grid h-6 w-6 place-items-center" style={{ background: `${t.color}14`, color: t.color }}>
                            <t.icon className="h-3.5 w-3.5" />
                          </span>
                          {t.label}
                        </span>
                        <span className="shrink-0 font-semibold text-primary">{money(b.amount)}</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} />
                      </div>
                      <p className="mt-1 text-[11px] text-text-muted">{b.count} donation{b.count === 1 ? "" : "s"}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {chartData.length > 0 && (
            <SectionCard title="Donation history" icon={TrendingUp} right={<span className="text-xs text-text-muted">{chartData.length} payments</span>}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={50} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#e2e8f0" }} />
                    <Line type="monotone" dataKey="amount" stroke="var(--tenant-accent, #C9A84C)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Recent donations" icon={Heart} right={<span className="text-xs text-text-muted">{history.length} total</span>}>
            {history.length === 0 ? (
              <p className="text-sm text-text-muted">No donations recorded yet.</p>
            ) : (
              <ul className="-my-1 divide-y divide-gray-50">
                {history.slice(0, 12).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent"><DollarSign className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">{h.cause || "Donation"}</p>
                        <p className="text-[11px] text-text-muted">
                          {new Date(h.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                          {h.type ? ` · ${h.type}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={cn("px-2 py-0.5 text-[10px] font-semibold capitalize", donationPill(h.status))}>{h.status}</span>
                      <span className="min-w-[64px] text-right text-sm font-semibold text-primary">{money(h.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </motion.div>
  );
};

export default DonorDetail;
