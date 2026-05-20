import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";

// Unsplash image constants
const heroBg = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80";
const handpumpImg = "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80";
const tankImg = "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=600&q=80";
const communityImg = "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&q=80";
const filtrationImg = "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80";
const childImg = "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80";
const pipelineImg = "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=600&q=80";
const solarImg = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80";
const newBeginningsImg = "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&q=80";
const b1 = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=80&q=80";
const b2 = "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=80&q=80";
const b3 = "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=80&q=80";
const b4 = "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=80&q=80";
const b5 = "https://images.unsplash.com/photo-1547592180-85f173990554?w=80&q=80";
const soup = "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80";
const drive = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80";

import NewsletterSection from "../Home/Newsletter/newsletter";
import { useCart } from "../Components/cart";
import AutoPlayIframe from "../Components/AutoPlayIframe";
import { getProducts } from "../../services/productService";
import QuickDonate from "../Components/QuickDonate";

const FoodStats = () => {
  const stats = [
    {
      icon: b5,
      title: "300,000 People Fed",
    },
    {
      icon: b2,
      title: "80,900 Iftars Served",
    },
    {
      icon: b3,
      title: "6,000+ People",
      tagline: "Facilitated with Flood Relief Drives",
    },
    {
      icon: b4,
      title: "170,600+ Rations Served",
    },
  ];

  return (
    <div className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-text-dark text-center mb-12">Our Impact in Numbers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center hover:shadow-md transition-shadow"
            >
              <img src={stat.icon} alt={stat.title} className="w-10 h-10 mx-auto mb-4" loading="lazy" />
              <h3 className="text-2xl md:text-3xl font-heading font-bold text-text-dark mb-4">
                {stat.title}
              </h3>
              {stat.tags && (
                <div className="flex flex-wrap justify-center gap-2">
                  {stat.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="bg-[#C9A84C]/10 text-[#8B6914] px-3 py-1 rounded-full text-xs font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {stat.tagline && (
                <p className="mt-3 text-text-muted text-sm font-semibold">{stat.tagline}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
const FoodInitiatives = () => {
  const { addItem } = useCart();
  const [customAmount, setCustomAmount] = useState(70);
  const [adminProducts, setAdminProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFoodProducts = async () => {
      try {
        const response = await getProducts();
        const foodProducts = response.products.filter(product => product.category === 'food');
        setAdminProducts(foodProducts);
      } catch (error) {
        console.error('Error fetching food products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFoodProducts();
  }, []);


  const focusAreas = [
    {
      image: pipelineImg,
      title: "Ration Drives in Pakistan",
      description:
        "The HopeGive Foundation has actively worked on various initiatives to help underprivileged communities in Pakistan, including organizing ration drives for families in need. These drives often aim to provide essential food items and supplies to low-income families, particularly during emergencies, natural disasters, or significant religious events like Ramadan.",
    },
    {
      image: solarImg,
      title: "Ramadan Food Drive in Australia",
      description:
        "The HopeGive Foundation Ramadan Food Drive provides food and essentials to underprivileged families during Ramadan. It aligns with HopeGive's mission of Hope Not Out, focusing on humanitarian aid. The initiative promotes the spirit of giving and engages local donors and volunteers.",
    },
  ];

  const handleCustomAmountChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setCustomAmount(value);
    }
  };

  //scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Hero Section */}
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <HeroOverlay />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">Food Security</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">No family should go hungry</p>
        </div>
      </div>

      <motion.div className="max-w-7xl mx-auto px-6 py-12" {...sectionReveal}>
        {/* Donation heading + product grid commented out - products not loading, QuickDonate handles donations */}
        {/*
        <h2 className="text-3xl font-bold mb-12 text-text-dark">Make a Donation</h2>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
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
                  className="w-full h-72 object-cover"
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

        {/* Mission Statement */}
        <motion.div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center" {...sectionReveal}>
          <div>
            <img
              src={childImg}
              alt="Child with water"
              className="rounded-2xl shadow-md w-full h-auto"
              loading="lazy"
            />
          </div>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-justify text-text-dark">
              We aim to provide immediate healthy food to the underprivileged.
            </h2>
            <p className="text-text-muted text-justify">
              With our vision of providing basic necessities to the
              underprivileged, HopeGive teams work to provide immediate assistance to
              maintain life, improve health and support the morale of the
              affected population.
            </p>
          </div>
        </motion.div>
      </motion.div>

      <QuickDonate image="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80" title="Help Feed a Family" />

      {/* Focus Areas */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <motion.h2 className="text-3xl font-bold mb-12 text-text-dark" {...sectionReveal}>Our Focus Areas</motion.h2>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-8" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Mission Statement with YouTube Video */}
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="rounded-2xl shadow-md w-full h-auto overflow-hidden">
              <AutoPlayIframe
                videoId="hMkPViSTgJQ"
                width="100%"
                height="315"
                title="HopeGive Community Kitchen"
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-justify text-text-dark">
              Strengthening Communities Through Essential Support
            </h2>
            <p className="text-text-muted text-justify">
              The HopeGive Foundation Soup Kitchen offers free,
              nutritious meals to homeless and underprivileged individuals. It
              fosters compassion and supports vulnerable communities in line
              with HopeGive's mission. Volunteers prepare and serve the meals to
              promote inclusivity. Details for participation or donations are
              available on HopeGive's official platforms.
            </p>
          </div>
        </div>
      </div>
      <FoodStats />
      <NewsletterSection />
    </motion.div>
  );
};

export default FoodInitiatives;