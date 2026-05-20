import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { sectionReveal, slideInRight } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";

const hopeImg = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80";
import axiosInstance from "../../services/axios";
import { toast } from "react-hot-toast";
const Hope = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    age: "",
    gender: "",
    address: "",
    skills: "",
    availableDays: [],
  });

  //take to the top of the page when component is mounted
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.availableDays.length === 0) {
        return toast.error("Please select at least one day");
      }
      if (!formData.firstName || !formData.lastName) {
        return toast.error("Please enter your full name");
      }
      if (!formData.email) {
        return toast.error("Please enter your email");
      }
      if (!formData.phoneNumber) {
        return toast.error("Please enter your phone number");
      }
      if (!formData.age) {
        return toast.error("Please enter your age");
      }
      if (!formData.gender) {
        return toast.error("Please enter your gender");
      }
      if (!formData.address) {
        return toast.error("Please enter your address");
      }
      if (!formData.skills) {
        return toast.error("Please enter your skills");
      }

      const res = await axiosInstance.post("/join", formData);
      console.log(res);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        age: "",
        gender: "",
        address: "",
        skills: "",
        availableDays: [],
      });
      toast.success("Form submitted successfully");
    } catch (error) {
      toast.error("Please try again");
      console.log;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <HeroOverlay />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">Team Hope</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">Join our volunteer community</p>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row justify-between gap-8 py-20 px-6 lg:px-20 mx-auto max-w-7xl">
        <motion.div className="lg:w-1/2" {...sectionReveal}>
          <h1 className="text-4xl font-bold mb-8">Join our team</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">First Name *</label>
                <input
                  type="text"
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Last Name *</label>
                <input
                  type="tel"
                  className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone Number *</label>
                <input
                  type="tel"
                  className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    // Replace any non-numeric characters with an empty string
                    const numericValue = e.target.value.replace(/[^0-9]/g, "");

                    setFormData({
                      ...formData,
                      phoneNumber: numericValue,
                    });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Age *</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Gender *</label>
                <select
                  className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Address</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-xl p-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                What skills or experience do you have?
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-xl p-2 h-24 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={formData.skills}
                onChange={(e) =>
                  setFormData({ ...formData, skills: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm mb-2">
                Which days of the week are you available?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <label key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={formData.availableDays.includes(day)}
                      onChange={() => handleDayToggle(day)}
                    />
                    <span className="text-sm">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-light transition-colors font-semibold shadow-md"
            >
              Submit
            </button>
          </form>

          <div className="mt-8 text-white p-6 sm:p-8 md:p-10 rounded-2xl w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] mx-auto bg-gradient-to-r from-primary to-primary-light shadow-md border border-primary/30 h-[200px] sm:h-[220px] md:h-[240px] flex flex-col justify-center">
            <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 md:mb-5">
              Create Meaningful Change
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              Our volunteers are the backbone of HopeGive Foundation's
              success, creating waves and positive change for those
              who need it most. As a volunteer with us, you will be not only
              changing lives, but receive a rewarding and indescribable feeling
              you will remember forever.
            </p>
          </div>
        </motion.div>

        <motion.div className="lg:w-1/2 lg:relative" {...slideInRight} initial={slideInRight.initial} whileInView={slideInRight.animate} viewport={{ once: true }} transition={slideInRight.transition}>
          <img
            src={hopeImg}
            alt="Volunteers"
            className="w-full h-auto rounded-2xl hidden lg:block shadow-md"
            loading="lazy"
          />
        </motion.div>
      </div>
      <NewsletterSection />
    </motion.div>
  );
};

export default Hope;
