//donors.jsx
import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../components/Portal";
import { CustomSelect } from "../../components/CustomSelect";
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
  X,
  User,
  Users,
  Mail,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  Heart,
  TrendingUp,
  Download,
  Loader2,
  Eye,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import donorsService from "../../services/donors.service";

const ITEMS_PER_PAGE = 10;

const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—";
const fmtFull = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const money = (n) => `$${Number(n || 0).toLocaleString()}`;

// Map a donors-list API payload to the shape the UI/table expects.
const mapDonors = (data) =>
  data.data.donors.map((donor) => ({
    ...donor,
    id: donor._id,
    totalDonated: donor.totalPaid,
    lastDonationDate: donor.lastDonationDate || donor.lastDonation, // fallback if needed
  }));

// Map the dashboard-stats payload to the KPI shape.
const mapStats = (data) => ({
  totalDonors: data.data.stats.totalDonors || 0,
  totalAmount: data.data.stats.totalDonations || 0,
  averageDonation: data.data.stats.averageDonation || 0,
  recurringDonations: data.data.stats.recurringDonations || 0,
});

// Entrance/exit motion — a coordinated stagger so cards/rows appear smoothly,
// plus a clean cross-fade when switching between grid and list (the content is
// keyed by view+page, so it replays on open, view-switch and pagination).
const fadeWrap = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function StatCard({ icon: Icon, label, value, tone = "accent" }) {
  const tones = {
    accent: "bg-accent/10 text-accent",
    muted: "bg-gray-100 text-gray-500",
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

const TYPE_TONES = {
  recurring: "bg-accent/10 text-accent",
  installments: "bg-primary/10 text-primary",
};
function TypeBadge({ type }) {
  const t = type || "one-time";
  return (
    <span
      className={cn(
        "shrink-0 px-2 py-0.5 text-[10px] font-semibold capitalize",
        TYPE_TONES[t] || "bg-gray-100 text-gray-600",
      )}
    >
      {t}
    </span>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="border border-gray-100 bg-gray-50 p-2.5 text-center">
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-primary">{value}</p>
    </div>
  );
}

function SortableTh({ label, sortKey, sortConfig, onSort, className }) {
  const active = sortConfig.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sortConfig.direction === "asc" ? ChevronUp : ChevronDown;
  return (
    <th className={cn("px-4 py-3", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-primary"
      >
        {label}
        <Icon className={cn("h-3 w-3", active ? "text-accent" : "text-gray-300")} />
      </button>
    </th>
  );
}

const exportToCSV = (donors) => {
  // If no donors are passed, alert the user and exit.
  if (!donors || donors.length === 0) {
    alert("No donors available for export!");
    return;
  }

  // Prepare CSV headers - include all fields from User schema
  const headers = [
    // IDs and basic info
    "Donor ID",
    "Name",
    "First Name",
    "Last Name",
    "Email",
    "Phone",

    // Address details
    "Full Address",
    "Street",
    "City",
    "State",
    "Postal Code",
    "Country",
    "Date of Birth",
    "Total Donated",
    "Donation Count",
    "First Donation Date",
    "Last Donation Date",
    "Donation Type",
    "Donation Types",
  ];

  const csvRows = donors.map((donor) => {
    // Helper to safely format dates
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      try {
        return new Date(dateStr).toLocaleDateString();
      } catch (e) {
        return "";
      }
    };

    // Return all donor fields in the same order as headers
    return [
      donor.id || "",
      `"${donor.name || ""}"`, // Wrap in quotes to handle potential commas
      `"${donor.firstName || ""}"`,
      `"${donor.lastName || ""}"`,
      donor.email || "",
      donor.phone || "",

      // Address fields - handle all fields safely
      `"${donor.fullAddress || ""}"`,
      `"${donor.address?.street || ""}"`,
      `"${donor.address?.city || ""}"`,
      `"${donor.address?.state || ""}"`,
      donor.address?.postalCode || "",
      `"${donor.country || ""}"`,

      // Account details
      formatDate(donor.dateOfBirth) || "",

      // Donation metrics
      (donor.totalDonated || 0).toFixed(2), // Format as currency with 2 decimal places
      donor.donationCount || 0,
      formatDate(donor.firstDonationDate) || "",
      formatDate(donor.lastDonationDate) || "",
      donor.donationType || "",
      `"${(donor.donationTypes || []).join(", ")}"`, // Convert array to comma-separated string in quotes
    ];
  });

  // Prepend UTF-8 BOM for Excel compatibility
  const csvContent =
    "﻿" + [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

  // Create and download CSV file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  const fileName = `donors_export_${new Date().toISOString().slice(0, 10)}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);

  return true; // Indicate successful export
};

const DonorDetailView = ({ donor, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [donorDetails, setDonorDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDonorDetails = async () => {
      try {
        const details = await donorsService.details(donor.id);
        setDonorDetails(details.data);
      } catch (err) {
        setError("Failed to load donor details");
      } finally {
        setIsLoading(false);
      }
    };

    loadDonorDetails();
  }, [donor.id]);

  // Process transactions for chart data - proper timeline with exact dates.
  const processDonationChartData = () => {
    if (!donorDetails?.donationHistory || donorDetails.donationHistory.length === 0) {
      return [];
    }
    const sortedDonations = [...donorDetails.donationHistory].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
    return sortedDonations.map((donation) => {
      const donationDate = new Date(donation.date);
      const formatDate = (date) => {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
        return `${month}/${day} ${weekday}`;
      };
      return {
        fullDate: donationDate,
        date: formatDate(donationDate),
        amount: donation.amount,
        id: donation.id,
      };
    });
  };

  const donationChartData = processDonationChartData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const fullDate = payload[0]?.payload?.fullDate;
      return (
        <div className="border border-gray-200 bg-white p-3 shadow-md dark:border-white/10 dark:bg-[var(--admin-elevated)]">
          <p className="font-medium text-primary">
            {fullDate
              ? fullDate.toLocaleDateString("default", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : label}
          </p>
          <p className="text-xs text-text-muted">
            {fullDate
              ? fullDate.toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" })
              : ""}
          </p>
          <p className="mt-1 font-bold text-accent">Amount: ${payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Portal>
    <motion.div
      className="fixed inset-0 z-50 flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative ml-auto h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl dark:bg-[var(--admin-card)]"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 dark:border-white/10 dark:bg-[var(--admin-card)]">
          <h2 className="text-lg font-semibold text-primary">Donor details</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <TabLoader />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">{error}</div>
        ) : (
          <div className="space-y-7 p-6 pb-16">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <User className="h-8 w-8" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold text-primary">{donor.name}</h3>
                <p className="text-sm text-text-muted">Donor ID: {donor.id}</p>
              </div>
            </div>

            {/* Contact + dates */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 border border-gray-100 bg-gray-50 p-4">
                <p className="flex items-center gap-2 text-sm text-text-muted">
                  <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{donor.email}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-text-muted">
                  <Phone className="h-4 w-4 shrink-0" /> {donor.phone || "N/A"}
                </p>
              </div>
              <div className="space-y-2 border border-gray-100 bg-gray-50 p-4">
                <p className="flex items-center gap-2 text-sm text-text-muted">
                  <Calendar className="h-4 w-4 shrink-0" /> First: {fmtFull(donor.firstDonationDate)}
                </p>
                <p className="flex items-center gap-2 text-sm text-text-muted">
                  <Clock className="h-4 w-4 shrink-0" /> Last: {fmtFull(donor.lastDonationDate)}
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-gray-100 bg-white p-4 shadow-sm">
                <DollarSign className="mb-2 h-5 w-5 text-accent" />
                <p className="text-xs text-text-muted">Total donated</p>
                <p className="text-lg font-bold text-primary">{money(donor.totalDonated)}</p>
              </div>
              <div className="border border-gray-100 bg-white p-4 shadow-sm">
                <Heart className="mb-2 h-5 w-5 text-accent" />
                <p className="text-xs text-text-muted">Total donations</p>
                <p className="text-lg font-bold text-primary">{donor.donationCount || 0}</p>
              </div>
              <div className="border border-gray-100 bg-white p-4 shadow-sm">
                <TrendingUp className="mb-2 h-5 w-5 text-accent" />
                <p className="text-xs text-text-muted">Average</p>
                <p className="text-lg font-bold text-primary">
                  {money(donor.donationCount > 0 ? donor.totalDonated / donor.donationCount : 0)}
                </p>
              </div>
            </div>

            {/* Chart */}
            {donationChartData.length > 0 && (
              <div className="border border-gray-100 bg-white p-4 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold text-primary">Donation history</h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={donationChartData} margin={{ top: 10, right: 20, left: 0, bottom: 45 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        tick={{ fontSize: 11 }}
                        interval={0}
                        padding={{ left: 10, right: 10 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="var(--tenant-accent, #C9A84C)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent donations */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-primary">Recent donations</h4>
              <div className="space-y-2">
                {donorDetails?.donationHistory
                  ?.slice()
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((donation) => (
                    <div
                      key={donation.id}
                      className="flex items-center justify-between border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-primary">{donation.cause}</p>
                        <p className="text-sm text-text-muted">
                          {new Date(donation.date).toLocaleDateString()}{" "}
                          {new Date(donation.date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium text-primary">${donation.amount.toLocaleString()}</p>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 text-xs font-medium capitalize",
                            donation.status === "completed"
                              ? "bg-accent/10 text-accent"
                              : "bg-amber-50 text-amber-700",
                          )}
                        >
                          {donation.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
    </Portal>
  );
};

const DonorsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "totalDonated", direction: "desc" });
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // grid | table
  const [isExporting, setIsExporting] = useState(false);
  // Seed from the session cache when available so revisits render instantly and
  // the loader only ever shows on the very first, uncached open.
  const cachedList = donorsService.getCachedList();
  const cachedStats = donorsService.getCachedStats();
  const [donors, setDonors] = useState(cachedList ? mapDonors(cachedList) : []);
  const [stats, setStats] = useState(
    cachedStats
      ? mapStats(cachedStats)
      : { totalAmount: 0, averageDonation: 0, recurringDonations: 0, totalDonors: 0 },
  );
  const [pagination, setPagination] = useState(
    cachedList
      ? cachedList.data.pagination
      : { total: 0, pages: 0, currentPage: 1, perPage: ITEMS_PER_PAGE },
  );
  const [selectedType, setSelectedType] = useState("All");
  const [isLoading, setIsLoading] = useState(!cachedList);
  const [error, setError] = useState(null);

  // Load dashboard stats (cached per session — skip the fetch if we already
  // seeded `stats` from the cache above).
  useEffect(() => {
    if (donorsService.getCachedStats()) return;
    const loadStats = async () => {
      try {
        const data = await donorsService.stats();
        setStats(mapStats(data));
      } catch (err) {
        setError("Failed to load dashboard statistics");
        console.error(err);
      }
    };
    loadStats();
  }, []);

  // Load donors list with pagination, search, sorting, and filtering by type.
  // The default (param-less) load is served from cache; only the first uncached
  // load is delayed (withMinDelay) so the brand loader doesn't flash — later
  // filter / search / page changes stay snappy.
  useEffect(() => {
    const loadDonors = async () => {
      setIsLoading(true);
      try {
        const cachedBefore = donorsService.getCachedList();
        const promise = donorsService.list({
          page: currentPage,
          search: searchTerm,
          sortConfig,
          type: selectedType,
        });
        const data = cachedBefore ? await promise : await withMinDelay(promise);
        setDonors(mapDonors(data));
        setPagination(data.data.pagination);
      } catch (err) {
        setError("Failed to load donors");
        console.error(err);
      }
      setIsLoading(false);
    };

    const debounceTimer = setTimeout(loadDonors, 300);
    return () => clearTimeout(debounceTimer);
  }, [currentPage, searchTerm, sortConfig, selectedType]);

  const handleExportDonors = async () => {
    setIsExporting(true);
    try {
      const allDonors = await donorsService.exportAll({
        search: searchTerm,
        sortConfig,
        type: selectedType,
      });
      const mappedDonors = allDonors.map((donor) => ({
        ...donor,
        id: donor._id,
        totalDonated: donor.totalPaid,
        lastDonationDate: donor.lastDonationDate || donor.lastDonation,
        fullAddress: donor.fullAddress ?? donor.formattedAddress ?? "",
      }));
      exportToCSV(mappedDonors);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export donors. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc",
    });
  };

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-3 text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-light"
          >
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
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Donors</h1>
          <p className="mt-1 text-sm text-text-muted">{pagination.total || 0} total donors</p>
        </div>
        <button
          type="button"
          onClick={handleExportDonors}
          disabled={isExporting || donors.length === 0}
          className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total donors" value={stats.totalDonors || 0} tone="accent" />
        <StatCard icon={DollarSign} label="Total donations" value={money(stats.totalAmount)} tone="accent" />
        <StatCard icon={TrendingUp} label="Average donation" value={money(stats.averageDonation)} tone="muted" />
        <StatCard icon={Heart} label="Recurring donors" value={stats.recurringDonations || 0} tone="accent" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search donors…"
            className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
          />
        </div>
        <CustomSelect
          value={selectedType}
          onChange={(value) => setSelectedType(value)}
          options={[
            { value: "All", label: "All types" },
            { value: "single", label: "One-time" },
            { value: "recurring", label: "Recurring" },
            { value: "installments", label: "Installments" },
          ]}
          triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          className="sm:min-w-[150px]"
        />
        <div className="inline-flex shrink-0 border border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            title="Grid view"
            className={cn(
              "grid h-9 w-9 place-items-center transition-colors",
              viewMode === "grid" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            title="List view"
            className={cn(
              "grid h-9 w-9 place-items-center transition-colors",
              viewMode === "table" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {donors.length === 0 ? (
          <motion.div
            key="empty"
            variants={fadeWrap}
            initial="hidden"
            animate="show"
            exit="exit"
            className="border border-gray-100 bg-white p-12 text-center shadow-sm"
          >
            <User className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="font-medium text-primary">No donors found</p>
            <p className="mt-1 text-sm text-text-muted">
              {searchTerm || selectedType !== "All"
                ? "Try adjusting your filters."
                : "No donors in the system yet."}
            </p>
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div
            key={`grid-${pagination.currentPage}`}
            variants={gridContainer}
            initial="hidden"
            animate="show"
            exit="exit"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            {donors.map((donor) => (
              <motion.div
                key={donor.id}
                variants={cardVariants}
                onClick={() => setSelectedDonor(donor)}
                className="group cursor-pointer border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                    <User className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary">{donor.name}</p>
                    <p className="truncate text-xs text-text-muted">{donor.email}</p>
                  </div>
                  <TypeBadge type={donor.donationType} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat label="Donated" value={money(donor.totalDonated)} />
                  <MiniStat label="Count" value={donor.donationCount || 0} />
                  <MiniStat label="Last" value={fmtShort(donor.lastDonationDate)} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={`table-${pagination.currentPage}`}
            variants={fadeWrap}
            initial="hidden"
            animate="show"
            exit="exit"
            className="overflow-hidden border border-gray-100 bg-white shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold text-text-muted">
                    <SortableTh label="Donor" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTh label="Donated" sortKey="totalDonated" sortConfig={sortConfig} onSort={handleSort} />
                    <th className="px-4 py-3 uppercase tracking-wider">Type</th>
                    <SortableTh label="Last donation" sortKey="lastDonationDate" sortConfig={sortConfig} onSort={handleSort} />
                    <th className="px-4 py-3 text-right uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer}>
                  {donors.map((donor) => (
                    <motion.tr
                      key={donor.id}
                      variants={rowVariants}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                            <User className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-primary">{donor.name}</p>
                            <p className="truncate text-xs text-text-muted">{donor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-primary">{money(donor.totalDonated)}</td>
                      <td className="px-4 py-2.5">
                        <TypeBadge type={donor.donationType} />
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{fmtFull(donor.lastDonationDate)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedDonor(donor)}
                            title="View details"
                            className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
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
                  className={cn(
                    "h-8 w-8 text-xs font-medium transition-colors",
                    currentPage === pg ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100",
                  )}
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

      {/* Donor detail slide-over */}
      <AnimatePresence>
        {selectedDonor && (
          <DonorDetailView donor={selectedDonor} onClose={() => setSelectedDonor(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DonorsPage;
