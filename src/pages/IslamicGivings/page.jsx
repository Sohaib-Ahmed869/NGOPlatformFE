import React from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { useNavigate } from "react-router-dom";
import { staggerContainer, staggerItem } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";
const IslamicGiving = () => {
  const navigate = useNavigate();
  const givingOptions = [
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-16 h-16 text-primary"
          fill="currentColor"
        >
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z" />
          <path d="M13 7h-2v5.414l3.293 3.293 1.414-1.414L13 11.586z" />
        </svg>
      ),
      onclick: "/Ramadan",
      title: "Ramadan",
      description:
        "Automate your daily sadaqah for the last 10 nights of Ramadan and never miss Laylatul Qadr!",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-16 h-16 text-primary"
          fill="currentColor"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
        </svg>
      ),
      onclick: "/zakat/calculator",

      title: "Zakat Calculator",
      description:
        "Easily calculate your Zakat and fulfill your charitable duties with the HopeGive Foundation's Zakat Calculator.",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <HeroOverlay />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">Islamic Giving</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">Fulfill your charitable duties</p>
        </div>
      </div>
      <div className="bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 ">
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-8" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
            {givingOptions.map((option, index) => (
              <motion.div
                key={index}
                variants={staggerItem}
                className="bg-white p-8 rounded-2xl shadow-sm flex flex-col items-start space-y-10"
              >
                <div className="text-primary">{option.icon}</div>
                <h2 className="text-2xl font-bold">{option.title}</h2>
                <p className="text-gray-600 flex-grow">{option.description}</p>
                <button
                  className="w-full bg-primary text-white py-3 rounded hover:bg-primary-light transition-colors"
                  onClick={() => navigate(option.onclick)}
                >
                  Read More
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      <NewsletterSection />
    </motion.div>
  );
};

export default IslamicGiving;
