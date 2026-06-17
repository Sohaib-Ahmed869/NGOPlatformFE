import { useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { CheckoutProvider, useCheckout } from "./CheckoutContext";
import { cardShell } from "./constants";
import Stepper from "./components/Stepper";
import OrderSummary from "./components/OrderSummary";
import MobileSummaryBar from "./components/MobileSummaryBar";
import CheckoutNav from "./components/CheckoutNav";
import EmptyCart from "./components/EmptyCart";
import DonationStep from "./steps/DonationStep";
import DonorDetailsStep from "./steps/DonorDetailsStep";
import PaymentStep from "./steps/PaymentStep";

const STEP_VIEWS = {
  1: DonationStep,
  2: DonorDetailsStep,
  3: PaymentStep,
};

// Scroll-reveal: blocks fade + rise into place as they enter the viewport.
const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const revealProps = {
  variants: reveal,
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, margin: "-8% 0px" },
};

function CheckoutLayout() {
  const { isCartEmpty, activeStep } = useCheckout();

  // Smooth-scroll back to the top on each step change so the step transition reads.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStep]);

  if (isCartEmpty) return <EmptyCart />;

  const ActiveStep = STEP_VIEWS[activeStep] || DonationStep;

  return (
    <div className="relative min-h-screen bg-background px-4 pb-24 pt-16 sm:px-6 lg:pb-20">
      {/* Decorative layer — clipped on its own so it never makes the scroll root
          overflow-hidden (which would break the sticky summary). Tints the page
          with the tenant theme: an accent wash on top of the theme background. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-accent/[0.07] to-transparent" />
        <span className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <span className="absolute -left-24 top-40 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Header — marked as the hero so the navbar collapses into its themed
            floating capsule once you scroll past it. */}
        <motion.div {...revealProps} data-hero className="mb-8">
          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-primary sm:text-4xl">Complete your donation</h1>
          <p className="mt-2 max-w-xl text-text-muted">
            A few quick steps and your gift is on its way — every contribution is encrypted and goes further with our 100% donation policy.
          </p>
        </motion.div>

        <motion.div {...revealProps}>
          <Stepper activeStep={activeStep} />
        </motion.div>

        {/* Mobile-only collapsible summary (desktop uses the sidebar) */}
        <motion.div {...revealProps}>
          <MobileSummaryBar />
        </motion.div>

        {/* Content + summary */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <motion.div {...revealProps}>
            <div className={`${cardShell} p-6 sm:p-8`}>
              {/* Each step slides/fades in when you navigate between steps. */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ActiveStep />
                </motion.div>
              </AnimatePresence>
            </div>
            <CheckoutNav variant="desktop" />
          </motion.div>

          <motion.div {...revealProps}>
            <OrderSummary />
          </motion.div>
        </div>
      </div>

      {/* Sticky action bar pinned to the viewport on mobile */}
      <CheckoutNav variant="mobile" />
    </div>
  );
}

export default function UnifiedCheckout() {
  return (
    <CheckoutProvider>
      <MotionConfig reducedMotion="user">
        <CheckoutLayout />
      </MotionConfig>
    </CheckoutProvider>
  );
}
