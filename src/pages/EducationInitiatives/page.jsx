import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../utils/animations";

// Unsplash image constants
const image1 = "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80";
const donateImage1 = "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=80";
const donateImage2 = "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80";
const donateImage3 = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80";
const donateImage4 = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80";
const girlsStudying = "https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80";
const focus1 = "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&q=80";
const focus2 = "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=600&q=80";
const focus3 = "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80";
const schoolImage = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80";
const b1 = "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=80&q=80";
const b2 = "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=80&q=80";
const b3 = "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=80&q=80";
const b4 = "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=80&q=80";
const b5 = "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=80&q=80";

import NewsletterSection from "../Home/Newsletter/newsletter";
import { useCart } from "../Components/cart";
import AutoPlayIframe from "../Components/AutoPlayIframe";
import { getProducts } from "../../services/productService";
import QuickDonate from "../Components/QuickDonate";

const EducationStats = () => {
  //scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const stats = [
    {
      icon: b1,
      title: "21 Schools",
      tags: [
        "14 IN KARACHI",
        "3 IN AZAD KASHMIR",
        "2 IN NOWSHERA",
        "1 IN LAHORE",
        "1 IN FAISALABAD",
      ],
    },
    {
      icon: b2,
      title: "6,500+ Students",
      tags: ["2,555 GIRLS", "2,393 BOYS"],
    },
    {
      icon: b3,
      title: "240+ Teachers",
      tags: ["45 NON-TEACHING STAFF"],
    },
    {
      icon: b4,
      title: "9 New Schools",
      tags: ["HAVE BEEN SCOUTED FOR ADOPTION"],
    },
    {
      icon:b5,
      title:"3 Skill Development Centres",
      tags:[
        "1 in Faisalabad",
        "1 in Tharparkar",
        "1 in Landi Kotal"
      ]
    }
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const EducationInitiatives = () => {
  const { addItem } = useCart();
  const [adminProducts, setAdminProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEducationProducts = async () => {
      try {
        const response = await getProducts();
        const educationProducts = response.products.filter(product => product.category === 'education');
        setAdminProducts(educationProducts);
      } catch (error) {
        console.error('Error fetching education products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEducationProducts();
  }, []);

  const focusAreas = [
    {
      image: focus1,
      title: "Community schooling system",
      description:
        "We aim to foster knowledge and non-cognitive development to bring change in lives, equipping them with the values and skills to thrive in all aspects of life.",
    },
    {
      image: focus2,
      title: "Awareness Initiatives",
      description:
        "We provide family counseling services, psychological care, and care for students, medical camps, and providing professional capacity building training to staff.",
    },
    {
      image: focus3,
      title: "Professional Development Programs",
      description:
        "Our program empowers teachers to support students by sharing innovative teaching methods, building skills, and fostering mentorship.",
    },
  ];

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Hero Section */}
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4A3F30]/85 to-[#4A3F30]/65" />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">Education</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">Building futures through learning</p>
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

        {/* Mission Statement Section */}
        <motion.div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center" {...sectionReveal}>
          <div>
            <img
              src={girlsStudying}
              alt="Girls studying"
              className="rounded-2xl shadow-md w-full h-auto"
              loading="lazy"
            />
          </div>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-justify text-text-dark">
              We aim to educate every child in every corner of the country, who
              are deprived of quality education in order to steer Pakistan
              forward.
            </h2>
            <p className="text-text-muted text-justify">
              We believe that in order to progress further it's imperative that
              education for girls becomes our goal and with this in mind, we
              have set out to achieve our mission.
            </p>
          </div>
        </motion.div>
      </motion.div>

      <QuickDonate image="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80" title="Support Education Today" />

      {/* Focus Areas Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <motion.h2 className="text-3xl font-bold mb-12 text-text-dark" {...sectionReveal}>Our Focus Areas</motion.h2>

        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
          {focusAreas.map((area, index) => (
            <motion.div key={index} variants={staggerItem} className="bg-surface rounded-2xl shadow-md overflow-hidden">
              <img
                src={area.image}
                alt={area.title}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <h3 className="font-bold text-lg text-justify text-text-dark">{area.title}</h3>
                <p className="text-text-muted text-sm text-justify mt-2">{area.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Mission Statement with YouTube Video */}
          <div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="rounded-2xl shadow-md w-full h-auto overflow-hidden">
                <AutoPlayIframe
                  videoId="hMkPViSTgJQ"
                  width="100%"
                  height="315"
                  title="HopeGive Education Mission"
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-justify text-text-dark">
                Education remains at the heart of our mission
              </h2>
              <p className="text-text-muted text-justify">
                Through our incentive for Education program, we are not only
                supporting students academically but also ensuring our families
                are nourished and thriving. Our Skills Development program
                continues to offer young people the tools to shape their futures
                and become valuable contributors to society.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <EducationStats />
      <NewsletterSection />
    </motion.div>
  );
};

export default EducationInitiatives;