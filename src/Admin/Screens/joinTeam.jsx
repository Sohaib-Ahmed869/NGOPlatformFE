import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Download, RefreshCw, Users, User, UserRound, Cake, Building2, Eye, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import axiosInstance from "../../services/axios";
import KpiCard from "../../components/KpiCard";
import Loader from "../../components/Loader";

const JoinTeamAdmin = () => {
  const [joinApplications, setJoinApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [applicationsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewApplication, setViewApplication] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState({});

  useEffect(() => {
    fetchJoinApplications();
  }, []);

  const fetchJoinApplications = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/join");
      setJoinApplications(response.data);
      // Initialize status for each application
      const statusObj = {};
      response.data.forEach((app) => {
        statusObj[app._id] = app.status || "pending";
      });
      setApplicationStatus(statusObj);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching join applications:", error);
      setLoading(false);
    }
  };

  // Filter applications by search term and filter
  const filteredApplications = joinApplications.filter((app) => {
    const fullName = `${app.firstName} ${app.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.skills?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filter === "all"
        ? true
        : filter === "gender"
        ? app.gender?.toLowerCase() === "male"
        : filter === "18+"
        ? app.age >= 18
        : filter === "skills"
        ? app.skills?.toLowerCase().includes("leadership")
        : true;

    return matchesSearch && matchesFilter;
  });

  // Calculate pagination
  const indexOfLastApplication = currentPage * applicationsPerPage;
  const indexOfFirstApplication = indexOfLastApplication - applicationsPerPage;
  const currentApplications = filteredApplications.slice(
    indexOfFirstApplication,
    indexOfLastApplication
  );
  const totalPages = Math.ceil(
    filteredApplications.length / applicationsPerPage
  );

  // Stats
  const totalApplications = joinApplications.length;
  const maleApplicants = joinApplications.filter(
    (app) => app.gender?.toLowerCase() === "male"
  ).length;
  const femaleApplicants = joinApplications.filter(
    (app) => app.gender?.toLowerCase() === "female"
  ).length;
  const under18 = joinApplications.filter((app) => app.age < 18).length;
  const over18 = joinApplications.filter((app) => app.age >= 18).length;

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleViewApplication = (application) => {
    setViewApplication(application);
  };

  const closeViewModal = () => {
    setViewApplication(null);
  };

  const handleStatusChange = async (id, status) => {
    try {
      // Here you would make an API call to update the status
      // await axiosInstance.put(`/api/join/${id}/status`, { status });

      setApplicationStatus({
        ...applicationStatus,
        [id]: status,
      });
    } catch (error) {
      console.error("Error updating application status:", error);
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    // Define which fields to include in the CSV
    const fields = [
      "firstName",
      "lastName",
      "email",
      "phoneNumber",
      "age",
      "gender",
      "address",
      "skills",
      "availableDays",
    ];

    // Create the CSV header row
    const header = [
      "First Name",
      "Last Name",
      "Email",
      "Phone Number",
      "Age",
      "Gender",
      "Address",
      "Skills",
      "Available Days",
    ].join(",");

    // Convert data to CSV rows
    const csvData = filteredApplications.map((app) => {
      return fields
        .map((field) => {
          let value = app[field];

          // Handle array fields like availableDays
          if (field === "availableDays" && Array.isArray(value)) {
            value = value.join("; ");
          }

          // Format values with commas or quotes
          if (value === null || value === undefined) {
            return '""';
          }
          return typeof value === "string"
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(",");
    });

    // Combine header and rows
    const csv = [header, ...csvData].join("\n");

    // Create a blob and download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `team_applications_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <Loader label="Loading applications..." />;

  return (
    <motion.div
      className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">
            Team Applications
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Review and manage volunteer join requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-light transition-all duration-300 shadow-sm flex items-center gap-2 text-sm font-medium"
            onClick={exportToCSV}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center gap-2 text-sm font-medium"
            onClick={fetchJoinApplications}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Applications"
          value={totalApplications}
          icon={Users}
          color="#059669"
          animate={false}
        />
        <KpiCard
          title="Male"
          value={maleApplicants}
          icon={User}
          color="#10B981"
          animate={false}
        />
        <KpiCard
          title="Female"
          value={femaleApplicants}
          icon={UserRound}
          color="#EC4899"
          animate={false}
        />
        <KpiCard
          title="Under 18"
          value={under18}
          icon={Cake}
          color="#F59E0B"
          animate={false}
        />
        <KpiCard
          title="Adults"
          value={over18}
          icon={Building2}
          color="#06B6D4"
          animate={false}
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or skills..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <select
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all md:w-48"
            value={filter}
            onChange={handleFilterChange}
          >
            <option value="all">All Applications</option>
            <option value="gender">Male Applicants</option>
            <option value="18+">18 and Above</option>
            <option value="skills">Leadership Skills</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Name
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Email
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Phone
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Age
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Gender
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Skills
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentApplications.length > 0 ? (
                currentApplications.map((application) => (
                  <tr
                    key={application._id}
                    className="border-b border-gray-50 last:border-0 hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{`${application.firstName} ${application.lastName}`}</td>
                    <td className="px-4 py-3 text-sm text-accent">
                      {application.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {application.phoneNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {application.age}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          application.gender?.toLowerCase() === "male"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-pink-50 text-pink-700"
                        }`}
                      >
                        {application.gender}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {application.skills}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="p-2 rounded-xl bg-gray-50 hover:bg-accent/10 text-gray-500 hover:text-accent transition-all duration-200"
                        onClick={() => handleViewApplication(application)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-500">
                      No join applications found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-gray-500">
              Showing{" "}
              {filteredApplications.length
                ? (currentPage - 1) * applicationsPerPage + 1
                : 0}{" "}
              to{" "}
              {Math.min(
                currentPage * applicationsPerPage,
                filteredApplications.length
              )}{" "}
              of {filteredApplications.length} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-1.5 rounded-lg ${
                  currentPage === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - (4 - i);
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors ${
                      currentPage === pageNumber
                        ? "bg-accent text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-1.5 rounded-lg ${
                  currentPage === totalPages || totalPages === 0
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Application Modal */}
      {viewApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div
            className="fixed inset-0 bg-black opacity-40 transition-opacity"
            onClick={closeViewModal}
          ></div>

          <div className="relative bg-white w-full max-w-3xl mx-auto rounded-lg shadow-2xl overflow-hidden transform transition-all">
            {/* Header */}
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-800">
                Team Application Details
              </h3>
              <button
                onClick={closeViewModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={viewApplication.firstName || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={viewApplication.lastName || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    value={viewApplication.email || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={viewApplication.phoneNumber || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="text"
                    value={viewApplication.age || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <input
                    type="text"
                    value={viewApplication.gender || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={viewApplication.address || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skills
                  </label>
                  <textarea
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent h-24 resize-none"
                    value={viewApplication.skills || ""}
                    readOnly
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available Days
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-300 rounded-md">
                    {viewApplication.availableDays &&
                    viewApplication.availableDays.length > 0 ? (
                      viewApplication.availableDays.map((day, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent/10 text-blue-800"
                        >
                          {day}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">No days selected</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application Status
                  </label>
                  <select
                    value={
                      applicationStatus[viewApplication._id] || "pending"
                    }
                    onChange={(e) =>
                      handleStatusChange(viewApplication._id, e.target.value)
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors duration-200"
                  onClick={closeViewModal}
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 bg-accent text-white font-medium rounded-md hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors duration-200"
                  onClick={() => {
                    // Here you would make an API call to save the application status
                    closeViewModal();
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default JoinTeamAdmin;
