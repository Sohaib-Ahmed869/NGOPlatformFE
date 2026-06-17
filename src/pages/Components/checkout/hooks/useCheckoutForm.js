import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import axiosInstance, { getStoragePrefix } from "../../../../services/axios";
import { validateDonor } from "../utils";

const EMPTY_FORM = {
  name: "", phone: "", email: "", streetAddress: "", townCity: "", state: "", postcode: "",
  rememberDetails: false, agreeToMessages: false,
};

const EMPTY_INDICATOR = {
  name: false, phone: false, email: false,
  address: { street: false, city: false, state: false, postalCode: false },
};

// Owns donor contact details: prefilling from the saved profile, validation,
// and writing changes back to the user's account.
export default function useCheckoutForm({ user }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [savedDataIndicator, setSavedDataIndicator] = useState(EMPTY_INDICATOR);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const prefillFormWithUserData = (profileData) => {
    if (!profileData) return;
    let fullName = "";
    if (profileData.name) fullName = profileData.name;
    else if (profileData.firstName || profileData.lastName) fullName = `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim();
    const address = profileData.address || {};
    const newFormData = {
      name: fullName, phone: profileData.phone || "", email: profileData.email || "",
      streetAddress: address.street || "", townCity: address.city || "", state: address.state || "",
      postcode: address.postalCode || "", rememberDetails: true, agreeToMessages: profileData.agreeToMessages || false,
    };
    const fieldsPreFilled = {
      name: Boolean(fullName), phone: Boolean(profileData.phone), email: Boolean(profileData.email),
      address: { street: Boolean(address.street), city: Boolean(address.city), state: Boolean(address.state), postalCode: Boolean(address.postalCode) },
    };
    const hasPreFilledData =
      fieldsPreFilled.name || fieldsPreFilled.phone || fieldsPreFilled.email || Object.values(fieldsPreFilled.address).some(Boolean);
    setFormData(newFormData);
    setSavedDataIndicator(fieldsPreFilled);
    if (hasPreFilledData && !window.__profileToastShown) {
      window.__profileToastShown = true;
      toast.success("We've filled some information from your saved profile");
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem(getStoragePrefix() + "token");
      const response = await axiosInstance.get("/users/me", { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.status === "Success") prefillFormWithUserData(response.data.user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    if (user) fetchUserProfile();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateDonorDetails = () => {
    const newErrors = validateDonor(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // "Remember my details" — push the form back onto the user's profile.
  const handleUpdateProfile = async () => {
    if (!user || !formData.rememberDetails) return;
    try {
      setIsUpdatingProfile(true);
      const validationErrors = validateDonor(formData);
      if (formData.postcode && formData.postcode.trim() === "") validationErrors.postcode = "Postal code cannot be an empty string";
      if (Object.keys(validationErrors).length > 0) {
        Object.values(validationErrors).forEach((error) => toast.error(error));
        return;
      }
      const nameParts = formData.name.trim().split(" ");
      const updatePayload = {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" ") || "",
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: { street: formData.streetAddress.trim(), city: formData.townCity.trim(), state: formData.state.trim(), postalCode: formData.postcode.trim() },
        agreeToMessages: formData.agreeToMessages,
      };
      const response = await axiosInstance.put("/users/update", updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem(getStoragePrefix() + "token")}`, "Content-Type": "application/json" },
        timeout: 10000,
      });
      if (response.data.status === "Success") {
        toast.success("Profile updated successfully");
        fetchUserProfile();
      } else {
        toast.error(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      if (error.response) {
        toast.error(error.response.data.message || error.response.data.error || "Server error occurred while updating profile");
      } else if (error.request) {
        toast.error("No response received from server");
      } else {
        toast.error("Error setting up profile update request");
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return {
    formData, setFormData,
    errors,
    savedDataIndicator,
    isUpdatingProfile,
    handleInputChange,
    validateDonorDetails,
    handleUpdateProfile,
  };
}
