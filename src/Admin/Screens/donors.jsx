import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TabLoader } from "../../components/TabLoader";
import {
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  DollarSign,
  Heart,
  TrendingUp,
  Download,
  Loader2,
  Eye,
} from "lucide-react";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import donorsService from "../../services/donors.service";
import { HEADER_GRADIENT, money, fmtDate, fmtShort, mapDonors, mapStats } from "./donorUtils";
import { HeaderStat, Avatar, TypeChip } from "./donorShared";

const ITEMS_PER_PAGE = 10;

const TYPE_PILLS = [
  { value: "All", label: "All" },
  { value: "single", label: "One-time" },
  { value: "recurring", label: "Recurring" },
  { value: "installments", label: "Installments" },
];

/* ── Motion ──────────────────────────────────────────────────────────────── */
const fadeWrap = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const listContainer = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } };
const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function SortableTh({ label, sortKey, sortConfig, onSort, className }) {
  const active = sortConfig.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sortConfig.direction === "asc" ? ChevronUp : ChevronDown;
  return (
    <th className={cn("px-4 py-3.5", className)}>
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-primary">
        {label}
        <Icon className={cn("h-3 w-3", active ? "text-accent" : "text-gray-300")} />
      </button>
    </th>
  );
}

/* ── CSV export (full field set) ─────────────────────────────────────────── */
const exportToCSV = (donors) => {
  if (!donors || donors.length === 0) {
    alert("No donors available for export!");
    return;
  }
  const headers = [
    "Donor ID", "Name", "First Name", "Last Name", "Email", "Phone", "Full Address", "Street", "City", "State",
    "Postal Code", "Country", "Date of Birth", "Total Donated", "Donation Count", "First Donation Date",
    "Last Donation Date", "Donation Type", "Donation Types",
  ];
  const formatDate = (s) => {
    if (!s) return "";
    try {
      return new Date(s).toLocaleDateString();
    } catch {
      return "";
    }
  };
  const csvRows = donors.map((donor) => [
    donor.id || "",
    `"${donor.name || ""}"`,
    `"${donor.firstName || ""}"`,
    `"${donor.lastName || ""}"`,
    donor.email || "",
    donor.phone || "",
    `"${donor.fullAddress || ""}"`,
    `"${donor.address?.street || ""}"`,
    `"${donor.address?.city || ""}"`,
    `"${donor.address?.state || ""}"`,
    donor.address?.postalCode || "",
    `"${donor.country || ""}"`,
    formatDate(donor.dateOfBirth) || "",
    (donor.totalDonated || 0).toFixed(2),
    donor.donationCount || 0,
    formatDate(donor.firstDonationDate) || "",
    formatDate(donor.lastDonationDate) || "",
    donor.donationType || "",
    `"${(donor.donationTypes || []).join(", ")}"`,
  ]);
  const csvContent = "﻿" + [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `donors_export_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* ── Card / row / mobile ─────────────────────────────────────────────────── */
function DonorCard({ donor, onView }) {
  return (
    <motion.div
      variants={cardVariants}
      onClick={() => onView(donor)}
      className="group flex cursor-pointer flex-col border border-gray-100 bg-white shadow-sm transition-all hover:border-accent/30 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={donor.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-primary" title={donor.name}>{donor.name}</p>
            <p className="truncate text-xs text-text-muted" title={donor.email}>{donor.email}</p>
          </div>
        </div>
        <TypeChip type={donor.donationType} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-heading text-3xl font-bold leading-tight text-accent">{money(donor.totalDonated)}</p>
        <p className="mt-0.5 text-xs text-text-muted">Total donated</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 text-sm">
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">Donations</dt>
            <dd className="mt-0.5 font-medium text-gray-800">{donor.donationCount || 0}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">Last gift</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-gray-800">
              <Calendar className="h-4 w-4 shrink-0 text-accent" /> {fmtShort(donor.lastDonationDate)}
            </dd>
          </div>
        </dl>
        <div className="mt-auto pt-5">
          <span className="inline-flex w-full items-center justify-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors group-hover:border-accent/50 group-hover:text-accent">
            <Eye className="h-4 w-4" /> View profile
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function DonorRow({ donor, onView }) {
  return (
    <motion.tr
      variants={rowVariants}
      onClick={() => onView(donor)}
      className="group cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-accent/[0.035]"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={donor.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-primary">{donor.name}</p>
            <p className="max-w-[220px] truncate text-xs text-text-muted">{donor.email}</p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <span className="font-heading text-base font-bold tabular-nums text-primary">{money(donor.totalDonated)}</span>
      </td>
      <td className="px-4 py-4">
        <TypeChip type={donor.donationType} />
      </td>
      <td className="px-4 py-4 text-text-muted">{donor.donationCount || 0}</td>
      <td className="whitespace-nowrap px-4 py-4 text-text-muted">{fmtDate(donor.lastDonationDate)}</td>
      <td className="px-4 py-4 text-right">
        <button
          type="button"
          title="View profile"
          onClick={(e) => {
            e.stopPropagation();
            onView(donor);
          }}
          className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent group-hover:text-accent"
        >
          <Eye className="h-4 w-4" />
        </button>
      </td>
    </motion.tr>
  );
}

function DonorMobile({ donor, onView }) {
  return (
    <motion.div variants={rowVariants} onClick={() => onView(donor)} className="cursor-pointer p-4 transition-colors hover:bg-accent/[0.035]">
      <div className="flex items-start gap-3">
        <Avatar name={donor.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-primary">{donor.name}</p>
              <p className="truncate text-xs text-text-muted">{donor.email}</p>
            </div>
            <span className="shrink-0 font-heading text-base font-bold tabular-nums text-primary">{money(donor.totalDonated)}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <TypeChip type={donor.donationType} />
            <span className="text-xs text-text-muted">{donor.donationCount || 0} gifts · {fmtShort(donor.lastDonationDate)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const DonorsPage = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "totalDonated", direction: "desc" });
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem("adminDonorsView") || "table";
    } catch {
      return "table";
    }
  });
  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem("adminDonorsView", v);
    } catch {
      /* ignore */
    }
  };
  const [isExporting, setIsExporting] = useState(false);

  const cachedList = donorsService.getCachedList();
  const cachedStats = donorsService.getCachedStats();
  const [donors, setDonors] = useState(cachedList ? mapDonors(cachedList) : []);
  const [stats, setStats] = useState(
    cachedStats ? mapStats(cachedStats) : { totalAmount: 0, averageDonation: 0, recurringDonations: 0, totalDonors: 0 },
  );
  const [pagination, setPagination] = useState(
    cachedList ? cachedList.data.pagination : { total: 0, pages: 0, currentPage: 1, perPage: ITEMS_PER_PAGE },
  );
  const [selectedType, setSelectedType] = useState("All");
  const [isLoading, setIsLoading] = useState(!cachedList);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (donorsService.getCachedStats()) return;
    donorsService
      .stats()
      .then((data) => setStats(mapStats(data)))
      .catch((err) => {
        setError("Failed to load dashboard statistics");
        console.error(err);
      });
  }, []);

  useEffect(() => {
    const loadDonors = async () => {
      setIsLoading(true);
      try {
        const cachedBefore = donorsService.getCachedList();
        const promise = donorsService.list({ page: currentPage, search: searchTerm, sortConfig, type: selectedType });
        const data = cachedBefore ? await promise : await withMinDelay(promise);
        setDonors(mapDonors(data));
        setPagination(data.data.pagination);
      } catch (err) {
        setError("Failed to load donors");
        console.error(err);
      }
      setIsLoading(false);
    };
    const t = setTimeout(loadDonors, 300);
    return () => clearTimeout(t);
  }, [currentPage, searchTerm, sortConfig, selectedType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType]);

  const handleExportDonors = async () => {
    setIsExporting(true);
    try {
      const allDonors = await donorsService.exportAll({ search: searchTerm, sortConfig, type: selectedType });
      const mapped = allDonors.map((donor) => ({
        ...donor,
        id: donor._id,
        totalDonated: donor.totalPaid,
        lastDonationDate: donor.lastDonationDate || donor.lastDonation,
        fullAddress: donor.fullAddress ?? donor.formattedAddress ?? "",
      }));
      exportToCSV(mapped);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export donors. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc" });
  };

  const openDonor = (donor) => navigate(`/admin/donors/${donor.id}`, { state: { donor } });

  if (error && donors.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-3 text-red-500">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-light">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && donors.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading donors…" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header card with gradient band + integrated stats */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Supporters</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-white">Donors</h1>
            <p className="mt-1 text-sm text-white/80">Everyone who has supported your organisation, in one place.</p>
          </div>
          <button
            type="button"
            onClick={handleExportDonors}
            disabled={isExporting || donors.length === 0}
            className="inline-flex shrink-0 items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
          </button>
        </div>
        <div className="grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <HeaderStat icon={Users} label="Total donors" value={(stats.totalDonors || 0).toLocaleString()} />
          <HeaderStat icon={DollarSign} label="Total donations" value={money(stats.totalAmount)} />
          <HeaderStat icon={TrendingUp} label="Average donation" value={money(stats.averageDonation)} />
          <HeaderStat icon={Heart} label="Recurring donors" value={(stats.recurringDonations || 0).toLocaleString()} />
        </div>
      </div>

      {/* Controls — search + type pills + view toggle on one line */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search donors by name or email…"
            className="w-full border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TYPE_PILLS.map((p) => {
            const active = selectedType === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setSelectedType(p.value)}
                className={cn(
                  "relative isolate inline-flex items-center border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
                  active ? "border-accent text-accent" : "border-gray-200 bg-white text-text-muted hover:border-accent/40 hover:text-primary",
                )}
              >
                {active && (
                  <motion.span layoutId="donorsTypeActive" className="absolute inset-0 -z-10 bg-accent/10" transition={{ type: "spring", stiffness: 500, damping: 34 }} />
                )}
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="inline-flex shrink-0 border border-gray-200">
          {[
            { id: "table", Icon: List, title: "List view" },
            { id: "grid", Icon: LayoutGrid, title: "Card view" },
          ].map((v, idx) => {
            const activeView = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => changeView(v.id)}
                title={v.title}
                className={cn(
                  "relative isolate grid h-10 w-10 place-items-center transition-colors duration-200",
                  idx > 0 && "border-l border-gray-200",
                  activeView ? "text-white" : "text-text-muted hover:text-accent",
                )}
              >
                {activeView && (
                  <motion.span layoutId="donorsViewActive" className="absolute inset-0 -z-10 bg-accent" transition={{ type: "spring", stiffness: 500, damping: 34 }} />
                )}
                <v.Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {donors.length === 0 ? (
          <motion.div key="empty" variants={fadeWrap} initial="hidden" animate="show" exit="exit" className="border border-gray-100 bg-white p-12 text-center shadow-sm">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
              <Users className="h-6 w-6" />
            </span>
            <p className="font-semibold text-gray-800">No donors found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
              {searchTerm || selectedType !== "All" ? "Try adjusting your search or filter." : "Donors will appear here as donations come in."}
            </p>
          </motion.div>
        ) : view === "grid" ? (
          <motion.div key={`grid-${pagination.currentPage}`} variants={gridContainer} initial="hidden" animate="show" exit="exit" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {donors.map((d) => (
              <DonorCard key={d.id} donor={d} onView={openDonor} />
            ))}
          </motion.div>
        ) : (
          <motion.div key={`table-${pagination.currentPage}`} variants={fadeWrap} initial="hidden" animate="show" exit="exit" className="overflow-hidden border border-gray-100 bg-white shadow-sm">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                    <SortableTh label="Donor" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTh label="Donated" sortKey="totalDonated" sortConfig={sortConfig} onSort={handleSort} />
                    <th className="px-4 py-3.5 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3.5 uppercase tracking-wider">Gifts</th>
                    <SortableTh label="Last donation" sortKey="lastDonationDate" sortConfig={sortConfig} onSort={handleSort} />
                    <th className="px-4 py-3.5 text-right uppercase tracking-wider">View</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer}>
                  {donors.map((d) => (
                    <DonorRow key={d.id} donor={d} onView={openDonor} />
                  ))}
                </motion.tbody>
              </table>
            </div>
            <motion.div variants={listContainer} className="divide-y divide-gray-50 md:hidden">
              {donors.map((d) => (
                <DonorMobile key={d.id} donor={d} onView={openDonor} />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs text-text-muted">
            Showing {(pagination.currentPage - 1) * pagination.perPage + 1}–
            {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
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
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={cn("h-8 w-8 text-xs font-medium transition-colors", currentPage === pg ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100")}
                >
                  {pg}
                </button>
              );
            })}
            <button
              type="button"
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
  );
};

export default DonorsPage;
