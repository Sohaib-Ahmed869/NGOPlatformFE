import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { HandHeart, ArrowRight, Lock, ChevronDown, Heart, Check } from "lucide-react";
import { useCart } from "./cart";
import donationTypeService from "../../services/donationtypeservice";
import { cn } from "../../utils/cn";
import { toast } from "react-hot-toast";

const presetAmounts = [25, 50, 100, 250, 500];

/* Fully-themed custom dropdown (replaces the OS-styled native <select>).
   Accent highlight, animated, closes on outside-click / Escape, scrollable. */
function CauseSelect({ value, onChange, options, placeholder = "Select a cause" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between border bg-white py-2.5 pl-3 pr-3 text-left text-sm font-medium outline-none transition-colors",
          value ? "text-gray-800" : "text-gray-400",
          open ? "border-accent" : "border-gray-200 hover:border-accent/50",
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 transition-transform", open ? "rotate-180 text-accent" : "text-gray-400")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reduce ? 0 : 0.15, ease: "easeOut" }}
            className="absolute z-40 mt-1.5 max-h-60 w-full overflow-y-auto border border-gray-100 bg-white py-1 shadow-xl"
          >
            {options.map((opt) => {
              const active = opt === value;
              return (
                <li key={opt} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      active ? "bg-accent/10 font-semibold text-primary" : "text-gray-600 hover:bg-accent/5 hover:text-primary",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", active ? "bg-accent" : "bg-gray-200")} />
                    <span className="truncate">{opt}</span>
                    {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-accent" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact "give in seconds" donation banner (image + form) used across the
 * initiative pages. Theme-aware (accent/primary tokens), so it adapts to each
 * tenant's branding instead of a hardcoded gold.
 *
 * `defaultType` is an optional hint (e.g. "Education") — the first cause whose
 * name contains it is pre-selected, so the banner defaults to a relevant cause.
 */
const QuickDonate = ({ image, title = "Make a Difference Today", subtitle, defaultType }) => {
  const { addItem } = useCart();
  const reduce = useReducedMotion();
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  // Hydrate from cache so the field is populated on first paint.
  const [donationType, setDonationType] = useState(() => donationTypeService.getCached()?.[0]?.donationType || "");
  const [donationTypes, setDonationTypes] = useState(() => donationTypeService.getCached() || []);

  useEffect(() => {
    let active = true;
    // Stale-while-revalidate: cached causes show immediately, then refresh.
    const apply = (list) => {
      if (!active) return;
      const types = list?.length ? list : [{ donationType: "General Donation" }];
      setDonationTypes(types);
      setDonationType((prev) => {
        if (prev) return prev;
        if (defaultType) {
          const match = types.find((t) => t.donationType?.toLowerCase().includes(defaultType.toLowerCase()));
          if (match) return match.donationType;
        }
        return types[0]?.donationType || "";
      });
    };
    donationTypeService
      .refresh()
      .then(apply)
      .catch(() => apply(null));
    return () => {
      active = false;
    };
  }, [defaultType]);

  const activeAmount = customAmount || amount;

  const handleDonate = () => {
    const value = Number(activeAmount);
    if (!value || value <= 0) {
      toast.error("Please select or enter an amount");
      return;
    }
    addItem({
      // Unique id per gift so distinct amounts/causes don't collapse into one
      // cart line (the cart de-dupes on id).
      id: `quick-${(donationType || "donation").toLowerCase().replace(/\s+/g, "-")}-${value}-${Date.now()}`,
      title: donationType || "Donation",
      price: value,
      donationType: donationType || "Sadaqah",
      image: "",
    });
    toast.success(`$${value} added to your cart`);
    setCustomAmount("");
  };

  return (
    <section className="bg-background px-6 py-16 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto grid max-w-6xl grid-cols-1 border border-gray-100 bg-white shadow-xl lg:grid-cols-2"
      >
        {/* Left — give form */}
        <div className="relative flex flex-col justify-center p-8 sm:p-10">
          <div className="relative flex items-start gap-3.5">
            <motion.span
              animate={reduce ? {} : { scale: [1, 1.08, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-md shadow-accent/30"
            >
              <HandHeart className="h-5 w-5" />
            </motion.span>
            <div>
              <h3 className="font-heading text-2xl font-bold text-primary md:text-3xl">{title}</h3>
              <p className="mt-1 text-sm text-text-muted">{subtitle || "Choose an amount and give directly to this cause."}</p>
            </div>
          </div>

          {/* Preset amounts */}
          <div className="mt-7">
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Choose an amount</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {presetAmounts.map((val) => {
                const active = !customAmount && Number(amount) === val;
                return (
                  <motion.button
                    key={val}
                    type="button"
                    whileHover={reduce ? undefined : { y: -2 }}
                    whileTap={reduce ? undefined : { scale: 0.96 }}
                    onClick={() => { setAmount(val); setCustomAmount(""); }}
                    className={cn(
                      "border py-2.5 text-sm font-semibold transition-colors",
                      active
                        ? "border-accent bg-accent text-white shadow-md shadow-accent/25"
                        : "border-gray-200 bg-white text-gray-600 hover:border-accent/50",
                    )}
                  >
                    ${val}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Custom amount */}
          <div className="mt-3 flex items-center gap-2 border border-gray-200 px-3 transition-colors focus-within:border-accent">
            <span className="text-sm font-semibold text-gray-400">$</span>
            <input
              type="number"
              min="1"
              placeholder="Other amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Cause */}
          <div className="mt-4">
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Choose a cause</label>
            <CauseSelect
              value={donationType}
              onChange={setDonationType}
              options={donationTypes.map((t) => t.donationType)}
              placeholder="Select a cause"
            />
          </div>

          {/* Impact line */}
          <div className="mt-5 flex items-start gap-2.5 border border-accent/20 bg-accent/5 px-4 py-3">
            <Heart className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm text-gray-600">
              You&apos;re giving <span className="font-bold text-primary">${activeAmount || 0}</span>
              {donationType ? <> to <span className="font-semibold text-primary">{donationType}</span></> : null}.
            </p>
          </div>

          {/* CTA */}
          <motion.button
            onClick={handleDonate}
            whileHover={reduce ? {} : { scale: 1.01 }}
            whileTap={reduce ? {} : { scale: 0.99 }}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-accent text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
          >
            Donate {activeAmount ? `$${activeAmount}` : "Now"}
            <ArrowRight className="h-4 w-4" />
          </motion.button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Lock className="h-3 w-3" /> Secure checkout · choose recurring at checkout.
          </p>
        </div>

        {/* Right — image */}
        <div className="relative hidden min-h-[420px] lg:block">
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/10" />
        </div>
      </motion.div>
    </section>
  );
};

export default QuickDonate;
