import React from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { useNavigate } from "react-router-dom";
import { sectionReveal, staggerContainer, staggerItem } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";
import usePageContent from "../../hooks/usePageContent";

const ICON_EDUCATION = "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop&q=80"; // education,school
const ICON_FOOD = "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&h=400&fit=crop&q=80"; // food,hunger
const ICON_WATER = "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&h=400&fit=crop&q=80"; // water,well
const ICON_EMERGENCY = "https://images.unsplash.com/photo-1603321544554-f416a9a11fcb?w=400&h=400&fit=crop&q=80"; // disaster,relief
const ICON_CLEAN_WATER = "https://images.unsplash.com/photo-1538300342682-cf57afb97285?w=400&h=400&fit=crop&q=80"; // clean,water
const ICON_WOMEN = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&q=80"; // women,empowerment

const InitiativesSection = () => {
  const { content } = usePageContent("initiatives");
  const hero = content?.hero || {};
  const defaultInitiatives = [
    {
      icon: ICON_EDUCATION,
      title: "Education",
      link: "/initiative-1",
      description:
        "It is our firm belief that the progress of the nation is in the hands of its mothers, daughters and sisters.",
    },
    {
      icon: ICON_FOOD,
      title: "Food",
      link: "/initiative-3",
      description:
        "Provide healthy meals to those in need and help sustain lives locally and overseas.",
    },
    {
      icon: ICON_WATER,
      title: "Water",
      link: "/initiative-2",
      description:
        "Water is a basic necessity. Millions of people have limited or no access to clean water, making life difficult for them.",
    },
    {
      icon: ICON_EMERGENCY,
      title: "Emergencies",
      link: "/initiative-4",
      description:
        "Support all struggling families and households during emergencies, ensuring assistance without discrimination.",
    },
    {
      icon: ICON_CLEAN_WATER,
      title: "Clean Water",
      link: "#",
      description:
        "Delivering sustainable clean water solutions to communities in need through wells, filtration systems, and infrastructure projects.",
    },
    {
      icon: ICON_WOMEN,
      title: "Women Empowerment",
      link: "#",
      description:
        "Empowering women through skills training, microfinance support, and educational programs to build self-reliant communities.",
    },
  ];
  const initiatives = content?.cards?.length ? content.cards : defaultInitiatives;

  const navigate = useNavigate();

  return (
    <motion.div className="bg-background pb-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="">
        <div className="relative py-36 lg:py-44 overflow-hidden">
          <div className="absolute inset-0">
            <img src={hero.image ?? "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80"} alt="" className="w-full h-full object-cover" />
            <HeroOverlay />
          </div>
          <div className="relative z-10 text-center px-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">{hero.title ?? "Our Initiatives"}</h1>
            <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">{hero.subtitle ?? "Programs that drive real impact"}</p>
          </div>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-5/6 mx-auto py-20 px-6"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {initiatives.map((initiative, index) => (
            <motion.div
              key={index}
              variants={staggerItem}
              className="bg-surface p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow flex flex-col text-left"
            >
              <div className="mb-4">
                <img
                  src={initiative.icon}
                  alt={initiative.title}
                  className="w-16 h-16 rounded-xl object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="text-xl font-heading font-bold mb-4 text-text-dark">{initiative.title}</h3>
              <p className="text-text-muted font-body mb-6">{initiative.description}</p>
              <button
                className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-light transition-colors mt-auto font-body"
                onClick={() => navigate(initiative.link)}
              >
                Read More
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <NewsletterSection />
    </motion.div>
  );
};

export default InitiativesSection;
