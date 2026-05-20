import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCart } from "../Components/cart";
import { useTenant } from "../../context/TenantContext";
import donationTypeService from "../../services/donationtypeservice";
import DonationSection from "../Home/Donation/donation";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { toast } from "react-hot-toast";

function lighten(hex, ratio) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * ratio));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * ratio));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * ratio));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const QuickDonate = () => {
  const { addItem } = useCart();
  const { branding } = useTenant();
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

  const bg = branding?.backgroundColor || "#FAF7F2";
  const accent = branding?.accentColor || "#C9A84C";
  const gradBase = lighten(bg, -0.08);
  const gradMid = lighten(bg, -0.03);
  const gradDark = lighten(bg, -0.15);

  return (
    <section className="relative py-36 lg:py-44 overflow-hidden">
      {/* Banner background — same as homepage Hero */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(165deg, ${gradBase} 0%, ${gradMid} 35%, ${gradBase} 65%, ${gradDark} 100%)` }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(135deg, transparent 40%, ${accent}0F 49%, ${accent}1A 50%, ${accent}0F 51%, transparent 60%)` }}
      />
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{ height: "45%", background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)" }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-4">
            Make a <span className="text-accent">Donation</span>
          </h1>
          <p className="font-body text-primary/60 text-lg max-w-xl mx-auto">
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
                    ? "bg-accent text-white shadow-md"
                    : "bg-white/60 text-primary/70 hover:bg-white/80 border border-gray-200"
                }`}
              >
                ${val}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative mb-5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 font-body font-semibold">$</span>
            <input
              type="number"
              placeholder="Other amount"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setAmount(""); }}
              className="w-full h-12 pl-8 pr-4 rounded-xl border border-gray-200 bg-white/70 text-primary font-body focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
            />
          </div>

          {/* Donation type */}
          <select
            value={donationType}
            onChange={(e) => setDonationType(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/70 text-primary font-body focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all mb-6 appearance-none"
          >
            {donationTypes.map((t) => (
              <option key={t.donationType} value={t.donationType}>{t.donationType}</option>
            ))}
          </select>

          {/* Donate button */}
          <button
            onClick={handleDonate}
            className="w-full h-14 rounded-xl font-semibold font-body text-white text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01] bg-accent hover:bg-accent/90 shadow-lg"
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
