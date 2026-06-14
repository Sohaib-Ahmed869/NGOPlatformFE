import axios from "./axios";

// Donation-types list is cached per session + de-duped. Mutations invalidate
// the cache so the next list() (or a forced refetch) pulls fresh data.
let _cache = null; // array of donation types
let _inFlight = null;

export default {
  // Peek at the cached list without triggering a request.
  getCached() {
    return _cache;
  },

  // Cached list loader — returns the SAME array shape the screen renders.
  list({ force = false } = {}) {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axios
      .get("/donationtypes")
      .then((res) => {
        _cache = res.data?.success ? res.data.data || [] : [];
        _inFlight = null;
        return _cache;
      })
      .catch((err) => {
        _inFlight = null;
        throw err;
      });
    return _inFlight;
  },

  async create(donationTypeData) {
    try {
      const response = await axios.post("/donationtypes", donationTypeData);
      _cache = null;
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async getAll() {
    try {
      const response = await axios.get("/donationtypes");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async getById(id) {
    try {
      const response = await axios.get(`/donationtypes/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async update(id, donationTypeData) {
    try {
      const response = await axios.put(`/donationtypes/${id}`, donationTypeData);
      _cache = null;
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async delete(id) {
    try {
      const response = await axios.delete(`/donationtypes/${id}`);
      _cache = null;
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Persist a new display order (array of ids in the desired order).
  async reorder(ids) {
    try {
      const response = await axios.put("/donationtypes/reorder", { ids });
      _cache = null;
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  handleError(error) {
    if (error.response) {
      throw new Error(error.response.data.message || "An error occurred");
    }
    throw new Error("Network error occurred");
  },
};