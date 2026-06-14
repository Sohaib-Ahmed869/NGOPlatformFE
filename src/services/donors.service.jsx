import axiosInstance from "./axios";

const ITEMS_PER_PAGE = 10;

// The dashboard stats and the DEFAULT (param-less) donors list are cached per
// session. The donors endpoint is server-side filtered / sorted / paginated, so
// only the default load is cached: any non-default query (search, sort, page or
// type) bypasses the cache and never overwrites it. Per-donor details and the
// CSV export always fetch fresh.
let _statsCache = null;
let _statsInFlight = null;
let _listCache = null;

const isDefaultQuery = ({ page, search, sortConfig, type }) =>
  page === 1 &&
  !search &&
  sortConfig.key === "totalDonated" &&
  sortConfig.direction === "desc" &&
  (!type || type === "All");

const donorsService = {
  // Synchronous peeks at the cached default data (null until loaded) — let the
  // screen render instantly on revisits within a session.
  getCachedStats: () => _statsCache,
  getCachedList: () => _listCache,

  stats: ({ force = false } = {}) => {
    if (_statsCache && !force) return Promise.resolve(_statsCache);
    if (_statsInFlight && !force) return _statsInFlight;
    _statsInFlight = axiosInstance
      .get(`/admin/donors/dashboard/stats`)
      .then((res) => {
        _statsCache = res.data;
        _statsInFlight = null;
        return _statsCache;
      })
      .catch((err) => {
        _statsInFlight = null;
        throw err;
      });
    return _statsInFlight;
  },

  list: ({
    page = 1,
    search = "",
    sortConfig = { key: "totalDonated", direction: "desc" },
    type = "All",
    force = false,
  } = {}) => {
    const isDefault = isDefaultQuery({ page, search, sortConfig, type });
    if (isDefault && _listCache && !force) return Promise.resolve(_listCache);

    const params = new URLSearchParams({
      page,
      limit: ITEMS_PER_PAGE,
      search,
      sortBy: sortConfig.key,
      sortOrder: sortConfig.direction,
    });
    if (type && type !== "All") params.set("type", type);

    return axiosInstance.get(`/admin/donors?${params}`).then((res) => {
      // Only the default load seeds the cache; filtered queries leave it intact.
      if (isDefault) _listCache = res.data;
      return res.data;
    });
  },

  details: (donorId) =>
    axiosInstance.get(`/admin/donors/${donorId}`).then((res) => res.data),

  exportAll: ({ search = "", sortConfig, type } = {}) => {
    const params = new URLSearchParams({
      search,
      sortBy: sortConfig.key,
      sortOrder: sortConfig.direction,
      limit: 100000,
    });
    if (type && type !== "All") params.set("type", type);
    return axiosInstance
      .get(`/admin/donors?${params}`)
      .then((res) => res.data.data.donors);
  },
};

export default donorsService;
