// services/profile.service.js
import axios from "./axios";

class ProfileService {
  static BASE_URL = "/profile";
  static base_url="/users"
  static async getProfile() {
    try {
      const response = await axios.get(this.BASE_URL);
      return response.data.profile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error.response?.data || error.message;
    }
  }

  static async updateProfile(profileData) {
    try {
      console.log("Updating profile with data:", profileData);
      const response = await axios.put(this.BASE_URL, profileData);
      return response.data.profile;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error.response?.data || error.message;
    }
  }

  static async updateNotifications(notificationSettings) {
    try {
      const response = await axios.put(
        `${this.BASE_URL}/notifications`,
        notificationSettings
      );
      return response.data;
    } catch (error) {
      console.error("Error updating notifications:", error);
      throw error.response?.data || error.message;
    }
  }

  static async updatePassword(passwordData) {
    try {
      const response = await axios.put(
        `${this.base_url}/update-password`,
        passwordData
      );
      return response.data;
    } catch (error) {
      console.error("Error updating password:", error);
      throw error.response?.data || error.message;
    }
  }
  

  static async uploadProfileImage(imageFile) {
    try {
      const formData = new FormData();
      formData.append("profileImage", imageFile);

      const response = await axios.post(`${this.BASE_URL}/image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw error.response?.data || error.message;
    }
  }

  static async updateTwoFactor(enabled) {
    try {
      const response = await axios.put(`${this.BASE_URL}/2fa`, { enabled });
      return response.data;
    } catch (error) {
      console.error("Error updating 2FA:", error);
      throw error.response?.data || error.message;
    }
  }

  static async signOutAllDevices() {
    try {
      const response = await axios.post(`${this.BASE_URL}/signout-all`);
      return response.data;
    } catch (error) {
      console.error("Error signing out all devices:", error);
      throw error.response?.data || error.message;
    }
  }
}

export default ProfileService;
