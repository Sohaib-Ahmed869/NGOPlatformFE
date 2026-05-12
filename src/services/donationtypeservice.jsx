import axios from "./axios";

export default {
  async create(donationTypeData) {
    try {
      const response = await axios.post("/donationtypes", donationTypeData);
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
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async delete(id) {
    try {
      const response = await axios.delete(`/donationtypes/${id}`);
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