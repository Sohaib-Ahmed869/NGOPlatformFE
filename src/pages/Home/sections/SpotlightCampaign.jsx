import { MapPin, Clock } from "lucide-react";
import { R, Reveal, Eyebrow, PillButton, TextLink, AvatarStack } from "../ui";

/* Featured appeal — a single campaign given the full width, with a live
   progress bar. Placeholder copy/imagery until this is wired to a campaign. */

const IMAGE = "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=1200&q=80";
const BACKERS = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80",
];

const RAISED = 84200;
const GOAL = 120000;
const PCT = Math.round((RAISED / GOAL) * 100);
const money = (n) => `$${n.toLocaleString("en-US")}`;

export default function SpotlightCampaign() {
  return (
    <section className="bg-background px-6 pb-20 lg:pb-28">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className={`grid overflow-hidden ${R.panel} border border-primary/10 bg-white lg:grid-cols-2`}>
            {/* Image half */}
            <div className="relative min-h-[18rem]">
              <img src={IMAGE} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-primary backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5 text-accent" /> Balochistan, Pakistan
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-primary backdrop-blur-sm">
                  <Clock className="h-3.5 w-3.5 text-accent" /> 18 days left
                </span>
              </div>
            </div>

            {/* Copy half */}
            <div className="p-8 sm:p-10 lg:p-12">
              <Eyebrow>Featured appeal</Eyebrow>
              <h2 className="mt-6 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.03em] text-primary">
                Clean water for 40 villages before winter.
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-text-muted">
                One solar well serves 300 people for the next twenty years.
              </p>

              {/* Progress */}
              <div className="mt-9">
                <div className="flex items-end justify-between">
                  <p className="font-display text-2xl font-bold text-primary">
                    {money(RAISED)}
                    <span className="ml-2 text-sm font-normal text-text-muted">raised of {money(GOAL)}</span>
                  </p>
                  <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">{PCT}%</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-warm-beige">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-[width] duration-700"
                    style={{ width: `${PCT}%` }}
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <AvatarStack people={BACKERS} size="h-8 w-8" />
                <p className="text-xs text-text-muted">
                  <span className="font-semibold text-primary">1,284 donors</span> have given this month
                </p>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-6">
                <PillButton to="/donate" tone="accent">
                  Fund a well
                </PillButton>
                <TextLink to="/initiatives">All appeals</TextLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
