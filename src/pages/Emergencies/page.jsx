import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";
import usePageContent from "../../hooks/usePageContent";

// Unsplash image constants
const heroBg = "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&q=80";
const handpumpImg = "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=600&q=80";
const tankImg = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80";
const communityImg = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80";
const filtrationImg = "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80";
const childImg = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80";
const pipelineImg = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80";
const solarImg = "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80";
const beirut = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80";
const palestine = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80";
const floodrelief = "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80";

import { useCart } from "../Components/cart";
import { getProducts } from "../../services/productService";

import NewsletterSection from "../Home/Newsletter/newsletter";
import AutoPlayIframe from "../Components/AutoPlayIframe";
import QuickDonate from "../Components/QuickDonate";

const EmergenciesInitiatives = () => {
  //scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { addItem } = useCart();
  const [adminProducts, setAdminProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { content } = usePageContent("emergencies");
  const hero = content?.hero || {};
  const mission = content?.mission || {};
  const donateBanner = content?.donateBanner || {};

  useEffect(() => {
    const fetchEmergencyProducts = async () => {
      try {
        const response = await getProducts();
        const emergencyProducts = response.products.filter(product => product.category === 'emergencies');
        setAdminProducts(emergencyProducts);
      } catch (error) {
        console.error('Error fetching emergency products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmergencyProducts();
  }, []);


  const defaultFocusAreas = [
    {
      image: beirut,
      title: "Beirut Crisis Appeal",
      description:
        "The fallout from the explosions in Beirut was exponential as people were left struggling to access food and safe spaces. HopeGive Foundation rushed its support to the affected and partnered with AusRelief. Together we were able to present a cheque of AUD 5,000 on behalf of donors from the community to help relief activities as part of Beirut Crisis Appeal. Photo credit: Hussen Malla, Al-Jazeera",
    },
    {
      image: childImg,
      title: "Australian Bushfires Support",
      description:
        "We paid a visit to the NSW Rural Fire Services Headquarters (Penrith) where the RFS officials apprised the HopeGive Foundation team regarding the state of bushfire in NSW. We continued to coordinate with RFS. and donated drinking water and other essential items that were needed at that point in time by the victims of the calamitous fire to ensure together it's Hope Not Out for everyone in Australia.",
    },
    {
      image: pipelineImg,
      title: "COVID 19 Support in Australia",
      description:
        "During COVID-19, HopeGive Foundation provided food packs that sustained 36,000 families in Pakistan for over two weeks, including Hindu and Christian minorities. We also extended aid to underprivileged communities in Bangladesh, while in Australia, we supported families and students in Sydney, Melbourne, Perth, and Hobart bringing relief and hope where it was needed most.",
    },
    {
      image: solarImg,
      title: "Turkey Emergency Appeal",
      description:
        "Our brothers and sisters in Turkey and Syria were struck by an earthquake which caused many buildings to collapse, resulting in millions of dollars worth of damage. Thousands were injured, and hundreds lost their lives. We worked alongside our implementation partners to deliver emergency relief in Turkey and Syria during this time of crisis.",
    },
  ];
  const focusAreas = content?.focusAreas?.length ? content.focusAreas : defaultFocusAreas;

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Hero Section */}
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src={hero.image ?? "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1600&q=80"} alt="" className="w-full h-full object-cover" />
          <HeroOverlay />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">{hero.title ?? "Emergency Relief"}</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">{hero.subtitle ?? "Rapid response when it matters most"}</p>
        </div>
      </div>

      <motion.div className="max-w-7xl mx-auto px-6 py-12" {...sectionReveal}>
        {/* Donation heading + product grid commented out - products not loading, QuickDonate handles donations */}
        {/*
        <h2 className="text-3xl font-bold mb-12 text-text-dark">Make a Donation</h2>

        <motion.div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
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
                  className="w-full h-96 object-cover"
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
                videoId="X3fHYz1fN6c"
                width="100%"
                height="315"
                title="HopeGive Emergency Relief"
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-justify text-text-dark">
              {mission.heading ?? "We aim to provide immediate healthy food to the underprivileged."}
            </h2>
            <p className="text-text-muted text-justify">
              {mission.text ??
                "In Chakwal, Punjab, essential rations were distributed to underserved families for a month, providing food security. We are also in the process of construction of fifteen homes for underprivileged widows in Hoshab, Balochistan, also advanced with support from Australian donors. These efforts highlight HopeGive's commitment to rebuilding lives and fostering resilience in communities facing hardship."}
            </p>
          </div>
        </motion.div>
      </motion.div>

      <QuickDonate image={donateBanner.image ?? "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80"} title={donateBanner.title ?? "Support Emergency Relief"} />

      {/* Focus Areas */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <motion.h2 className="text-3xl font-bold mb-12 text-text-dark" {...sectionReveal}>{content?.focusHeading ?? "Our Previous Projects"}</motion.h2>

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

      <NewsletterSection />
    </motion.div>
  );
};

export default EmergenciesInitiatives;