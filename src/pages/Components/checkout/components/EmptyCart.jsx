import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, ShoppingBag, Sparkles, Lock, ShieldCheck,
  Gift, HandHeart, Calculator, Moon,
} from "lucide-react";
import { cardShell, accentBtn } from "../constants";

// Curated "where to go next" shortcuts so the dead-end becomes a starting point.
// All routes are real (see App.jsx); PageGate handles any a tenant has disabled.
const QUICK_LINKS = [
  { to: "/programs", label: "Programs", icon: Gift },
  { to: "/giving", label: "Islamic Giving", icon: HandHeart },
  { to: "/zakat/calculator", label: "Zakat", icon: Calculator },
  { to: "/Ramadan", label: "Ramadan", icon: Moon },
];

export default function EmptyCart() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-background px-4 py-16">
      {/* Ambient accent glows */}
      <span aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />

      <div className={`relative w-full max-w-lg border-t-2 border-t-accent px-6 py-12 text-center sm:px-12 ${cardShell}`}>
        {/* Hero icon with a soft pulsing ring */}
        <div className="relative mx-auto mb-7 grid h-24 w-24 place-items-center">
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full border border-accent/30 [animation-duration:2.5s]" />
          <span aria-hidden className="absolute inset-2 rounded-full bg-accent/10" />
          <span className="checkout-glow-lg relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-light text-white">
            <ShoppingBag className="h-7 w-7" />
          </span>
          <Sparkles aria-hidden className="absolute -right-1 top-0 h-5 w-5 text-accent" />
        </div>

        <span className="inline-flex items-center gap-1.5 border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          Your cart
        </span>
        <h2 className="mt-4 font-heading text-2xl font-bold text-primary sm:text-3xl">Your cart is empty</h2>
        <p className="mx-auto mt-2.5 max-w-sm text-text-muted">
          You haven&apos;t added a donation yet. Pick a cause below and your generosity goes straight to those who need it — 100% of it.
        </p>

        {/* Primary actions */}
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button onClick={() => navigate("/donate")} className={`${accentBtn} w-full px-6 py-3 text-sm sm:w-auto`}>
            Browse donations <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            to="/giving"
            className="inline-flex w-full items-center justify-center gap-2 rounded-token-btn border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-primary transition-colors hover:border-accent/40 hover:bg-gray-50 sm:w-auto"
          >
            Explore Islamic Giving
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-9 border-t border-gray-100 pt-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Popular ways to give</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group inline-flex items-center gap-2 rounded-token-btn border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-primary transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent"
              >
                <Icon className="h-4 w-4 text-accent" /> {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Reassurance */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-accent" /> Encrypted &amp; secure</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> 100% donation policy</span>
        </div>
      </div>
    </div>
  );
}
