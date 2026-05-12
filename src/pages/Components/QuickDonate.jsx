import { useState, useEffect } from "react";
import { useCart } from "./cart";
import donationTypeService from "../../services/donationtypeservice";
import { toast } from "react-hot-toast";

const QuickDonate = ({ image, title = "Make a Difference Today" }) => {
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
      toast.error("Please select or enter an amount");
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
    <section className="py-16 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Left — Quick donate form */}
          <div className="p-8 md:p-10 flex flex-col justify-center">
            <h3 className="font-heading text-2xl md:text-3xl font-bold text-text-dark mb-2">
              {title}
            </h3>
            <p className="text-text-muted font-body text-sm mb-8">
              Choose an amount and donate directly to this cause.
            </p>

            {/* Preset amounts */}
            <div className="grid grid-cols-5 gap-2 mb-5">
              {presetAmounts.map((val) => (
                <button
                  key={val}
                  onClick={() => { setAmount(val); setCustomAmount(""); }}
                  className={`py-2.5 rounded-xl font-body font-semibold text-sm transition-all ${
                    amount === val && !customAmount
                      ? "text-[#2C2418] shadow-sm"
                      : "bg-gray-50 text-[#5C4A32] hover:bg-gray-100 border border-gray-200"
                  }`}
                  style={
                    amount === val && !customAmount
                      ? { background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)" }
                      : undefined
                  }
                >
                  ${val}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C4A32]/40 font-body font-semibold">$</span>
              <input
                type="number"
                placeholder="Other amount"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setAmount(""); }}
                className="w-full h-11 pl-8 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-[#2C2418] font-body text-sm focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all"
              />
            </div>

            {/* Donation type */}
            <select
              value={donationType}
              onChange={(e) => setDonationType(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-[#2C2418] font-body text-sm focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all mb-5 appearance-none"
            >
              {donationTypes.map((t) => (
                <option key={t.donationType} value={t.donationType}>{t.donationType}</option>
              ))}
            </select>

            {/* Donate button */}
            <button
              onClick={handleDonate}
              className="w-full h-12 rounded-xl font-semibold font-body text-[#2C2418] text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              style={{
                background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)",
                boxShadow: "0 2px 12px rgba(201,168,76,0.25)",
              }}
            >
              Donate {activeAmount ? `$${activeAmount}` : "Now"}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>

          {/* Right — Image */}
          <div className="hidden lg:block relative">
            <img
              src={image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuickDonate;
