import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Newsletter/newsletter";
import { sectionReveal, staggerContainer, staggerItem } from "../../../utils/animations";

// Unsplash images for Ramadan / charity themes
const image1 = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80"; // food distribution
const image2 = "https://images.unsplash.com/photo-1497375638960-ca368c7231e4?w=600&q=80"; // community giving
const image3 = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80"; // charity
const image4 = "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80"; // community support
const image5 = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80"; // helping hands
const image6 = "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80"; // charity donation
const zakatbg = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80";
// Video banner replaced with a hero image
const videoPoster = "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=1200&q=80";
import { useCart } from "../../Components/cart";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react"; // Assuming you're using lucide-react
import AutoPlayIframe from "../../Components/AutoPlayIframe";

const ZakatBanner = () => {
  const navigate = useNavigate();
  return (
    <div
      className="relative h-[400px] bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(27, 67, 50, 0.9), rgba(45, 106, 79, 0.9)), url(${zakatbg})`,
      }}
    >
      <div className="mx-auto px-4 md:px-6 lg:px-28 h-full">
        <div className="flex flex-col justify-center h-full">
          <div className="flex flex-col lg:flex-row justify-between items-center">
            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-white">
                Zakat Calculator
              </h1>
            </div>
            <div className="gap-10 flex flex-col items-start">
              <p className="text-white text-xl max-w-xl text-justify">
                Easily calculate your Zakat in just one click and fulfill your
                obligation with confidence.
              </p>
              <button
                className="bg-white text-text-dark px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors font-semibold shadow-md"
                onClick={() => navigate("/zakat/calculator")}
              >
                Use our zakat calculator
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------
// RECURRING DONATION MODAL
// ----------------------------------
const RecurringDonationModal = ({ isOpen, onClose, donationDetails }) => {
  const { addItem } = useCart();
  const [recurringFrequency, setRecurringFrequency] = useState("daily");
  const [recurringAmount, setRecurringAmount] = useState(0);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [totalRecurringPayments, setTotalRecurringPayments] = useState(0);

  useEffect(() => {
    if (donationDetails) {
      setRecurringAmount(donationDetails.price || 0);
      setRecurringFrequency("daily");

      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 9); // 10 days including today
      setRecurringEndDate(endDate.toISOString().split("T")[0]);

      // Calculate total payments (10 days)
      setTotalRecurringPayments(10);
    }
  }, [donationDetails]);

  useEffect(() => {
    if (recurringEndDate) {
      const startDate = new Date();
      const endDate = new Date(recurringEndDate);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end date

      if (recurringFrequency === "daily") {
        setTotalRecurringPayments(diffDays);
      } else if (recurringFrequency === "weekly") {
        setTotalRecurringPayments(Math.ceil(diffDays / 7));
      } else if (recurringFrequency === "monthly") {
        setTotalRecurringPayments(Math.ceil(diffDays / 30));
      } else if (recurringFrequency === "yearly") {
        setTotalRecurringPayments(Math.ceil(diffDays / 365));
      }
    }
  }, [recurringEndDate, recurringFrequency]);

  const handleSubmit = () => {
    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0];

    addItem({
      id: `donation-${donationDetails.amount}-recurring`,
      title: donationDetails.amount,
      price: recurringAmount,
      image: donationDetails.image,
      isRecurring: true,
      source: "ramadan", // Add source identifier for checkout
      recurringDetails: {
        frequency: recurringFrequency,
        endDate: recurringEndDate,
        totalPayments: totalRecurringPayments,
        startDate: formattedToday,
      },
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Set Up Recurring Donation
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>

          <div className="mb-4 p-4 bg-background rounded-2xl">
            <h4 className="font-medium text-justify">{donationDetails?.amount}</h4>
            <p className="text-sm text-gray-600 text-justify">
              {donationDetails?.description}
            </p>
          </div>

          <div className="mt-6 p-6 bg-background border border-primary/30 rounded-2xl shadow-sm space-y-6">
            <h4 className="text-lg font-semibold text-gray-800 text-justify">
              Recurring Payment Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value)}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  disabled
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Charged {recurringFrequency}
                </label>
                <input
                  type="number"
                  value={recurringAmount}
                  onChange={(e) => setRecurringAmount(parseFloat(e.target.value))}
                  disabled
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Stop recurring payments)
                </label>
                <input
                  type="date"
                  value={recurringEndDate}
                  onChange={(e) => setRecurringEndDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
              </div>
              <div className="flex items-center">
                <div className="flex-1 text-sm text-gray-700">
                  <p className="mb-1 font-medium">Total Payments</p>
                  <div className="flex items-center justify-center p-3 border border-primary/30 bg-primary/10 text-primary rounded-md font-semibold">
                    {totalRecurringPayments > 0 ? totalRecurringPayments : 0}{" "}
                    Payments
                  </div>
                </div>
              </div>
            </div>

            {/* Info Text */}
            <div className="text-sm text-gray-600 flex items-center">
              <Info className="w-4 h-4 mr-2 text-primary" />
              <span className="text-justify">
                Your card will be charged ${recurringAmount}{" "}
                {recurringFrequency} for {totalRecurringPayments} payments
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-light"
            >
              Confirm Donation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const RamadanDonations = () => {
  const { addItem } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);

  // Scroll to top when the component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Donation arrays
  const tenDayDonations = [
    {
      image: image1,
      amount: "Feed a family of 5 in last 10 nights",
      price: 7,
      description:
        "Donate $7 daily for one food / ration bag for the family of 5 in last 10 nights.",
      isRecurring: true,
    },
    {
      image: image2,
      amount: "Educate A Child in last 10 nights ",
      price: 30,
      description:
        "Donate $30 daily to support the education of a child during last 10 nights.",
      isRecurring: true,
    },
    {
      image: image3,
      amount: "Build a large hand pump in last 10 nights",
      price: 60,
      description:
        "Donate $60 daily to build a large hand pump in last 10 nights.",
      isRecurring: true,
    },
  ];

  const dailyDonations = [
    {
      image: image4,
      amount: "Donate $5 Daily",
      price: 5,
      description:
        "Make a difference with just $5 a day, providing consistent support to those in need.",
      isRecurring: true,
    },
    {
      image: image5,
      amount: "Donate $10 Daily",
      price: 10,
      description:
        "Give $10 a day to provide essential aid and make a lasting impact on those in need.",
      isRecurring: true,
    },
    {
      image: image6,
      amount: "Donate $20 Daily",
      price: 20,
      description:
        "Contribute $20 daily to sustain vital programs and bring meaningful change to those in need.",
      isRecurring: true,
    },
  ];

  // Handler for donate button
  const handleDonateClick = (donation) => {
    if (donation.isRecurring) {
      // Open modal for recurring donations
      setSelectedDonation(donation);
      setModalOpen(true);
    } else {
      // Regular one-time donation
      addItem({
        id: `donation-${donation.amount}`,
        title: donation.amount,
        price: donation.price,
        image: donation.image,
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Hero Header */}
      <div>
        <div className="w-screen overflow-hidden">
          <div className="relative h-[350px] bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to right, rgba(27, 67, 50, 0.7), rgba(45, 106, 79, 0.7)), url(${videoPoster})` }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white text-center px-6">Ramadan Giving</h1>
            </div>
          </div>
        </div>

        {/* Intro Text */}
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <p className="text-lg text-gray-700 font-medium mb-1 text-justify">
            Automate your daily sadaqah for the last 10 nights of Ramadan and
            never miss Laylatul Qadr!
          </p>
          <p className="text-lg text-gray-700 font-medium text-justify">
            During the last ten nights of Ramadan, many of us will dedicate more
            time to Dhikr, Salah and offering Sadaqah. We all want to do the
            best we can during these sacred nights.
          </p>
        </div>
      </div>

      {/* Donation Cards */}
      <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" {...sectionReveal}>
        <h2 className="text-xl font-bold mb-8">Make a Donation</h2>

        <div className="space-y-12">
          {/* Ten-Day Donations */}
          <div>
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
              {tenDayDonations.map((donation, index) => (
                <motion.div
                  key={index}
                  variants={staggerItem}
                  className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                >
                  <div className="relative h-72">
                    <img
                      src={donation.image}
                      alt={donation.amount}
                      className="w-full h-full object-cover"
                       loading="lazy"
                    />
                    <div className="absolute top-2 right-2 bg-primary text-white px-3 py-1 rounded-full text-xs">
                      Recurring
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-bold mb-2 text-justify">{donation.amount}</h3>
                    <p className="text-gray-600 text-sm mb-4 text-justify">
                      {donation.description}
                    </p>
                    <div className="mt-auto">
                      <button
                        className="w-full bg-primary text-white py-2 rounded-xl hover:bg-primary-light transition-colors font-semibold"
                        onClick={() => handleDonateClick(donation)}
                      >
                        Donate Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Daily Donations */}
          <div>
            <h3 className="text-xl font-semibold mb-6">One-Time Donations</h3>
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
              {dailyDonations.map((donation, index) => (
                <motion.div
                  key={index}
                  variants={staggerItem}
                  className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                >
                  <div className="relative h-56">
                    <img
                      src={donation.image}
                      alt={donation.amount}
                      className="w-full h-full object-cover object-top"
                       loading="lazy"
                    />
                    <div className="absolute top-2 right-2 bg-primary text-white px-3 py-1 rounded-full text-xs">
                      Recurring
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-bold mb-2 text-justify">{donation.amount}</h3>
                    <p className="text-gray-600 text-sm mb-4 text-justify">
                      {donation.description}
                    </p>
                    <div className="mt-auto">
                      <button
                        className="w-full bg-primary text-white py-2 rounded-xl hover:bg-primary-light transition-colors font-semibold"
                        onClick={() => handleDonateClick(donation)}
                      >
                        Donate Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Mission Statement */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="rounded-2xl shadow-md w-full overflow-hidden">
              <AutoPlayIframe
                videoId="6PQn8hkSMEA"
                width="100%"
                height="315"
                title="Ramadan Charity Initiative"
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-justify">
              Supporting Local Communities in Ramadan
            </h2>
            <p className="text-gray-600 text-justify">
              The HopeGive Foundation's Ramadan Charity Initiative aims
              to assist underprivileged families across Australia by providing
              food and essential supplies during the holy month. This effort
              reflects the foundation's commitment to "Hope Not Out," focusing
              on humanitarian aid within the local community. The initiative
              encourages local donations and volunteer involvement, promoting a
              spirit of compassion and support for those in need across
              Australia.
            </p>
          </div>
        </div>
      </div>

      {/* Recurring Donation Modal */}
      <RecurringDonationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        donationDetails={selectedDonation}
      />

      {/* Zakat Banner & Newsletter */}
      <ZakatBanner />
      <NewsletterSection />
    </motion.div>
  );
};

export default RamadanDonations;