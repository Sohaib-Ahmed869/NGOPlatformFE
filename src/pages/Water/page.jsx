import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";

// Unsplash image constants
const heroBg = "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=1200&q=80";
const handpumpImg = "https://images.unsplash.com/photo-1594398901394-4e34939a4fd0?w=600&q=80";
const tankImg = "https://images.unsplash.com/photo-1581888227599-779811939961?w=600&q=80";
const communityImg = "https://images.unsplash.com/photo-1519455953755-af066f52f1a6?w=600&q=80";
const filtrationImg = "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600&q=80";
const childImg = "https://images.unsplash.com/photo-1538300342682-cf57afb97285?w=600&q=80";
const pipelineImg = "https://images.unsplash.com/photo-1594398901394-4e34939a4fd0?w=600&q=80";
const solarImg = "https://images.unsplash.com/photo-1581888227599-779811939961?w=600&q=80";
const newBeginningsImg = "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&q=80";
const smalltank = "https://images.unsplash.com/photo-1519455953755-af066f52f1a6?w=600&q=80";

import { useCart } from "../Components/cart";
import { getProducts } from "../../services/productService";

// Import our custom autoplay component
import AutoPlayIframe from "../Components/AutoPlayIframe";
import QuickDonate from "../Components/QuickDonate";

const WaterInitiatives = () => {
  // Scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { addItem } = useCart();
  const [adminProducts, setAdminProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWaterProducts = async () => {
      try {
        const response = await getProducts();
        const waterProducts = response.products.filter(product => product.category === 'water');
        setAdminProducts(waterProducts);
      } catch (error) {
        console.error('Error fetching water products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWaterProducts();
  }, []);

  const focusAreas = [
    {
      image: pipelineImg,
      title: "Water Pipelines",
      description:
        "We faced significant challenges installing water pipelines within villages and camps without electricity. Despite this, we successfully laid multiple pipelines providing thousands of gallons of water daily to local communities.",
    },
    {
      image: solarImg,
      title: "Solar Panels",
      description:
        "We have started installing solar panels to ensure communities have access to water while reducing harmful emissions from generator use. Our water tank at Khajuri Bazar KPK provides 10,000 gallons of water to 5,000 households.",
    },
    {
      image: newBeginningsImg,
      title: "Clean Water, New Beginnings",
      description:
        "Our clean water initiatives, from R.O plants in Balochistan to handpumps in Sindh, are transforming lives by providing access to something as fundamental as clean water.",
    },
  ];

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Hero Section */}
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1519455953755-af066f52f1a6?auto=format&fit=crop&w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <HeroOverlay />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">Clean Water</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">Access to safe water for all</p>
        </div>
      </div>

      <motion.div className="max-w-7xl mx-auto px-6 py-12" {...sectionReveal}>
        {/* Donation heading + product grid commented out - products not loading, QuickDonate handles donations */}
        {/*
        <h2 className="text-3xl font-bold mb-12 text-text-dark">Make a Donation</h2>
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
          {!loading && adminProducts.map((product) => (
            <motion.div
              key={product._id}
              variants={staggerItem}
              className="bg-surface rounded-2xl shadow-md overflow-hidden flex flex-col"
            >
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-4 flex-grow">
                <p className="text-xl font-bold mb-2 text-text-dark">${product.price}</p>
                <h3 className="font-bold mb-2 text-justify text-text-dark">{product.title}</h3>
                <p className="text-text-muted text-sm text-justify">{product.description}</p>
              </div>
              <div className="p-4 mt-auto">
                <button
                  className="w-full bg-primary text-white py-2 rounded-2xl hover:bg-primary-light transition-colors"
                  onClick={() =>
                    addItem({
                      id: `product-${product._id}`,
                      title: product.title,
                      price: product.price,
                      image: product.image,
                    })
                  }
                >
                  Donate Now
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
        */}

        <motion.div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center" {...sectionReveal}>
          <div>
            <div className="rounded-2xl shadow-md w-full h-auto overflow-hidden">
              <AutoPlayIframe
                videoId="BCHhwanvFl0"
                width="100%"
                height="315"
                title="HopeGive Child with Water"
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-justify text-text-dark">
              We aim to help procure and provide water facilities to people in need.
            </h2>
            <p className="text-text-muted text-justify">
              Millions of people in Pakistan have limited or no access to water,
              making life difficult for them. Furthermore, a lack of access to
              clean water leads to many health-related issues. For HopeGive, it is
              one of our goals to help procure and provide clean water
              facilities to people in need.
            </p>
          </div>
        </motion.div>
      </motion.div>

      <QuickDonate image="https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&q=80" title="Provide Clean Water" />

      {/* Focus Areas */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <motion.h2 className="text-3xl font-bold mb-12 text-text-dark" {...sectionReveal}>Our Focus Areas</motion.h2>
        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
          {focusAreas.map((area, index) => (
            <motion.div key={index} variants={staggerItem} className="bg-surface rounded-2xl shadow-md overflow-hidden">
              <img
                src={area.image}
                alt={area.title}
                className="w-full h-56 object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <h3 className="text-xl font-bold text-justify text-text-dark">{area.title}</h3>
                <p className="text-text-muted text-justify mt-2">{area.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default WaterInitiatives;