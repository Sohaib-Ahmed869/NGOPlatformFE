import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCart } from "../Components/cart";
import donationTypeService from "../../services/donationtypeservice";
import DonationSection from "../Home/Donation/donation";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { toast } from "react-hot-toast";

const QuickDonate = () => {
  const { addItem } = useCart();
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [donationType, setDonationType] = useState("");
  const [donationTypes, setDonationTypes] = useState([]);

  const presetAmounts = [25, 50, 100, 250, 500];

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await donationTypeService.getAll();
        if (res.success && res.data) {
          setDonationTypes(res.data);
          if (res.data.length > 0) setDonationType(res.data[0].donationType);
        }
      } catch {
        setDonationTypes([{ donationType: "General Donation" }]);
        setDonationType("General Donation");
      }
    };
    fetchTypes();
  }, []);

  const activeAmount = customAmount || amount;

  const handleDonate = () => {
    if (!activeAmount || Number(activeAmount) <= 0) {
      toast.error("Please select or enter a donation amount");
      return;
    }
    addItem({
      title: donationType || "Donation",
      price: Number(activeAmount),
      quantity: 1,
      image: "",
    });
    toast.success(`$${activeAmount} added to cart`);
    setAmount("");
    setCustomAmount("");
  };

  return (
    <section className="relative py-36 lg:py-44 overflow-hidden">
      {/* Banner background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#C4B5A0] via-[#D1C4B0] to-[#B8A993]" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent 40%, rgba(201,168,76,0.08) 50%, transparent 60%)" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" style={{ height: "40%" }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-[#2C2418] mb-4">
            Make a <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #8B6914, #A0884C)" }}>Donation</span>
          </h1>
          <p className="font-body text-[#5C4A32]/60 text-lg max-w-xl mx-auto">
            Choose an amount and start making a difference today.
          </p>
        </motion.div>

        {/* Quick donate card */}
        <motion.div
          className="rounded-2xl p-8 md:p-10 max-w-2xl mx-auto"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.4) 100%)",
            border: "1px solid rgba(255,255,255,0.6)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Preset amounts */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {presetAmounts.map((val) => (
              <button
                key={val}
                onClick={() => { setAmount(val); setCustomAmount(""); }}
                className={`py-3 rounded-xl font-body font-semibold text-sm transition-all ${
                  amount === val && !customAmount
                    ? "bg-gradient-to-b from-[#D4B85A] to-[#C9A84C] text-[#2C2418] shadow-md"
                    : "bg-white/60 text-[#5C4A32] hover:bg-white/80 border border-gray-200"
                }`}
              >
                ${val}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative mb-5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C4A32]/50 font-body font-semibold">$</span>
            <input
              type="number"
              placeholder="Other amount"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setAmount(""); }}
              className="w-full h-12 pl-8 pr-4 rounded-xl border border-gray-200 bg-white/70 text-[#2C2418] font-body focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
            />
          </div>

          {/* Donation type */}
          <select
            value={donationType}
            onChange={(e) => setDonationType(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/70 text-[#2C2418] font-body focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all mb-6 appearance-none"
          >
            {donationTypes.map((t) => (
              <option key={t.donationType} value={t.donationType}>{t.donationType}</option>
            ))}
          </select>

          {/* Donate button */}
          <button
            onClick={handleDonate}
            className="w-full h-14 rounded-xl font-semibold font-body text-[#2C2418] text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            style={{
              background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)",
              boxShadow: "0 4px 20px rgba(201,168,76,0.3)",
            }}
          >
            Donate {activeAmount ? `$${activeAmount}` : "Now"}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </button>
        </motion.div>
      </div>
    </section>
  );
};

const DonatePage = () => {
  return (
    <div>
      <QuickDonate />
      <DonationSection />
      <NewsletterSection />
    </div>
  );
};

export default DonatePage;
