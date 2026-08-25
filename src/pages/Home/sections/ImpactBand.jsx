import { Reveal, Eyebrow, TextLink } from "../ui";
import { ImpactChart } from "../scenes";

/* The impact numbers, with the trend drawn rather than described. Primary fill
   so it reads as the page's second colour block. */

const METRICS = [
  { value: "48,290", label: "People reached" },
  { value: "312", label: "Water points built" },
  { value: "5,600", label: "Children in school" },
  { value: "94¢", label: "Of every dollar" },
];

export default function ImpactBand() {
  return (
    <section className="relative overflow-hidden bg-primary px-6 py-20 lg:py-28">
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <Eyebrow tone="light">Our impact</Eyebrow>
            <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-bold leading-[1.08] tracking-[-0.03em] text-white">
              Numbers we are happy to be held to.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
              Water points built each year, from field data — not estimates.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8">
              {METRICS.map((m) => (
                <div key={m.label}>
                  <p className="font-display text-3xl font-bold tracking-[-0.03em] text-white lg:text-4xl">{m.value}</p>
                  <p className="mt-1 text-sm font-semibold text-accent">{m.label}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-10">
              <TextLink to="/about" tone="light">
                Read the full impact report
              </TextLink>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.08}>
          <ImpactChart className="block h-auto w-full" />
        </Reveal>
      </div>
    </section>
  );
}
