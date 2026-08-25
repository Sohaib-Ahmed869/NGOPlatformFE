import { Reveal, SectionTitle, PillButton, R } from "../ui";
import { StepChoose, StepDeliver, StepReport } from "../scenes";

/* Three steps, each carrying its own drawn scene rather than an icon — the same
   hand as the hero, at card scale. */

const STEPS = [
  {
    scene: StepChoose,
    title: "Choose your cause",
    text: "Water, food, education, orphan care — or let us send it where the need is sharpest.",
  },
  {
    scene: StepDeliver,
    title: "We deliver it locally",
    text: "Our own teams buy and distribute in-country. No shipping waste, no middlemen.",
  },
  {
    scene: StepReport,
    title: "You see the result",
    text: "Photos, receipts and a location, in your donor dashboard within weeks.",
  },
];

export default function HowItWorks() {
  return (
    <section className="border-y border-primary/10 bg-white px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle eyebrow="How it works" title="Three steps to a changed life." className="max-w-xl" />
          <Reveal delay={0.1}>
            <PillButton to="/donate" tone="dark">
              Start giving
            </PillButton>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ scene: Scene, title, text }, i) => (
            <Reveal key={title} delay={i * 0.09}>
              <div className={`h-full overflow-hidden ${R.card} border border-primary/10 bg-background`}>
                <Scene className="block h-auto w-full" />
                <div className="p-7 pt-2">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-sm font-bold text-accent">{`0${i + 1}`}</span>
                    <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-primary">{title}</h3>
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed text-text-muted">{text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
