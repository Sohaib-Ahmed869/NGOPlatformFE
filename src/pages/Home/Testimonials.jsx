import { useReducedMotion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { SectionHeading } from "../../components/giving";
import { cn } from "../../utils/cn";

const REVIEWS = [
  {
    name: "Emily Richardson",
    location: "London, UK",
    quote: "Donating here has been incredibly rewarding. I can see exactly where my money goes and the impact it creates.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
  },
  {
    name: "Ahmed Al-Rashid",
    location: "Dubai, UAE",
    quote: "The transparency and dedication of this foundation is unmatched. Every quarterly report shows real, measurable change.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
  },
  {
    name: "Sarah Chen",
    location: "New York, USA",
    quote: "I started with a small monthly donation and now I'm a regular volunteer. This organisation truly changes lives.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
  },
  {
    name: "David Okafor",
    location: "Lagos, Nigeria",
    quote: "Seeing the wells and schools come to life with my own eyes was unforgettable. Every dollar is put to work.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
  },
  {
    name: "Priya Sharma",
    location: "Mumbai, India",
    quote: "Giving has never felt this effortless or this meaningful. The instant receipts and updates keep me coming back.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80",
  },
  {
    name: "Liam O'Sullivan",
    location: "Dublin, Ireland",
    quote: "An organisation that genuinely walks the talk. Their emergency response during the floods was extraordinary.",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80",
  },
  {
    name: "Fatima Zahra",
    location: "Casablanca, Morocco",
    quote: "I pay my Zakat here every year. It's calculated in seconds and I trust it reaches the people who need it most.",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80",
  },
  {
    name: "James Carter",
    location: "Toronto, Canada",
    quote: "The team is responsive, the reporting is honest, and the impact is real. This is how charity should be done.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
  },
];

function ReviewCard({ t }) {
  return (
    <div className="relative w-[300px] shrink-0 overflow-hidden border border-gray-100 bg-white p-7 shadow-sm sm:w-[360px]">
      <Quote className="h-8 w-8 text-accent/20" />
      <div className="mt-3 flex gap-0.5">
        {Array.from({ length: 5 }).map((_, s) => (
          <Star key={s} className="h-4 w-4 fill-accent text-accent" />
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-text-muted">&ldquo;{t.quote}&rdquo;</p>
      <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
        <img src={t.avatar} alt={t.name} className="h-11 w-11 rounded-full object-cover" loading="lazy" />
        <div>
          <p className="font-semibold text-primary">{t.name}</p>
          <p className="text-xs text-text-muted">{t.location}</p>
        </div>
      </div>
    </div>
  );
}

function Testimonials() {
  const reduce = useReducedMotion();

  return (
    <section className="overflow-hidden bg-white py-20 lg:py-24">
      <div className="mx-auto mb-12 max-w-6xl px-6">
        <SectionHeading
          icon={Quote}
          eyebrow="Donor stories"
          title="What our donors say"
          intro="Real stories from real people making a difference around the world."
          center
        />
      </div>

      {/* Auto-scrolling carousel (pauses on hover). Reduced-motion → manual scroll. */}
      <div className={cn("group relative", reduce ? "overflow-x-auto px-6 pb-4" : "overflow-hidden")}>
        {!reduce && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-24" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-24" />
          </>
        )}
        <div
          className={cn(
            "flex w-max gap-6",
            reduce ? "" : "animate-marquee group-hover:[animation-play-state:paused]",
          )}
        >
          {(reduce ? REVIEWS : [...REVIEWS, ...REVIEWS]).map((t, i) => (
            <ReviewCard key={`${t.name}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
