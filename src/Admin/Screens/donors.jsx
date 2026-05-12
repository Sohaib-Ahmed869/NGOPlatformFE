//donors.jsx
import React, { useState, useEffect } from "react";
import {
  Search,
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
  Loader,
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
          <p className="text-[#C9A84C] font-bold mt-1">Amount: ${payload[0].value.toLocaleString()}</p>
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
                <div className="bg-[#C9A84C]/10 p-4 rounded-full flex-shrink-0">
                  <User className="w-8 h-8 text-[#C9A84C]" />
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
              <div className="bg-[#FAF7F2] p-4 rounded-lg">
                <DollarSign className="w-6 h-6 text-[#C9A84C] mb-2" />
                <p className="text-sm text-gray-600">Total Donated</p>
                <p className="text-xl font-bold text-gray-800">
                  ${donor.totalDonated.toLocaleString()} 
                </p>
              </div>
              <div className="bg-[#FAF7F2] p-4 rounded-lg">
                <Heart className="w-6 h-6 text-[#C9A84C] mb-2" />
                <p className="text-sm text-gray-600">Total Donations</p>
                <p className="text-xl font-bold text-gray-800">{donor.donationCount}</p>
              </div>
              <div className="bg-[#FAF7F2] p-4 rounded-lg">
                <TrendingUp className="w-6 h-6 text-[#C9A84C] mb-2" />
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
                            ? "bg-[#C9A84C]/10 text-[#2C2418]"
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

  return (
    <div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-[#FAF7F2]/30 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-[#2C2418]">Donors</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-96">
          <Loader className="w-8 h-8 text-[#C9A84C] animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-lg border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#C9A84C]">Total Donors</p>
                  <p className="text-2xl font-bold text-[#2C2418]">{stats.totalDonors || 0}</p>
                  <p className="text-xs text-[#C9A84C]">
                  Total Number of donors
                  </p>
                </div>
                <div className="p-3 bg-[#FAF7F2] rounded-full">
                  <User className="w-6 h-6 text-[#C9A84C]" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#C9A84C]">Total Donations</p>
                  <p className="text-2xl font-bold text-[#2C2418]">
                ${(stats.totalAmount || 0).toLocaleString()}         
              </p>
                  <p className="text-xs text-[#C9A84C]">
                  Total amount of donations by all donors (including paid and unpaid installments and recurring donations)
                  </p>
                </div>
                <div className="p-3 bg-[#FAF7F2] rounded-full">
                  <DollarSign className="w-6 h-6 text-[#C9A84C]" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#C9A84C]">Average Donation</p>
                  <p className="text-2xl font-bold text-[#2C2418]">
                ${(stats.averageDonation || 0).toLocaleString()}
              </p>
                  <p className="text-xs text-[#C9A84C]">
                  Average of donations by all donors
                  </p>
                </div>
                <div className="p-3 bg-[#FAF7F2] rounded-full">
                  <TrendingUp className="w-6 h-6 text-[#C9A84C]" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#C9A84C]">Recurring Donors</p>
                  <p className="text-2xl font-bold text-[#2C2418]">
                {stats.recurringDonations || 0}
              </p>
                  <p className="text-xs text-[#C9A84C]">
                    Number of donors with recurring donations
                  </p>
                </div>
                <div className="p-3 bg-[#FAF7F2] rounded-full">
                  <Heart className="w-6 h-6 text-[#C9A84C]" />
                </div>
              </div>
            </div>
          </div>

          {/* Donors Table */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
              <div className="flex flex-col lg:flex-row gap-2 items-center space-x-4 w-full md:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search donors..."
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C] w-full md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                <select
                  className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="All">All Types</option>
                  <option value="single">One-time</option>
                  <option value="recurring">Recurring</option>
                  <option value="installments">Installments</option>
                </select>
              </div>
              <button
                onClick={handleExportDonors}
                disabled={isExporting}
                className="flex items-center space-x-2 px-4 py-2 bg-[#FAF7F2] text-[#C9A84C] rounded-lg hover:bg-[#C9A84C]/10 transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>Export</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Donor ID
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("name")}
                      >
                        Donor <ChevronDown className="w-4 h-4 inline-block ml-1" />
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("totalDonated")}
                      >
                        Total Donated <ChevronDown className="w-4 h-4 inline-block ml-1" />
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("lastDonationDate")}
                      >
                        Last Donation <ChevronDown className="w-4 h-4 inline-block ml-1" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {donors.map((donor) => (
                      <tr key={donor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-[#2C2418]">
                            {donor.id.slice(-4)}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-[#2C2418]">
                              {donor.name}
                            </div>
                            <div className="text-sm text-[#C9A84C]">{donor.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[#2C2418]">
                            ${donor.totalDonated.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C9A84C]">
                          {new Date(donor.lastDonationDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C9A84C]">
                          <button
                            onClick={() => setSelectedDonor(donor)}
                            className="text-[#C9A84C] hover:text-[#2C2418]"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-[#C9A84C]">
                Showing {(pagination.currentPage - 1) * pagination.perPage + 1} to{" "}
                {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of{" "}
                {pagination.total} entries
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg ${
                    currentPage === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-[#C9A84C] hover:bg-[#FAF7F2]"
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg ${
                        currentPage === pageNum
                          ? "bg-[#C9A84C] text-white"
                          : "text-[#C9A84C] hover:bg-[#FAF7F2]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                  className={`p-2 rounded-lg ${
                    currentPage === pagination.pages
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-[#C9A84C] hover:bg-[#FAF7F2]"
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Donor Detail Slide-over */}
          {selectedDonor && (
            <DonorDetailView donor={selectedDonor} onClose={() => setSelectedDonor(null)} />
          )}
        </>
      )}
    </div>
  );
};

export default DonorsPage;
