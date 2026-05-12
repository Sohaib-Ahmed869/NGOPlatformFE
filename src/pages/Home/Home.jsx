import Hero from "./Hero";
import InitiativesSection from "./Initiative/initiative";
import DonationCTA from "./DonationCTA";
import Events from "./Events";
import Testimonials from "./Testimonials";
import NewsletterSection from "./Newsletter/newsletter";

const Home = () => {
  return (
    <div>
      <Hero />
      <InitiativesSection />
      <DonationCTA />
      <Events />
      <Testimonials />
      <NewsletterSection />
    </div>
  );
};

export default Home;
