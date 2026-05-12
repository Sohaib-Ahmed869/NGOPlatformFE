import React from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { sectionReveal, staggerContainer, staggerItem } from "../../utils/animations";

// Placeholder partner images (nonprofit / charity themed)
const logo1 = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=300&q=80";
const logo2 = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=300&q=80";
const logo3 = "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=300&q=80";
const logo4 = "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=300&q=80";
const logo5 = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=300&q=80";
const logo6 = "https://images.unsplash.com/photo-1497375638960-ca368c7231e4?w=300&q=80";
const logo7 = "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=300&q=80";
const logo8 = "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=300&q=80";
const logo9 = "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=300&q=80";
const logo10 = "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=300&q=80";
const logo11 = "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=300&q=80";
const logo12 = "https://images.unsplash.com/photo-1526958097901-5e6d742d3371?w=300&q=80";

const PartnersSection = () => {
  const partners = [
    { logo: logo1, name: "Community Aid Network" },
    { logo: logo2, name: "Bright Futures Foundation" },
    { logo: logo3, name: "Unity Education Trust" },
    { logo: logo4, name: "Global Relief Alliance" },
    { logo: logo5, name: "Hope Bridge Initiative" },
    { logo: logo6, name: "Compassion Partners" },
    { logo: logo7, name: "Impact Giving Foundation" },
    { logo: logo8, name: "Community Sports League" },
    { logo: logo9, name: "Cultural Heritage Group" },
    { logo: logo10, name: "Humanity First Foundation" },
    { logo: logo11, name: "Brothers in Need" },
    { logo: logo12, name: "Multicultural Community Group" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4A3F30]/85 to-[#4A3F30]/65" />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">Our Partners</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">Organizations making change together</p>
        </div>
      </div>

      <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20" {...sectionReveal}>
        <p className="text-sm mb-2">About Us</p>
        <h2 className="text-4xl font-bold mb-16">
          We are proudly partnered with
        </h2>

        <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
          {partners.map((partner, index) => (
            <motion.div key={index} variants={staggerItem} className="flex flex-col items-center bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-all duration-300">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 flex items-center justify-center border border-gray-100">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="w-full h-full object-cover"
                   loading="lazy"
                />
              </div>
              <p className="text-center font-medium text-text-dark">{partner.name}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      <NewsletterSection />
    </motion.div>
  );
};

export default PartnersSection;
