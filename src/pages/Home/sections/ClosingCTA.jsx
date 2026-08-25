import { Reveal, Eyebrow, PillButton } from "../ui";
import { ClosingHorizon } from "../scenes";

/* Closing invitation — the same landscape as the hero, at dusk, so the page
   opens and closes in the same place. */

export default function ClosingCTA() {
  return (
    <section className="relative overflow-hidden bg-primary">
      <div className="relative z-10 px-6 pb-56 pt-20 text-center lg:pb-64 lg:pt-28">
        <Reveal>
          <Eyebrow tone="light">Your turn</Eyebrow>
          <h2 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(2rem,4.4vw,3.5rem)] font-bold leading-[1.06] tracking-[-0.03em] text-white">
            Ninety seconds to give. A lifetime of clean water.
          </h2>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <PillButton to="/donate" tone="accent">
              Donate now
            </PillButton>
            <PillButton to="/get-involved" tone="outlineLight">
              Volunteer with us
            </PillButton>
          </div>
        </Reveal>
      </div>

      <ClosingHorizon className="absolute inset-x-0 bottom-0 block h-[16rem] w-full lg:h-[18rem]" />
    </section>
  );
}
