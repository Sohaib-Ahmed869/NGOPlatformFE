import React from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { useNavigate } from "react-router-dom";
import { sectionReveal, staggerContainer, staggerItem } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";

const IMAGE_VISION = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=400&fit=crop&q=80"; // volunteer,team
const IMAGE_LEADERSHIP = "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=400&h=400&fit=crop&q=80"; // nonprofit,people
const IMAGE_PARTNERS = "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&h=400&fit=crop&q=80"; // community,help
const IMAGE_IMPACT = "https://images.unsplash.com/photo-1526958097901-5e6d742d3371?w=400&h=400&fit=crop&q=80"; // impact,global

const AboutSection = () => {
  const aboutCards = [
    {
      title: "Our Vision & Mission",
      description:
        "We are committed to serving underprivileged communities. Our vision and mission guide everything we do, ensuring meaningful and lasting impact.",
      image: IMAGE_VISION,
      link: "/about-us",
    },
    {
      title: "Our Leadership",
      description:
        "Meet the dedicated team behind our vision. Our leadership brings together diverse expertise and a shared passion for driving positive change.",
      image: IMAGE_LEADERSHIP,
      link: "/about-us",
    },
    {
      title: "Our Partners",
      description:
        "Collaboration is at the heart of our success. We proudly work with organizations and individuals who share our mission to amplify our impact.",
      image: IMAGE_PARTNERS,
      link: "/our-partners",
    },
    {
      title: "Our Impact",
      description:
        "Explore how we are empowering communities and creating sustainable solutions for a better tomorrow.",
      image: IMAGE_IMPACT,
      link: "/about-us",
    },
  ];

  const navigate = useNavigate();

  //scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <HeroOverlay />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">About Us</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">Our mission to create lasting change</p>
        </div>
      </div>

      <section className="py-20 px-6 mx-auto bg-background">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-6 lg:px-32"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {aboutCards.map((card) => (
            <motion.div
              key={card.title}
              variants={staggerItem}
              className="bg-surface p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow flex flex-col"
            >
              {/* Icon */}
              <div className="mb-4">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-12 h-12 rounded-lg object-cover"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className="flex-grow">
                <h3 className="text-xl font-heading font-bold mb-4 text-text-dark">{card.title}</h3>
                <p className="text-text-muted font-body mb-6 text-md">{card.description}</p>
              </div>

              {/* Button */}
              <button
                className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-light transition-colors font-body"
                onClick={() => navigate(card.link)}
              >
                Read More
              </button>
            </motion.div>
          ))}
        </motion.div>
      </section>
      <NewsletterSection />
    </motion.div>
  );
};

export default AboutSection;
