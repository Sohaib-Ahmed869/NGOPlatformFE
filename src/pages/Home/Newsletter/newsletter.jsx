import React, { useState } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../../../services/axios";
import toast from "react-hot-toast";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post("/newsletter", {
        email,
      });
      console.log(response.data);
      toast.success("Subscribed successfully!");
      setEmail("");
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    }
  };

  return (
    <section className="bg-background py-20 px-6">
      <motion.div
        className="max-w-2xl mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-text-dark mb-4">
          Stay Connected. Stay Inspired.
        </h2>
        <p className="text-text-muted mb-8">
          Get monthly updates on our projects and the lives you're changing.
        </p>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address..."
            className="flex-grow px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-primary bg-white min-w-0"
            required
          />
          <button
            type="submit"
            className="bg-accent text-text-dark font-semibold px-8 py-3 rounded-xl hover:bg-accent-light transition-colors whitespace-nowrap"
          >
            Subscribe
          </button>
        </form>
      </motion.div>
    </section>
  );
};

export default NewsletterSection;
