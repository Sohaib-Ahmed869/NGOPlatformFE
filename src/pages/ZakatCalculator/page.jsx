import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { sectionReveal } from "../../utils/animations";
import HeroOverlay from "../../components/HeroOverlay";

const zakatmain = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80";
import NewsletterSection from "../Home/Newsletter/newsletter";

const ZakatCalculator = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    cashInHand: "",
    goldValue: "",
    silverValue: "",
    investments: "",
    businessInventory: "",
    liabilities: "",
    nisabThreshold: "Gold (AUD $8,723.64 for 87.48g)",
  });

  const [calculationResult, setCalculationResult] = useState({
    showResult: false,
    totalAssets: 0,
    totalLiabilities: 0,
    netZakatableAssets: 0,
    zakatPayable: 0,
    isEligible: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Convert all values to numbers (or 0 if empty)
    const cashInHand = parseFloat(formData.cashInHand) || 0;
    const goldValue = parseFloat(formData.goldValue) || 0;
    const silverValue = parseFloat(formData.silverValue) || 0;
    const investments = parseFloat(formData.investments) || 0;
    const businessInventory = parseFloat(formData.businessInventory) || 0;
    const liabilities = parseFloat(formData.liabilities) || 0;

    // Calculate total assets
    const totalAssets =
      cashInHand + goldValue + silverValue + investments + businessInventory;

    // Calculate net zakatable assets
    const netZakatableAssets = totalAssets - liabilities;

    // Get nisab threshold value in AUD based on selection
    let nisabThreshold = 8723.64; // Default Gold nisab value in AUD
    let nisabDisplay = "AUD $8,723.64";

    if (formData.nisabThreshold.includes("Silver")) {
      nisabThreshold = 612.78; // Silver nisab value in AUD
      nisabDisplay = "AUD $612.78";
    }

    // Check if net assets exceed nisab threshold
    const isEligible = netZakatableAssets >= nisabThreshold;

    // Calculate Zakat (2.5% of net zakatable assets if eligible)
    const zakatPayable = isEligible ? netZakatableAssets * 0.025 : 0;

    // Update calculation result state
    setCalculationResult({
      showResult: true,
      totalAssets,
      totalLiabilities: liabilities,
      netZakatableAssets,
      zakatPayable,
      isEligible,
      nisabDisplay,
    });

    console.log({
      totalAssets,
      totalLiabilities: liabilities,
      netZakatableAssets,
      zakatPayable,
      isEligible,
      nisabThreshold,
    });
  };

  const handleReset = () => {
    setFormData({
      cashInHand: "",
      goldValue: "",
      silverValue: "",
      investments: "",
      businessInventory: "",
      liabilities: "",
      nisabThreshold: "Gold (AUD $8,723.64 for 87.48g)",
    });

    setCalculationResult({
      showResult: false,
      totalAssets: 0,
      totalLiabilities: 0,
      netZakatableAssets: 0,
      zakatPayable: 0,
      isEligible: false,
      nisabDisplay: "",
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <HeroOverlay />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">Zakat Calculator</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">Calculate your Zakat obligation</p>
        </div>
      </div>

      <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" {...sectionReveal}>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2">
            <h2 className="text-3xl font-bold mb-8">Calculate Now</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">
                  Cash in hand and bank (AUD):
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.cashInHand}
                  onChange={(e) =>
                    setFormData({ ...formData, cashInHand: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Value of gold (AUD):
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.goldValue}
                  onChange={(e) =>
                    setFormData({ ...formData, goldValue: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Value of silver (AUD):
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.silverValue}
                  onChange={(e) =>
                    setFormData({ ...formData, silverValue: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Investments (AUD):</label>
                <input
                  type="number"
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.investments}
                  onChange={(e) =>
                    setFormData({ ...formData, investments: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Business inventory (AUD):
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.businessInventory}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      businessInventory: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Liabilities/Debts (AUD):
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.liabilities}
                  onChange={(e) =>
                    setFormData({ ...formData, liabilities: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Nisab Threshold (Choose one):
                </label>
                <select
                  className="w-full rounded-xl p-2 border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.nisabThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, nisabThreshold: e.target.value })
                  }
                >
                  <option>Gold (AUD $8,723.64 for 87.48g)</option>
                  <option>Silver (AUD $612.78 for 612.36g)</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-3 rounded-xl hover:bg-primary-light transition-colors font-semibold shadow-md"
                >
                  Calculate Zakat
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-8 py-3 border-2 border-primary text-primary rounded-xl hover:bg-background transition-colors font-semibold"
                >
                  Reset
                </button>
              </div>
            </form>

            {/* Zakat Calculation Results Box */}
            {calculationResult.showResult && (
              <div className="mt-8 bg-background border border-primary/30 rounded-2xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-primary mb-4">
                  Your Zakat Calculation
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Assets:</span>
                    <span>AUD ${calculationResult.totalAssets.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-medium">Total Liabilities:</span>
                    <span>
                      AUD ${calculationResult.totalLiabilities.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-medium">Net Zakatable Assets:</span>
                    <span>
                      AUD ${calculationResult.netZakatableAssets.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-medium">Nisab Threshold:</span>
                    <span>{calculationResult.nisabDisplay}</span>
                  </div>

                  <div className="border-t-2 border-primary pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Zakat Payable (2.5%):</span>
                      <span className="text-primary">
                        AUD ${calculationResult.zakatPayable.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {!calculationResult.isEligible && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-400 rounded p-3 text-yellow-700">
                      Note: Your net assets are below the Nisab threshold. Zakat
                      is not obligatory on you at this time.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-full md:w-1/2">
            <img
              src={zakatmain}
              alt="Zakat Calculator"
              className="w-full h-auto rounded-2xl shadow-md"
               loading="lazy"
            />
          </div>
        </div>
      </motion.div>
      <NewsletterSection />
    </motion.div>
  );
};

export default ZakatCalculator;
