import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Wallet, Gem, Scale, RotateCcw, Info, Check, HandCoins, ArrowRight, Lock } from "lucide-react";
import { toast } from "react-hot-toast";
import { useCart } from "../Components/cart";
import { useTenant } from "../../context/TenantContext";
import usePageContent from "../../hooks/usePageContent";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { PageHero, GivingSubNav, SectionHeading, Eyebrow, icon } from "../../components/giving";
import {
  NISAB,
  ZAKAT_RATE,
  ZAKAT_ASSET_FIELDS,
  ZAKAT_STEPS,
  GIVING_NAV,
  ZAKAT_HERO_IMG,
} from "../../config/giving";

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY = {
  cashInHand: "",
  goldValue: "",
  silverValue: "",
  investments: "",
  businessInventory: "",
  liabilities: "",
  nisab: "gold",
};

/* A single themed currency input. */
function MoneyField({ icon: Icon, label, hint, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
        {Icon && <Icon className="h-4 w-4 text-accent" />} {label}
      </label>
      <div className="flex items-center gap-2 border border-gray-200 bg-white px-3 transition-colors focus-within:border-accent">
        <span className="text-sm font-semibold text-gray-400">$</span>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-300"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

/* One line in the results breakdown. */
function Row({ label, value, strong, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold text-primary" : muted ? "text-text-muted" : "text-gray-600"}>{label}</span>
      <span className={strong ? "font-bold text-primary" : muted ? "text-text-muted" : "text-gray-800"}>{value}</span>
    </div>
  );
}

const ZakatCalculator = () => {
  const { addItem } = useCart();
  const { organisation } = useTenant();
  const { content } = usePageContent("zakat");
  const hero = content?.hero || {};
  const orgName = organisation?.name || "us";

  const [formData, setFormData] = useState(EMPTY);
  const set = (key, val) => setFormData((p) => ({ ...p, [key]: val }));

  // Live calculation — updates as the donor types, no submit needed.
  const result = useMemo(() => {
    const num = (k) => parseFloat(formData[k]) || 0;
    const totalAssets =
      num("cashInHand") + num("goldValue") + num("silverValue") + num("investments") + num("businessInventory");
    const liabilities = num("liabilities");
    const net = totalAssets - liabilities;
    const nisab = NISAB[formData.nisab]?.value ?? NISAB.gold.value;
    const eligible = net >= nisab;
    const zakat = eligible ? net * ZAKAT_RATE : 0;
    const hasInput = totalAssets > 0 || liabilities > 0;
    return { totalAssets, liabilities, net, nisab, eligible, zakat, hasInput };
  }, [formData]);

  const payable = Math.round(result.zakat * 100) / 100;

  const handlePay = () => {
    if (payable <= 0) {
      toast.error("Enter your assets above to calculate your Zakat first.");
      return;
    }
    addItem({
      id: `zakat-${payable}-${Date.now()}`,
      title: "Zakat",
      price: payable,
      donationType: "Zakat ul Maal",
      image: "",
    });
    toast.success(`$${money(payable)} Zakat added to your giving cart`);
  };

  const handleReset = () => setFormData(EMPTY);

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHero
        image={hero.image ?? ZAKAT_HERO_IMG}
        icon={Calculator}
        eyebrow={hero.eyebrow ?? "2.5% of your wealth"}
        title={hero.title ?? "Zakat Calculator"}
        subtitle={
          hero.subtitle ??
          "Add up your assets, subtract what you owe, and we'll work out your Zakat instantly — then you can pay it in seconds."
        }
      />

      <GivingSubNav items={GIVING_NAV} />

      {/* ── Calculator ───────────────────────────────────────────────────── */}
      <section className="bg-background px-6 py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_minmax(0,400px)]">
          {/* Left — inputs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
          >
            <Eyebrow icon={Wallet}>Your assets</Eyebrow>
            <h2 className="mt-3 font-heading text-2xl font-bold text-primary">What you own</h2>
            <p className="mt-1 text-sm text-text-muted">Enter the current value of everything you&apos;ve held for a lunar year.</p>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {ZAKAT_ASSET_FIELDS.map((f) => (
                <MoneyField
                  key={f.key}
                  icon={icon(f.icon)}
                  label={f.label}
                  hint={f.hint}
                  value={formData[f.key]}
                  onChange={(v) => set(f.key, v)}
                />
              ))}
            </div>

            <div className="my-7 h-px bg-gray-100" />

            <Eyebrow icon={Scale}>Deductions</Eyebrow>
            <h2 className="mt-3 font-heading text-2xl font-bold text-primary">What you owe</h2>
            <p className="mt-1 text-sm text-text-muted">Debts and liabilities due now are deducted from your total.</p>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <MoneyField icon={Scale} label="Liabilities & debts" value={formData.liabilities} onChange={(v) => set("liabilities", v)} />
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
                  <Gem className="h-4 w-4 text-accent" /> Nisab threshold
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(NISAB).map(([key, n]) => {
                    const active = formData.nisab === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => set("nisab", key)}
                        className={
                          "border px-3 py-2.5 text-left text-sm transition-colors " +
                          (active
                            ? "border-accent bg-accent text-white shadow-sm shadow-accent/25"
                            : "border-gray-200 bg-white text-gray-600 hover:border-accent/50")
                        }
                      >
                        <span className="block font-semibold">{n.label}</span>
                        <span className={"text-xs " + (active ? "text-white/80" : "text-text-muted")}>${money(n.value)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="mt-7 inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
            >
              <RotateCcw className="h-4 w-4" /> Reset calculator
            </button>
          </motion.div>

          {/* Right — live result (sticky) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <div className="relative overflow-hidden border border-gray-100 bg-white shadow-xl">
              <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

              <div className="relative border-b border-gray-100 bg-primary px-6 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Your Zakat due</p>
                <p className="mt-1 font-heading text-4xl font-bold text-white">${money(payable)}</p>
                <p className="mt-1 text-xs text-white/60">2.5% of your net zakatable wealth</p>
              </div>

              <div className="relative space-y-3 px-6 py-5 text-sm">
                <Row label="Total assets" value={`$${money(result.totalAssets)}`} />
                <Row label="Liabilities" value={`– $${money(result.liabilities)}`} />
                <div className="h-px bg-gray-100" />
                <Row label="Net zakatable wealth" value={`$${money(result.net)}`} strong />
                <Row label={`Nisab (${NISAB[formData.nisab].label})`} value={`$${money(result.nisab)}`} muted />

                {result.hasInput && (
                  <div
                    className={
                      "mt-2 flex items-start gap-2 border px-3 py-2.5 text-xs " +
                      (result.eligible
                        ? "border-accent/20 bg-accent/5 text-primary"
                        : "border-yellow-300 bg-yellow-50 text-yellow-800")
                    }
                  >
                    {result.eligible ? (
                      <>
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>Your wealth is above the Nisab — Zakat is due on you.</span>
                      </>
                    ) : (
                      <>
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Your net wealth is below the Nisab, so Zakat isn&apos;t obligatory right now.</span>
                      </>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={payable <= 0}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 bg-accent text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <HandCoins className="h-4 w-4" />
                  Pay {payable > 0 ? `$${money(payable)}` : "your Zakat"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-gray-400">
                  <Lock className="h-3 w-3" /> 100% of your Zakat reaches those in need.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How Zakat works ──────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading icon={Info} eyebrow="How it works" title="Three steps to fulfil your Zakat" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {ZAKAT_STEPS.map((s, i) => {
              const Ic = icon(s.icon);
              const text = s.title === "Pay your 2.5%" ? `Give your Zakat through ${orgName} and we'll deliver it to those who qualify.` : s.text;
              return (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                  className="group relative overflow-hidden border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
                >
                  <span className="absolute right-5 top-4 font-heading text-4xl font-bold text-accent/10">{s.n}</span>
                  <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-accent group-hover:text-white">
                    <Ic className="h-6 w-6" />
                  </span>
                  <h3 className="mb-1.5 font-heading text-base font-bold text-primary">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-text-muted">{text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <NewsletterSection />
    </motion.div>
  );
};

export default ZakatCalculator;
