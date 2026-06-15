import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Moon, Sparkles, ArrowRight, Info, Calendar, Repeat, Heart, X, Calculator, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useCart } from "../../Components/cart";
import AutoPlayIframe from "../../Components/AutoPlayIframe";
import NewsletterSection from "../Newsletter/newsletter";
import usePageContent from "../../../hooks/usePageContent";
import { useTenant } from "../../../context/TenantContext";
import { PageHero, GivingSubNav, SectionHeading, CTABand } from "../../../components/giving";
import { RAMADAN_TEN_NIGHTS, RAMADAN_DAILY, GIVING_NAV, RAMADAN_HERO_IMG, RAMADAN_MISSION_IMG } from "../../../config/giving";

/* ── Recurring (automated daily) donation modal ───────────────────────────── */
const RecurringDonationModal = ({ isOpen, onClose, donationDetails }) => {
  const { addItem } = useCart();
  const [recurringAmount, setRecurringAmount] = useState(0);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [totalRecurringPayments, setTotalRecurringPayments] = useState(0);
  const recurringFrequency = "daily"; // Ramadan giving is automated daily.

  useEffect(() => {
    if (donationDetails) {
      setRecurringAmount(Number(donationDetails.price) || 0);
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 9); // 10 nights including today
      setRecurringEndDate(endDate.toISOString().split("T")[0]);
      setTotalRecurringPayments(10);
    }
  }, [donationDetails]);

  useEffect(() => {
    if (!recurringEndDate) return;
    const startDate = new Date();
    const endDate = new Date(recurringEndDate);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setTotalRecurringPayments(diffDays);
  }, [recurringEndDate]);

  const handleSubmit = () => {
    const formattedToday = new Date().toISOString().split("T")[0];
    addItem({
      id: `donation-${donationDetails.amount}-recurring`,
      title: donationDetails.amount,
      price: recurringAmount,
      image: donationDetails.image,
      donationType: "Sadaqah",
      isRecurring: true,
      source: "ramadan",
      recurringDetails: {
        frequency: recurringFrequency,
        endDate: recurringEndDate,
        totalPayments: totalRecurringPayments,
        startDate: formattedToday,
      },
    });
    toast.success("Daily Ramadan giving added to your cart");
    onClose();
  };

  const grandTotal = (Number(recurringAmount) || 0) * (totalRecurringPayments || 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden bg-primary px-6 py-5">
              <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-white">
                    <Repeat className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-heading text-xl font-bold text-white">Automate your daily giving</h3>
                    <p className="mt-0.5 text-sm text-white/60">Give every night and never miss Laylatul Qadr.</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-white/60 transition-colors hover:text-white" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex items-start gap-2.5 border border-accent/20 bg-accent/5 px-4 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <p className="font-semibold text-primary">{donationDetails?.amount}</p>
                  <p className="text-sm text-text-muted">{donationDetails?.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Repeat className="h-4 w-4 text-accent" /> Frequency
                  </label>
                  <div className="flex items-center border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700">Daily</div>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Heart className="h-4 w-4 text-accent" /> Amount per night
                  </label>
                  <div className="flex items-center gap-2 border border-gray-200 bg-white px-3 transition-colors focus-within:border-accent">
                    <span className="text-sm font-semibold text-gray-400">$</span>
                    <input
                      type="number"
                      min="1"
                      value={recurringAmount}
                      onChange={(e) => setRecurringAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Calendar className="h-4 w-4 text-accent" /> Give until
                  </label>
                  <input
                    type="date"
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent"
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-primary">Total nights</span>
                  <div className="flex items-center justify-center border border-accent/30 bg-accent/10 px-3 py-2.5 text-sm font-bold text-primary">
                    {totalRecurringPayments > 0 ? totalRecurringPayments : 0} nights
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Info className="h-3.5 w-3.5 text-accent" />${recurringAmount} × {totalRecurringPayments} nights
                </span>
                <span className="font-heading text-lg font-bold text-primary">${grandTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
                >
                  <CheckCircle2 className="h-4 w-4" /> Confirm daily giving
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ── A single Ramadan giving card ─────────────────────────────────────────── */
const GiveCard = ({ donation, onDonate, reduce }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
    whileHover={reduce ? {} : { y: -6 }}
    transition={{ type: "spring", stiffness: 300, damping: 24 }}
    className="group relative flex h-full flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
  >
    <div className="relative h-56 overflow-hidden">
      <img
        src={donation.image}
        alt={donation.amount}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 bg-accent px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
        <Repeat className="h-3 w-3" /> Daily
      </span>
      <span className="absolute bottom-3 left-3 bg-white/90 px-2.5 py-1 font-heading text-sm font-bold text-primary backdrop-blur-sm">
        ${donation.price}/night
      </span>
    </div>
    <div className="flex flex-1 flex-col p-6">
      <h3 className="font-heading text-base font-bold text-primary">{donation.amount}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{donation.description}</p>
      <button
        onClick={() => onDonate(donation)}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 bg-accent text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
      >
        Automate this gift <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  </motion.div>
);

const RamadanDonations = () => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const { content } = usePageContent("ramadan");
  const { organisation } = useTenant();
  const hero = content?.hero || {};
  const intro = content?.intro || {};
  const mission = content?.mission || {};
  const orgName = organisation?.name || "our foundation";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // CMS-editable card lists, normalised to numeric prices, with config fallback.
  const toCards = (list) => list.map((d) => ({ ...d, price: Number(d.price) || 0 }));
  const tenNights = toCards(content?.tenNights?.length ? content.tenNights : RAMADAN_TEN_NIGHTS);
  const daily = toCards(content?.daily?.length ? content.daily : RAMADAN_DAILY);

  const handleDonateClick = (donation) => {
    setSelectedDonation(donation);
    setModalOpen(true);
  };

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHero
        image={hero.image ?? RAMADAN_HERO_IMG}
        icon={Moon}
        eyebrow={hero.eyebrow ?? "The last 10 nights"}
        title={hero.title ?? "Ramadan Giving"}
        subtitle={
          intro.line1 ??
          "Automate your daily sadaqah for the last 10 nights of Ramadan and never miss the immense rewards of Laylatul Qadr."
        }
      />

      <GivingSubNav items={GIVING_NAV} />

      {/* ── Intro ────────────────────────────────────────────────────────── */}
      <section className="bg-background px-6 pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-body text-lg leading-relaxed text-text-muted">
            {intro.line2 ??
              "During the last ten nights, many of us dedicate more time to Dhikr, Salah and Sadaqah. Set your giving on autopilot so every blessed night counts — including the night that is better than a thousand months."}
          </p>
        </div>
      </section>

      {/* ── Last 10 Nights ───────────────────────────────────────────────── */}
      <section className="bg-background px-6 py-14 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            icon={Sparkles}
            eyebrow="The last 10 nights"
            title="Targeted nightly giving"
            intro="Pick a cause and let it give automatically every night of the final ten."
          />
          <motion.div className="grid grid-cols-1 gap-6 md:grid-cols-3" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {tenNights.map((d, i) => (
              <GiveCard key={d.key || i} donation={d} onDonate={handleDonateClick} reduce={reduce} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Daily giving ─────────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-14 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            icon={Heart}
            eyebrow="Flexible daily sadaqah"
            title="Set an amount, give every night"
            intro="Choose a nightly amount and we'll direct it where it's needed most."
          />
          <motion.div className="grid grid-cols-1 gap-6 md:grid-cols-3" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {daily.map((d, i) => (
              <GiveCard key={d.key || i} donation={d} onDonate={handleDonateClick} reduce={reduce} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Mission statement + video ────────────────────────────────────── */}
      <section className="bg-background px-6 py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden border border-gray-100 shadow-md"
          >
            {/* Show a video only when the tenant has set one in the CMS;
                otherwise show an image so it's never a broken embed. */}
            {mission.videoId ? (
              <AutoPlayIframe videoId={mission.videoId} title="Ramadan Charity Initiative" className="w-full" />
            ) : (
              <img
                src={mission.image || RAMADAN_MISSION_IMG}
                alt="Ramadan charity initiative"
                className="aspect-video w-full object-cover"
                loading="lazy"
              />
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="space-y-5"
          >
            <SectionHeading
              icon={Moon}
              eyebrow="Our Ramadan mission"
              title={mission.title || "Supporting local communities in Ramadan"}
            />
            <p className="-mt-6 leading-relaxed text-text-muted">
              {mission.text ||
                `${orgName}'s Ramadan initiative provides food and essential supplies to underprivileged families during the holy month. Rooted in compassion, we focus on humanitarian aid within the local community — encouraging donations and volunteer involvement to support those most in need.`}
            </p>
            <button
              onClick={() => {
                addItem({ id: `ramadan-sadaqah-${Date.now()}`, title: "Ramadan Sadaqah", price: 50, donationType: "Sadaqah", image: "" });
                toast.success("$50 Ramadan Sadaqah added to your cart");
              }}
              className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
            >
              Give a one-off Sadaqah <Heart className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Zakat CTA band ───────────────────────────────────────────────── */}
      <CTABand
        title="Don't forget your Zakat this Ramadan"
        text="Calculate exactly what you owe in seconds and fulfil your obligation with confidence."
      >
        <button
          onClick={() => navigate("/zakat/calculator")}
          className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
        >
          Use our Zakat calculator <Calculator className="h-4 w-4" />
        </button>
      </CTABand>

      <RecurringDonationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} donationDetails={selectedDonation} />
      <NewsletterSection />
    </motion.div>
  );
};

export default RamadanDonations;
