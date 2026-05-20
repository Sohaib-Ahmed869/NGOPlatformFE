import React, { useState, useEffect } from "react";
import axiosInstance from "../../services/axios";

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

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
            Team Join Applications Dashboard
          </h1>
          <div className="flex space-x-3">
            <button
              className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-light transition-all duration-300 shadow-sm flex items-center gap-2"
              onClick={exportToCSV}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Export to CSV
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-all duration-300 shadow-sm flex items-center gap-2"
              onClick={fetchJoinApplications}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
            <div className="text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="text-gray-600 font-medium mt-3">
              Total Applications
            </div>
            <div className="text-3xl font-bold text-gray-800 mt-1">
              {totalApplications}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              All team applications
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
            <div className="text-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="text-gray-600 font-medium mt-3">Male</div>
            <div className="text-3xl font-bold text-gray-800 mt-1">
              {maleApplicants}
            </div>
            <div className="text-sm text-gray-500 mt-1">Male volunteers</div>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
            <div className="text-pink-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="text-gray-600 font-medium mt-3">Female</div>
            <div className="text-3xl font-bold text-gray-800 mt-1">
              {femaleApplicants}
            </div>
            <div className="text-sm text-gray-500 mt-1">Female volunteers</div>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
            <div className="text-yellow-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
                />
              </svg>
            </div>
            <div className="text-gray-600 font-medium mt-3">Under 18</div>
            <div className="text-3xl font-bold text-gray-800 mt-1">
              {under18}
            </div>
            <div className="text-sm text-gray-500 mt-1">Youth volunteers</div>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
            <div className="text-purple-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div className="text-gray-600 font-medium mt-3">Adults</div>
            <div className="text-3xl font-bold text-gray-800 mt-1">
              {over18}
            </div>
            <div className="text-sm text-gray-500 mt-1">Adult volunteers</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="w-full md:w-1/3">
            <div className="flex">
              <input
                type="text"
                placeholder="Search by name, email, or skills"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                value={searchTerm}
                onChange={handleSearch}
              />
              <button className="p-2 bg-gray-100 text-gray-600 rounded-r-lg border border-gray-300 border-l-0 hover:bg-gray-200 transition-colors duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <select
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent w-full md:w-1/4"
            value={filter}
            onChange={handleFilterChange}
          >
            <option value="all">All Applications</option>
            <option value="gender">Male Applicants</option>
            <option value="18+">18 and Above</option>
            <option value="skills">Leadership Skills</option>
          </select>
        </div>

        {/* Join Team Applications Table */}
        <div className="bg-white overflow-x-auto rounded-lg shadow-sm mb-6 border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Name
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Email
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Phone
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Age
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Gender
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Skills
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-3 text-gray-500"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="text-gray-600">
                        Loading applications...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : currentApplications.length > 0 ? (
                currentApplications.map((application) => (
                  <tr
                    key={application._id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="font-medium p-3 border-b border-gray-200">{`${application.firstName} ${application.lastName}`}</td>
                    <td className="text-accent p-3 border-b border-gray-200">
                      {application.email}
                    </td>
                    <td className="p-3 border-b border-gray-200">
                      {application.phoneNumber}
                    </td>
                    <td className="p-3 border-b border-gray-200">
                      {application.age}
                    </td>
                    <td className="p-3 border-b border-gray-200">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          application.gender?.toLowerCase() === "male"
                            ? "bg-accent/10 text-blue-800"
                            : "bg-pink-100 text-pink-800"
                        }`}
                      >
                        {application.gender}
                      </span>
                    </td>
                    <td className="max-w-xs truncate p-3 border-b border-gray-200">
                      {application.skills}
                    </td>

                    <td className="p-3 border-b border-gray-200">
                      <div className="flex space-x-2">
                        <button
                          className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all duration-200 group relative"
                          onClick={() => handleViewApplication(application)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap">
                            View Details
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 mx-auto mb-2 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <p className="text-lg">No join applications found</p>
                    <p className="text-sm text-gray-400">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Updated to match DonationsPage style */}
        <div className="flex justify-between items-center mt-6 mb-8">
          <div className="text-sm text-gray-700">
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
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-accent hover:bg-background"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
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
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === pageNumber
                      ? "bg-accent text-white"
                      : "text-gray-600 hover:bg-background"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 rounded-lg ${
                currentPage === totalPages || totalPages === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-accent hover:bg-background"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
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
      </div>
    </div>
  );
};

export default JoinTeamAdmin;
