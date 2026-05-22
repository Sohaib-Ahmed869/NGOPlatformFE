import React, { useState, useEffect, useMemo } from "react"
import { Calendar, Search, ChevronLeft, ChevronRight, ChevronDown, RefreshCcw, ChevronUp, X, Plus, Download, Loader, FileText, DollarSign, AlertCircle, Bell, CheckCircle2, MessageSquare } from 'lucide-react'
import { toast } from "react-hot-toast"
import DonationService from "../../services/donation.service"
import logo from "../../assets/logo.png"
import footer2 from "../../assets/footer3.png"
import { downloadReceipt, downloadPaidPaymentsReceipt } from "./recieptDownloader"
import { formatEndDate } from "./formatEndDate"
import { generateAnnualStatement, getAvailableFinancialYears } from "./AnnualDonation"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import AppLoader from "../../components/Loader";
import { useTenant } from "../../context/TenantContext";

const ITEMS_PER_PAGE = 10

const UserDonations = () => {
  const { organisation } = useTenant();
  const orgInfo = { name: organisation?.name, email: organisation?.contactEmail, phone: organisation?.contactPhone, website: organisation?.website };
  const [donations, setDonations] = useState([])
  const [stats, setStats] = useState({
    totalDonated: 0,
    paidDonated: 0,
    activeRecurring: 0,
    recurringCount: 0,
    oneTimeCount: 0,
    pendingAmount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("All")
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  })

  // State for modal
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDonation, setSelectedDonation] = useState(null)

  // New state for annual statement feature
  const [showYearSelector, setShowYearSelector] = useState(false)
  const [availableYears, setAvailableYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [generatingStatement, setGeneratingStatement] = useState(false)

  // New state for total amount from table
  const [tableTotal, setTableTotal] = useState(0)

  // New state for donation type counts
  const [typeCounts, setTypeCounts] = useState({
    single: 0,
    recurring: 0,
    installments: 0,
  })

  useEffect(() => {
    fetchDonations()
  }, [])

  // Add this effect to calculate available financial years
  useEffect(() => {
    if (donations.length > 0) {
      const years = getAvailableFinancialYears(donations)
      setAvailableYears(years)
      // Set current/most recent financial year as default
      if (years.length > 0) {
        setSelectedYear(years[0])
      }
    }
  }, [donations])

  const fetchDonations = async () => {
    try {
      setLoading(true)
      const [donationsResponse, statsResponse] = await Promise.all([
        DonationService.getUserDonations(),
        DonationService.getDonationStats(),
      ])
      console.log('Donations Response:', donationsResponse)
      console.log('Stats Response:', statsResponse)

      if (donationsResponse.status === "Success") {
        setDonations(donationsResponse.orders)
        // Use the updated stats from backend
        setStats(statsResponse.stats)

        // Calculate table total using the same method as before (for display consistency)
        const totalAmount = await Promise.all(
          donationsResponse.orders.map(async (order) => {
            // Skip cancelled donations
            if (order.paymentStatus === "cancelled") return 0

            if (order.paymentType === "installments" && order.installmentDetails?.installmentHistory) {
              // For installments, include both completed and active payments
              const activeInstallments = order.installmentDetails.installmentHistory.filter(
                (installment) => installment.status === "completed" || installment.status === "active",
              )
              const installmentTotal = activeInstallments.reduce((total, installment) => total + installment.amount, 0)
              return installmentTotal
            } else if (order.paymentType === "recurring") {
              // For recurring donations, sum all successful payments in recurringDetails.paymentHistory
              let paidAmount = 0;
              if (order.recurringDetails && Array.isArray(order.recurringDetails.paymentHistory)) {
                paidAmount = order.recurringDetails.paymentHistory
                  .filter(p => p.status === "succeeded" || p.status === "completed")
                  .reduce((sum, p) => sum + (p.amount || 0), 0);
              }
              return paidAmount
            } else {
              // For one-time donations, use totalAmount
              return order.totalAmount
            }
          }),
        ).then((amounts) => amounts.reduce((sum, amount) => sum + amount, 0))

        setTableTotal(totalAmount)
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch donations")
    } finally {
      setLoading(false)
    }
  }

  // Filtering
  const filteredDonations = useMemo(() => {
    return donations.filter((donation) => {
      const matchesSearch = donation.items[0]?.title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType =
        selectedType === "All"
          ? true
          : selectedType === "Recurring"
            ? donation.paymentType !== "single"
            : donation.paymentType === "single"

      return matchesSearch && matchesType
    })
  }, [donations, searchTerm, selectedType])

  // Calculate total and type counts using useMemo
  const { total, counts } = useMemo(() => {
    const total = filteredDonations.reduce((sum, donation) => sum + donation.totalAmount, 0)

    const counts = filteredDonations.reduce(
      (acc, donation) => {
        const type = donation.paymentType || "single"
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {
        single: 0,
        recurring: 0,
        installments: 0,
      },
    )

    return { total, counts }
  }, [filteredDonations])

  // Update state only when memoized values change
  useEffect(() => {
    setTableTotal(total)
    setTypeCounts(counts)
  }, [total, counts])

  // Sorting
  const sortedDonations = useMemo(() => {
    return [...filteredDonations].sort((a, b) => {
      const aValue = sortConfig.key === "date" ? new Date(a.createdAt) : a[sortConfig.key]
      const bValue = sortConfig.key === "date" ? new Date(b.createdAt) : b[sortConfig.key]

      if (sortConfig.direction === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }, [filteredDonations, sortConfig])

  // Pagination
  const totalPages = Math.ceil(sortedDonations.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedDonations = sortedDonations.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc",
    })
  }

  // Toggle row expansion
  const toggleRowExpansion = (donationId) => {
    setExpandedDonationId(donationId)
  }

  // Open modal with donation details
  const openDonationModal = (donation) => {
    setSelectedDonation(donation)
    setModalOpen(true)
  }

  // Close modal
  const closeModal = () => {
    setModalOpen(false)
    setSelectedDonation(null)
  }

  const handleGenerateStatement = async () => {
    if (!selectedYear) {
      toast.error("Please select a financial year")
      return
    }

    setGeneratingStatement(true)
    try {
      // Show a toast notification that generation has started
      toast.loading("Generating your annual statement...")

      const result = generateAnnualStatement(
        donations,
        selectedYear,
        {
          id: donations[0]?.userId,
          name: donations[0]?.donorDetails?.name,
          email: donations[0]?.donorDetails?.email,
        },
        { logoUrl: logo, charityLogoUrl: footer2, orgName: orgInfo.name, orgEmail: orgInfo.email, orgPhone: orgInfo.phone, orgWebsite: orgInfo.website },
      )

      // Dismiss the loading toast
      toast.dismiss()

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message || "Failed to generate statement")
      }
    } catch (error) {
      console.error("Error generating statement:", error)
      toast.dismiss() // Dismiss any loading toast
      toast.error("Failed to generate statement. Please try again.")
    } finally {
      setGeneratingStatement(false)
      setShowYearSelector(false)
    }
  }

  // Donation Pie Chart Component
  const DonationPieChart = () => {
    // Use data from stats (backend calculations)
    const totalDonationsAmount = stats.totalDonated || 0
    const actualTotalAmount = stats.paidDonated || 0
    const pendingAmount = stats.pendingAmount || 0

    const data = [
      { name: "Paid Donations", value: actualTotalAmount },
      { name: "Pending Donations", value: pendingAmount > 0 ? pendingAmount : 0 },
    ]

    // Green shades for the chart
    const COLORS = ["#2e7d32", "#81c784"] // Dark green and light green

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-accent/10 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Donation Summary</h3>
        <div className="flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 pl-0 md:pl-6 mt-4 md:mt-0">
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-[#2e7d32] mr-2"></div>
                <div>
                  <p className="text-sm font-medium">Paid Donations amount</p>
                  <p className="text-lg font-bold">${actualTotalAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total amount of payments done</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-[#81c784] mr-2"></div>
                <div>
                  <p className="text-sm font-medium">Pending Donations amount</p>
                  <p className="text-lg font-bold">${(pendingAmount > 0 ? pendingAmount : 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Remaining payments</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-medium">Total Donations Amount</p>
                <p className="text-xl font-bold text-accent">${totalDonationsAmount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total amount of all donations from user</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Annual Statement Section Component
  const AnnualStatementSection = () => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-accent/10">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="p-3 bg-background rounded-full mr-4">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Annual Donation Statement</h3>
            <p className="text-sm text-gray-600">Generate a statement of all your donations for tax purposes</p>
          </div>
        </div>

        <div className="flex items-center">
          {showYearSelector ? (
            <>
              <select
                className="mr-4 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                value={selectedYear || ""}
                onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
              >
                <option value="" disabled>
                  Select Financial Year
                </option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    FY {year - 1}-{year}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateStatement}
                disabled={generatingStatement || !selectedYear}
                className="flex items-center space-x-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingStatement ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span>Generate</span>
              </button>
              <button
                onClick={() => setShowYearSelector(false)}
                className="ml-2 p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowYearSelector(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-background text-accent rounded-lg hover:bg-accent/10 transition-colors"
            >
              <span>Generate Statement</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <AppLoader />
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-accent/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Donations Amount</p>
              <p className="text-2xl font-bold text-primary">
                ${(stats.totalDonated || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total amount of all donations from user</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-full">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-accent/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paid Donations amount</p>
              <p className="text-2xl font-bold text-primary">
                ${(stats.paidDonated || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total amount of payments done</p>
            </div>
            <div className="p-3 bg-background rounded-full">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-accent/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Donations amount</p>
              <p className="text-2xl font-bold text-primary">
                ${(stats.pendingAmount || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Remaining payments</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-accent/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active payments</p>
              <p className="text-2xl font-bold text-primary">{stats.activeRecurring}</p>
              <p className="text-xs text-gray-500">Includes number of active installments and recurring</p>
            </div>
            <div className="p-3 bg-background rounded-full">
              <RefreshCcw className="w-6 h-6 text-green-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Annual Statement Section */}
      <DonationPieChart />
      <AnnualStatementSection />

      {/* Donations Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-accent/10">
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by cause..."
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>

              <select
                className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="One-time">One-time</option>
                <option value="Recurring">Recurring</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Cause
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("totalAmount")}
                  >
                    <div className="flex items-center">
                      Amount
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("paymentType")}
                  >
                    <div className="flex items-center">
                      Payment Type
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("donationType")}
                  >
                    <div className="flex items-center">
                      Donation Type
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center">
                      Start Date
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      End Date
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Frequency
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("paymentStatus")}
                  >
                    <div className="flex items-center">
                      Status
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Next Payment
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Payment Method
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      View Details
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Receipts
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDonations.map((donation) => (
                  <tr key={donation._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {donation.items[0]?.title}
                        {donation.items.length > 1 && (
                          <span className="ml-2 text-xs text-accent bg-background px-2 py-0.5 rounded-full">
                            +{donation.items.length - 1} more
                          </span>
                        )}
                      </div>
                      {donation.donorUpdates?.some((u) => u.type === "close-off") && (
                        <span
                          className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-800 border border-green-200"
                          title="The organisation has posted a close-off update for this donation. Open Details to read it."
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Closed off
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ${donation.totalAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-background text-primary border border-accent/10">
                        {donation.paymentType?.charAt(0).toUpperCase() + donation.paymentType?.slice(1) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {donation.items?.[0]?.title?.replace(' - Custom Amount', '') || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(donation.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {donation.paymentType === "recurring" && donation.recurringDetails?.endDate
                        ? new Date(donation.recurringDetails.endDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                        : donation.paymentType === "installments" && donation.installmentDetails?.endDate
                          ? new Date(donation.installmentDetails.endDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                          : donation.paymentType === 'one_time'
                            ? 'N/A'
                            : formatEndDate(donation) || 'Ongoing'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {donation.paymentType === 'recurring'
                        ? donation.recurringDetails?.frequency?.charAt(0).toUpperCase() + donation.recurringDetails?.frequency?.slice(1) || 'N/A'
                        : donation.paymentType === 'installments'
                          ? `Installment `
                          : 'One-time'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                          ${donation.paymentStatus === "completed"
                            ? "bg-background text-accent border border-green-100"
                            : donation.paymentStatus === "processing"
                              ? "bg-yellow-50 text-yellow-700 border border-yellow-100"
                              : donation.paymentStatus === "pending"
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : "bg-red-50 text-red-700 border border-red-100"
                          }`}
                      >
                        {donation.paymentStatus?.charAt(0).toUpperCase() + donation.paymentStatus?.slice(1) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {donation.nextPaymentDate
                        ? new Date(donation.nextPaymentDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                        : donation.recurringDetails?.nextPaymentDate
                          ? new Date(donation.recurringDetails.nextPaymentDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                          : donation.installmentDetails?.nextInstallmentDate
                            ? new Date(donation.installmentDetails.nextInstallmentDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                            : "N/A"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {donation.paymentMethod?.type === 'card' && donation.paymentMethod?.card ? (
                        <div className="flex items-center">
                          <span className="capitalize">{donation.paymentMethod.card.brand || 'Card'}</span>
                          {donation.paymentMethod.card.last4 && (
                            <span className="ml-2 text-gray-500">•••• {donation.paymentMethod.card.last4}</span>
                          )}
                        </div>
                      ) : donation.paymentMethod?.type === 'bank_transfer' || donation.paymentMethod?.type === 'bank_account' ? (
                        <div className="flex items-center">
                          <span>Bank Transfer</span>
                          {donation.paymentMethod?.bank_name && (
                            <span className="ml-2 text-gray-500">({donation.paymentMethod.bank_name})</span>
                          )}
                        </div>
                      ) : donation.paymentMethod?.type === 'paypal' ? (
                        <div className="flex items-center">
                          <span>PayPal</span>
                        </div>
                      ) : donation.paymentMethod?.type ? (
                        <div className="capitalize">{donation.paymentMethod.type.replace(/_/g, ' ')}</div>
                      ) : donation.paymentMethod ? (
                        <div className="capitalize">{typeof donation.paymentMethod === 'string' ? donation.paymentMethod : 'N/A'}</div>
                      ) : 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openDonationModal(donation)}
                        className="flex items-center justify-center px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md border border-gray-200 transition-colors duration-150"
                        title="View Full Details"
                      >
                        <FileText className="w-4 h-4 mr-1.5" />
                        Details
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {!['pending', 'failed', 'cancelled'].includes(donation.paymentStatus) ? (
                        <div className="flex items-center space-x-1">
                          {/* For one-time donations - show Setup Receipt */}
                          {donation.paymentType === "single" || donation.paymentType === "one_time" || !donation.paymentType ? (
                            <button
                              onClick={() =>
                                downloadReceipt(donation, {
                                  logoUrl: logo,
                                  charityLogoUrl: footer2,
                                }, orgInfo)
                              }
                              className="flex items-center justify-center px-3 py-1.5 bg-background hover:bg-accent/10 text-accent text-sm font-medium rounded-md border border-accent/10 transition-colors duration-150"
                              title="Download Receipt"
                            >
                              <Download className="w-4 h-4 mr-1.5" />
                              Receipt
                            </button>
                          ) : null}

                          {/* For recurring/installments - show Paid Receipt only */}
                          {(donation.paymentType === "recurring" || donation.paymentType === "installments") && (
                            <button
                              onClick={() =>
                                downloadPaidPaymentsReceipt(donation, orgInfo)
                              }
                              className="flex items-center justify-center px-3 py-1.5 bg-background hover:bg-accent/10 text-accent text-sm font-medium rounded-md border border-accent/10 transition-colors duration-150"
                              title="Download Paid Payments Receipt"
                            >
                              <Download className="w-4 h-4 mr-1.5" />
                              Receipt
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, sortedDonations.length)} of{" "}
              {sortedDonations.length} donations
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "text-accent hover:bg-background"
                  }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber
                if (totalPages <= 5) {
                  pageNumber = i + 1
                } else if (currentPage <= 3) {
                  pageNumber = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - (4 - i)
                } else {
                  pageNumber = currentPage - 2 + i
                }

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-1 rounded-lg ${currentPage === pageNumber ? "bg-accent text-white" : "text-gray-600 hover:bg-background"
                      }`}
                  >
                    {pageNumber}
                  </button>
                )
              })}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "text-accent hover:bg-background"
                  }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Modal */}
      {modalOpen && selectedDonation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-screen overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Donation #{selectedDonation.donationId}</h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Donation Items</h3>
                <div className="space-y-4">
                  {selectedDonation.items.map((item, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-md font-medium text-gray-900">{item.title}</h4>
                          {item.onBehalfOf && (
                            <p className="text-sm text-gray-600 mt-1">On behalf of: {item.onBehalfOf}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-md font-medium text-gray-900">${item.price.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity || 1}</p>
                          <p className="text-sm text-gray-600">
                            Subtotal: ${(item.price * (item.quantity || 1)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-md font-medium">${selectedDonation.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Type</p>
                    <p className="text-md font-medium capitalize">{selectedDonation.paymentType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="text-md font-medium capitalize">{selectedDonation.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Status</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${selectedDonation.paymentStatus === "completed"
                          ? "bg-accent/10 text-green-800"
                          : selectedDonation.paymentStatus === "processing"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                    >
                      {selectedDonation.paymentStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="text-md font-medium">{new Date(selectedDonation.createdAt).toLocaleDateString()}</p>
                  </div>
                  {selectedDonation.nextPaymentDate && (
                    <div>
                      <p className="text-sm text-gray-500">Next Payment Date</p>
                      <p className="text-md font-medium">
                        {new Date(selectedDonation.nextPaymentDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedDonation.adminCostContribution && selectedDonation.adminCostContribution.included && (
                <div className="border-t pt-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Admin Contribution</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm">
                      You contributed an additional ${selectedDonation.adminCostContribution.amount.toLocaleString()}{" "}
                      towards administrative costs.
                    </p>
                  </div>
                </div>
              )}

              {selectedDonation.paymentType === "recurring" && selectedDonation.recurringDetails && (
                <div className="border-t pt-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Recurring Donation Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    {/* Existing recurring details */}
                    <div>
                      <p className="text-sm text-gray-500">Frequency</p>
                      <p className="text-md font-medium capitalize">{selectedDonation.recurringDetails.frequency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Amount per Payment</p>
                      <p className="text-md font-medium">
                        ${selectedDonation.recurringDetails.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="text-md font-medium capitalize">{selectedDonation.recurringDetails.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p className="text-md font-medium">
                        {new Date(selectedDonation.recurringDetails.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Next Payment Date</p>
                      <p className="text-md font-medium">
                        {new Date(selectedDonation.recurringDetails.nextPaymentDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Payments So Far</p>
                      <p className="text-md font-medium">{selectedDonation.recurringDetails.totalPayments || 0}</p>
                    </div>
                  </div>

                  {/* Add payment history section */}
                  {selectedDonation.recurringDetails.paymentHistory &&
                    selectedDonation.recurringDetails.paymentHistory.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Payment History</h4>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  No.
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Amount
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {selectedDonation.recurringDetails.paymentHistory.map((payment, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {payment.date ? new Date(payment.date).toLocaleDateString() : "N/A"}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                    $
                                    {payment.amount
                                      ? payment.amount.toLocaleString()
                                      : selectedDonation.recurringDetails.amount.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                            ${payment.status === "succeeded"
                                          ? "bg-accent/10 text-green-800"
                                          : payment.status === "processing"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-red-100 text-red-800"
                                        }`}
                                    >
                                      {payment.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {selectedDonation.paymentType === "installments" && selectedDonation.installmentDetails && (
                <div className="border-t pt-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Installment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Number of Installments</p>
                      <p className="text-md font-medium">{selectedDonation.installmentDetails.numberOfInstallments}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Amount per Installment</p>
                      <p className="text-md font-medium">
                        ${selectedDonation.installmentDetails.installmentAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Installments Paid</p>
                      <p className="text-md font-medium">
                        {selectedDonation.installmentDetails.installmentsPaid} of{" "}
                        {selectedDonation.installmentDetails.numberOfInstallments}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Next Installment Date</p>
                      <p className="text-md font-medium">
                        {new Date(selectedDonation.installmentDetails.nextInstallmentDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {selectedDonation.installmentDetails.installmentHistory &&
                    selectedDonation.installmentDetails.installmentHistory.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Payment History</h4>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  No.
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Amount
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {selectedDonation.installmentDetails.installmentHistory.map((payment, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {payment.installmentNumber}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(payment.date).toLocaleDateString()}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                    ${payment.amount.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                   ${payment.status === "completed"
                                          ? "bg-accent/10 text-green-800"
                                          : payment.status === "processing"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-red-100 text-red-800"
                                        }`}
                                    >
                                      {payment.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Donor Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  {selectedDonation.donorDetails && (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="text-md font-medium">{selectedDonation.donorDetails.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-md font-medium">{selectedDonation.donorDetails.email}</p>
                      </div>
                      {selectedDonation.donorDetails.phone && (
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="text-md font-medium">{selectedDonation.donorDetails.phone}</p>
                        </div>
                      )}
                      {selectedDonation.donorDetails.address && (
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="text-md font-medium">
                            {selectedDonation.donorDetails.address.street &&
                              `${selectedDonation.donorDetails.address.street}, `}
                            {selectedDonation.donorDetails.address.city &&
                              `${selectedDonation.donorDetails.address.city}, `}
                            {selectedDonation.donorDetails.address.state &&
                              `${selectedDonation.donorDetails.address.state}, `}
                            {selectedDonation.donorDetails.address.postcode &&
                              selectedDonation.donorDetails.address.postcode}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {selectedDonation.transactionDetails && Object.keys(selectedDonation.transactionDetails).length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Transaction Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedDonation.transactionDetails.stripePaymentIntentId && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-500">Payment ID</p>
                        <p className="text-sm font-mono">{selectedDonation.transactionDetails.stripePaymentIntentId}</p>
                      </div>
                    )}
                    {selectedDonation.transactionDetails.stripeSubscriptionId && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-500">Subscription ID</p>
                        <p className="text-sm font-mono">{selectedDonation.transactionDetails.stripeSubscriptionId}</p>
                      </div>
                    )}
                    {selectedDonation.transactionDetails.stripeCustomerId && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-500">Customer ID</p>
                        <p className="text-sm font-mono">{selectedDonation.transactionDetails.stripeCustomerId}</p>
                      </div>
                    )}
                    {selectedDonation.transactionDetails.stripeStatus && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-500">Transaction Status</p>
                        <p className="text-sm">{selectedDonation.transactionDetails.stripeStatus}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Updates from the organisation */}
              {selectedDonation.donorUpdates && selectedDonation.donorUpdates.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <Bell className="w-4 h-4 mr-2 text-accent" />
                    Updates on Your Donation
                  </h3>
                  <div className="space-y-3">
                    {[...selectedDonation.donorUpdates]
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .map((u, idx) => (
                        <div
                          key={u._id || idx}
                          className={`rounded-lg border p-4 ${
                            u.type === "close-off"
                              ? "border-green-200 bg-green-50"
                              : "border-blue-200 bg-blue-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                u.type === "close-off"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {u.type === "close-off" ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <MessageSquare className="w-3.5 h-3.5" />
                              )}
                              {u.type === "close-off" ? "Completed" : "Progress Update"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(u.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          {u.comment && (
                            <p className="text-sm text-gray-700 whitespace-pre-line">
                              {u.comment}
                            </p>
                          )}
                          {u.images && u.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {u.images.map((img, i) => (
                                <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={img}
                                    alt={`Update ${i + 1}`}
                                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Receipt download button */}
              <div className="flex justify-center space-x-4 pt-4 border-t">
                {/* For one-time donations - show Setup Receipt */}
                {(selectedDonation.paymentType === "single" || selectedDonation.paymentType === "one_time" || !selectedDonation.paymentType) && (
                  <button
                    className="bg-accent hover:bg-accent-light text-white font-medium py-2 px-6 rounded-lg flex items-center"
                    onClick={() => {
                      toast.success("Receipt download initiated")
                      downloadReceipt(selectedDonation, {
                        logoUrl: logo,
                        charityLogoUrl: footer2,
                      }, orgInfo)
                    }}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download Receipt
                  </button>
                )}

                {/* For recurring/installments - show Paid Receipt only */}
                {(selectedDonation.paymentType === "recurring" || selectedDonation.paymentType === "installments") && (
                  <button
                    className="bg-accent hover:bg-accent-light text-white font-medium py-2 px-6 rounded-lg flex items-center"
                    onClick={() => {
                      toast.success("Paid payments receipt download initiated")
                      downloadPaidPaymentsReceipt(selectedDonation, orgInfo)
                    }}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download Receipt
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No donations message */}
      {filteredDonations.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No donations found</h3>
          <p className="text-gray-500">
            {searchTerm || selectedType !== "All"
              ? "Try adjusting your search or filter settings"
              : "You haven't made any donations yet"}
          </p>
        </div>
      )}
    </div>

  )
}

export default UserDonations