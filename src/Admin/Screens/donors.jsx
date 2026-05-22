//donors.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Loader from "../../components/Loader";
import {
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  Heart,
  TrendingUp,
  Download,
  Loader2,
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
import axiosInstance from "../../services/axios";
import KpiCard from "../../components/KpiCard";

const ITEMS_PER_PAGE = 10;

// API functions
const fetchDashboardStats = async () => {
  const response = await axiosInstance.get("/admin/donors/dashboard/stats");
  if (!response.status) throw new Error("Failed to fetch dashboard stats");
  return response;
};

// Updated to accept a fourth parameter, `type`
const fetchDonorsList = async (page, searchTerm, sortConfig, type) => {
  const params = new URLSearchParams({
    page,
    limit: ITEMS_PER_PAGE,
    search: searchTerm,
    sortBy: sortConfig.key,
    sortOrder: sortConfig.direction,
  });

  // Only add `type` if it isn't "All"
  if (type && type !== "All") {
    params.set("type", type);
  }

  const response = await axiosInstance.get(`/admin/donors?${params}`);
  console.log(response.data);
  if (!response.status) throw new Error("Failed to fetch donors");
  return response.data;
};

const fetchDonorDetails = async (donorId) => {
  try {
    const response = await axiosInstance.get(`/admin/donors/${donorId}`);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching donor details:", error);
    throw error;
  }
};

// Updated to accept `type` so exported CSV respects current filters
const fetchAllDonors = async (searchTerm, sortConfig, type) => {
  const params = new URLSearchParams({
    search: searchTerm,
    sortBy: sortConfig.key,
    sortOrder: sortConfig.direction,
    limit: 100000,
  });

  if (type && type !== "All") {
    params.set("type", type);
  }

  const response = await axiosInstance.get(`/admin/donors?${params}`);
  if (!response.status) throw new Error("Failed to fetch all donors");
  return response.data.data.donors;
};

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
    "Donation Types"
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
      `"${donor.name || ''}"`, // Wrap in quotes to handle potential commas
      `"${donor.firstName || ''}"`,
      `"${donor.lastName || ''}"`,
      donor.email || '',
      donor.phone || '',
      
      // Address fields - handle all fields safely
      `"${donor.fullAddress || ''}"`,
      `"${donor.address?.street || ''}"`,
      `"${donor.address?.city || ''}"`,
      `"${donor.address?.state || ''}"`,
      donor.address?.postalCode || '',
      `"${donor.country || ''}"`,
      
      // Account details
      formatDate(donor.dateOfBirth) || '',
      
      // Donation metrics 
      (donor.totalDonated || 0).toFixed(2), // Format as currency with 2 decimal places
      donor.donationCount || 0,
      formatDate(donor.firstDonationDate) || '',
      formatDate(donor.lastDonationDate) || '',
      donor.donationType || '',
      `"${(donor.donationTypes || []).join(', ')}"` // Convert array to comma-separated string in quotes
    ];
  });

  // Prepend UTF-8 BOM for Excel compatibility
  const csvContent =
    "\uFEFF" +
    [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

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
        const details = await fetchDonorDetails(donor.id);
        console.log("donor", details);
        setDonorDetails(details.data);
      } catch (err) {
        setError("Failed to load donor details");
      } finally {
        setIsLoading(false);
      }
    };

    loadDonorDetails();
  }, [donor.id]);

  // Process transactions for chart data - fixed to show proper timeline with exact dates
  const processDonationChartData = () => {
    if (!donorDetails?.donationHistory || donorDetails.donationHistory.length === 0) {
      return [];
    }

    // Sort donations by date and time (assuming there's a timestamp in the date)
    const sortedDonations = [...donorDetails.donationHistory]
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Map to chart data format with full date and time preserved
    return sortedDonations.map((donation) => {
      const donationDate = new Date(donation.date);
      
      // Format as "3/26 Mon" for better readability - showing month/day and weekday
      const formatDate = (date) => {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        return `${month}/${day} ${weekday}`;
      };
      
      return {
        fullDate: donationDate, // Keep the full date object for sorting
        date: formatDate(donationDate),
        amount: donation.amount,
        id: donation.id // Include ID to ensure uniqueness
      };
    });
  };

  const donationChartData = processDonationChartData();

  // Format the tooltip to display date and amount
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const fullDate = payload[0]?.payload?.fullDate;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded">
          <p className="font-medium">
            {fullDate ? fullDate.toLocaleDateString('default', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : label}
          </p>
          <p className="text-xs text-gray-600">
            {fullDate ? fullDate.toLocaleTimeString('default', {
              hour: '2-digit',
              minute: '2-digit'
            }) : ''}
          </p>
          <p className="text-accent font-bold mt-1">Amount: ${payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end overflow-hidden z-50">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800">Donor Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        {isLoading ? (
          <div className="p-6 text-center">Loading donor details...</div>
        ) : error ? (
          <div className="p-6 text-red-600 text-center">{error}</div>
        ) : (
          <div className="p-6 space-y-8 pb-16">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 flex items-center space-x-4">
                <div className="bg-accent/10 p-4 rounded-full flex-shrink-0">
                  <User className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{donor.name}</h3>
                  <p className="text-gray-500">Donor ID: {donor.id}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{donor.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{donor.phone || "N/A"}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    First Donation:{" "}
                    {new Date(donor.firstDonationDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    Last Donation:{" "}
                    {new Date(donor.lastDonationDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-background p-4 rounded-lg">
                <DollarSign className="w-6 h-6 text-accent mb-2" />
                <p className="text-sm text-gray-600">Total Donated</p>
                <p className="text-xl font-bold text-gray-800">
                  ${donor.totalDonated.toLocaleString()} 
                </p>
              </div>
              <div className="bg-background p-4 rounded-lg">
                <Heart className="w-6 h-6 text-accent mb-2" />
                <p className="text-sm text-gray-600">Total Donations</p>
                <p className="text-xl font-bold text-gray-800">{donor.donationCount}</p>
              </div>
              <div className="bg-background p-4 rounded-lg">
                <TrendingUp className="w-6 h-6 text-accent mb-2" />
                <p className="text-sm text-gray-600">Average Donation</p>
                <p className="text-xl font-bold text-gray-800">
                  $
                  {donor.donationCount > 0
                    ? (donor.totalDonated / donor.donationCount).toLocaleString()
                    : 0}
                </p>
              </div>
            </div>

            {donationChartData.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="text-lg font-semibold mb-4">Donation History</h4>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={donationChartData}
                      margin={{ top: 10, right: 30, left: 10, bottom: 45 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        tick={{fontSize: 12, fontWeight: 'bold'}}
                        interval={0}
                        padding={{ left: 10, right: 10 }}
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#059669" 
                        strokeWidth={2} 
                        dot={{r: 4}}
                        activeDot={{r: 6, stroke: "#047857", strokeWidth: 2}}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-lg font-semibold mb-3">Recent Donations</h4>
              <div className="space-y-3">
                {donorDetails?.donationHistory?.sort((a, b) => new Date(b.date) - new Date(a.date)).map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{donation.cause}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(donation.date).toLocaleDateString()} {new Date(donation.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-800">
                        ${donation.amount.toLocaleString()}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          donation.status === "completed"
                            ? "bg-accent/10 text-primary"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
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
      </div>
    </div>
  );
};
const DonorsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "totalDonated",
    direction: "desc",
  });
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [isExporting, setIsExporting] = useState(false);
  const [donors, setDonors] = useState([]);
  const [stats, setStats] = useState({
    totalAmount: 0,
    averageDonation: 0,
    recurringDonations: 0,
    successRate: 0,
    totalDonors: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    currentPage: 1,
    perPage: ITEMS_PER_PAGE,
  });
  const [selectedType, setSelectedType] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetchDashboardStats();
        console.log("Stats data:", response.data.data.stats);
        setStats({
          totalDonors: response.data.data.stats.totalDonors || 0,
          totalAmount: response.data.data.stats.totalDonations || 0,
          averageDonation: response.data.data.stats.averageDonation || 0,
          recurringDonations: response.data.data.stats.recurringDonations || 0,
        });
      } catch (err) {
        setError("Failed to load dashboard statistics");
        console.error(err);
      }
    };
    loadStats();
  }, []);

  // Load donors list with pagination, search, sorting, and filtering by type
  useEffect(() => {
    const loadDonors = async () => {
      setIsLoading(true);
      try {
        const data = await fetchDonorsList(
          currentPage,
          searchTerm,
          sortConfig,
          selectedType
        );
        setDonors(
          data.data.donors.map((donor) => ({
            ...donor,
            id: donor._id,
            totalDonated: donor.totalPaid,
            lastDonationDate: donor.lastDonationDate || donor.lastDonation, // fallback if needed
          }))
        );
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
      const allDonors = await fetchAllDonors(searchTerm, sortConfig, selectedType);
      // Map fields to match UI/export expectations
      const mappedDonors = allDonors.map((donor) => ({
        ...donor,
        id: donor._id,
        totalDonated: donor.totalPaid,
        lastDonationDate: donor.lastDonationDate || donor.lastDonation,
        fullAddress: donor.fullAddress ?? donor.formattedAddress ?? "",
      }));
      console.log(mappedDonors);
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
      direction:
        sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc",
    });
  };

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <p>Error: {error}</p>
      </div>
    );
  }

  const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4 } }) };

  return (
    <motion.div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen" initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Donors</h1>
          <p className="text-sm text-text-muted mt-0.5">{pagination.total || 0} total donors</p>
        </div>
      </motion.div>

      {isLoading && donors.length === 0 ? (
        <Loader />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard title="Total Donors" value={stats.totalDonors || 0} icon={User} color="#059669" animate={false} />
            <KpiCard title="Total Donations" value={`$${(stats.totalAmount || 0).toLocaleString()}`} icon={DollarSign} color="#10B981" animate={false} />
            <KpiCard title="Average Donation" value={`$${(stats.averageDonation || 0).toLocaleString()}`} icon={TrendingUp} color="#06B6D4" animate={false} />
            <KpiCard title="Recurring Donors" value={stats.recurringDonations || 0} icon={Heart} color="#EC4899" animate={false} />
          </div>

          {/* Toolbar */}
          <motion.div variants={fadeUp} custom={1}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search donors..."
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none w-56" />
              </div>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none">
                <option value="All">All Types</option>
                <option value="single">One-time</option>
                <option value="recurring">Recurring</option>
                <option value="installments">Installments</option>
              </select>
              {/* View toggle */}
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setViewMode("grid")}
                  className={`p-2 transition-colors ${viewMode === "grid" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50"}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("table")}
                  className={`p-2 transition-colors ${viewMode === "table" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50"}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button onClick={handleExportDonors} disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </button>
          </motion.div>

          {/* Grid View */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {donors.map((donor, i) => (
                <motion.div key={donor.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedDonor(donor)}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-primary truncate">{donor.name}</p>
                      <p className="text-xs text-text-muted truncate">{donor.email}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      donor.donationType === "recurring" ? "bg-violet-50 text-violet-700" :
                      donor.donationType === "installments" ? "bg-amber-50 text-amber-700" :
                      "bg-emerald-50 text-emerald-700"
                    }`}>{donor.donationType || "one-time"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-background rounded-lg p-2.5 text-center">
                      <p className="text-xs text-text-muted">Donated</p>
                      <p className="text-sm font-bold text-primary">${donor.totalDonated?.toLocaleString()}</p>
                    </div>
                    <div className="bg-background rounded-lg p-2.5 text-center">
                      <p className="text-xs text-text-muted">Count</p>
                      <p className="text-sm font-bold text-primary">{donor.donationCount || 0}</p>
                    </div>
                    <div className="bg-background rounded-lg p-2.5 text-center">
                      <p className="text-xs text-text-muted">Last</p>
                      <p className="text-sm font-bold text-primary">
                        {donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Table View */
            <motion.div variants={fadeUp} custom={2}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider cursor-pointer" onClick={() => handleSort("name")}>
                        Donor <ChevronDown className="w-3 h-3 inline ml-0.5" />
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider cursor-pointer" onClick={() => handleSort("totalDonated")}>
                        Donated <ChevronDown className="w-3 h-3 inline ml-0.5" />
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider cursor-pointer" onClick={() => handleSort("lastDonationDate")}>
                        Last Donation <ChevronDown className="w-3 h-3 inline ml-0.5" />
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {donors.map((donor) => (
                      <tr key={donor.id} className="border-b border-gray-50 last:border-0 hover:bg-background/50 transition-colors">
                        <td className="px-4 py-3.5 text-sm font-medium text-text-muted">{donor.id.slice(-4)}</td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-primary">{donor.name}</p>
                          <p className="text-xs text-text-muted">{donor.email}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-semibold text-primary">${donor.totalDonated?.toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                            donor.donationType === "recurring" ? "bg-violet-50 text-violet-700" :
                            donor.donationType === "installments" ? "bg-amber-50 text-amber-700" :
                            "bg-emerald-50 text-emerald-700"
                          }`}>{donor.donationType || "one-time"}</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-text-muted">
                          {donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={() => setSelectedDonor(donor)} className="text-xs text-accent hover:text-primary font-medium">Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {donors.length === 0 && !isLoading && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <User className="w-10 h-10 mx-auto mb-3 text-text-muted" />
              <p className="text-primary font-medium mb-1">No donors found</p>
              <p className="text-sm text-text-muted">
                {searchTerm || selectedType !== "All" ? "Try adjusting your filters" : "No donors in the system yet"}
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                {(pagination.currentPage - 1) * pagination.perPage + 1}–{Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}
                  className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pg;
                  if (pagination.pages <= 5) pg = i + 1;
                  else if (currentPage <= 3) pg = i + 1;
                  else if (currentPage >= pagination.pages - 2) pg = pagination.pages - (4 - i);
                  else pg = currentPage - 2 + i;
                  return (
                    <button key={i} onClick={() => setCurrentPage(pg)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium ${currentPage === pg ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100"}`}>{pg}</button>
                  );
                })}
                <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === pagination.pages}
                  className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {/* Donor Detail Slide-over */}
          {selectedDonor && (
            <DonorDetailView donor={selectedDonor} onClose={() => setSelectedDonor(null)} />
          )}
        </>
      )}
    </motion.div>
  );
};

export default DonorsPage;
