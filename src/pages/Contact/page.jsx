import React, { useState } from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { sectionReveal, slideInRight } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";

const touch = "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80";
import axios from "../../services/axios";
import toast from "react-hot-toast";
import { useTenant } from "../../context/TenantContext";

const Contact = () => {
  const { organisation } = useTenant();
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    purpose: "General",
    hostCity: "",
    wouldLikeToHost: "Partner with Us",
    description: "",
    numberOfGuests: "",
    minimumDonation: "",
  });

  const resetForm = () => {
    setFormData({
      fullName: "",
      phoneNumber: "",
      email: "",
      purpose: "General",
      hostCity: "",
      wouldLikeToHost: "Partner with Us",
      description: "",
      numberOfGuests: "",
      minimumDonation: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields based on the purpose
    if (
      !formData.fullName ||
      !formData.phoneNumber ||
      !formData.email ||
      !formData.description
    ) {
      toast.error("Please fill all the required fields");
      return;
    }

    // Additional validation for "Collaborate with us" purpose
    if (
      formData.purpose === "Collaborate with us" &&
      (!formData.hostCity ||
        !formData.numberOfGuests ||
        !formData.minimumDonation)
    ) {
      toast.error("Please fill all the required fields");
      return;
    }

    try {
      const res = await axios.post("/contact", formData);
      console.log(res);
      resetForm();
      toast.success("Form submitted successfully");
    } catch (error) {
      toast.error("Something went wrong");
      console.log(error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <HeroOverlay />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">Get In Touch</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">We would love to hear from you</p>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row justify-between gap-8 py-20 px-6 lg:px-20 mx-auto max-w-7xl">
        <motion.div className="lg:w-1/2" {...sectionReveal}>
          <h1 className="text-4xl font-bold mb-8">Get in touch</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Phone Number<span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, phoneNumber: numericValue });
                  }}
                  placeholder="Phone Number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">
                Email address<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="fullname@email.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                Purpose<span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
              >
                <option value="General">General</option>
                <option value="Collaborate with us">Collaborate with us</option>
              </select>
            </div>

            {formData.purpose === "Collaborate with us" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">
                      Host City<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={formData.hostCity}
                      onChange={(e) =>
                        setFormData({ ...formData, hostCity: e.target.value })
                      }
                      placeholder="Sydney"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">
                      Would like to host<span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={formData.wouldLikeToHost}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wouldLikeToHost: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Option</option>
                      <option value="Partner">Partner with Us</option>
                      <option value="Community Event">Community Event</option>
                      <option value="Full Collaboration">Full Collaboration</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">
                      Number of Guests<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={formData.numberOfGuests}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, "");
                        setFormData({
                          ...formData,
                          numberOfGuests: numericValue,
                        });
                      }}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">
                      Minimum Donation Amount
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={formData.minimumDonation}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, "");
                        setFormData({
                          ...formData,
                          minimumDonation: numericValue,
                        });
                      }}
                      placeholder="$100"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm mb-1">
                {formData.purpose === "Collaborate with us"
                  ? "Please share details about yourself/your business"
                  : "How can we help you?"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-xl p-2 h-24 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={
                  formData.purpose === "Collaborate with us"
                    ? "Please share details about yourself/your business"
                    : "Tell us how we can help you"
                }
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-light transition-colors font-semibold shadow-md"
            >
              Submit
            </button>
          </form>
        </motion.div>

        <motion.div className="lg:w-1/2" {...slideInRight} initial={slideInRight.initial} whileInView={slideInRight.animate} viewport={{ once: true }} transition={slideInRight.transition}>
          {/* Show image only on large screens */}
          <img
            src={touch}
            alt="Contact Us"
            className="w-full h-auto rounded-2xl hidden lg:block shadow-md"
             loading="lazy"
          />
          <div className="text-white p-6 rounded-2xl bg-gradient-to-r from-primary to-primary-light mt-4 lg:mt-6 shadow-md">
            <h2 className="text-2xl font-bold mb-4">CONTACT US</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {/* Phone icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 
                      2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091
                      l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293
                      c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143
                      c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173
                      L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 
                      002.25 4.5v2.25z"
                  />
                </svg>
                <span>{organisation?.contactPhone || "Contact us"}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Email icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 
                      0 01-2.25 2.25h-15a2.25 2.25 0 
                      01-2.25-2.25V6.75m19.5 0A2.25 
                      2.25 0 0019.5 4.5h-15a2.25 2.25 
                      0 00-2.25 2.25m19.5 0v.243a2.25 
                      2.25 0 01-1.07 1.916l-7.5 4.615a2.25 
                      2.25 0 01-2.36 0L3.32 8.91a2.25 
                      2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                <span>{organisation?.contactEmail || "Contact us"}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <NewsletterSection />
    </motion.div>
  );
};

export default Contact;
