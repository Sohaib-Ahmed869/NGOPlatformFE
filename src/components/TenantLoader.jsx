import { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";

/**
 * Full-screen loading animation for tenant portals.
 * Starts with neutral SaaS colors, transitions to tenant's branding once loaded.
 */
export default function TenantLoader({ slug, ready, branding, onComplete }) {
  const containerRef = useRef(null);
  const [introDone, setIntroDone] = useState(false);
  const exitCalled = useRef(false);

  const displayName = slug
    ? slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "Loading";

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Colors: start neutral, switch to branding once available
  const accent = branding?.accentColor || "#C9A84C";
  const primary = branding?.primaryColor || "#2C2418";
  const bg = branding?.backgroundColor || "#FAF7F2";

  const runExit = useCallback(() => {
    if (exitCalled.current || !containerRef.current) return;
    exitCalled.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        onCompleteRef.current?.();
      },
    });

    tl.to({}, { duration: 0.2 });
    tl.to(".loader-dot", { opacity: 0, scale: 0.5, duration: 0.2, stagger: 0.02, ease: "power2.in" });
    tl.to(".loader-name-group", { scale: 1.08, duration: 0.4, ease: "power2.inOut" }, "<");
    tl.to(".loader-tagline", { opacity: 0, duration: 0.2, ease: "power2.in" }, "<");
    tl.to(containerRef.current, { opacity: 0, duration: 0.35, ease: "power2.out" });
  }, []);

  // Intro animation
  useEffect(() => {
    if (!containerRef.current) return;
    document.body.style.overflow = "hidden";

    const tl = gsap.timeline({ onComplete: () => setIntroDone(true) });
    tl.fromTo(".loader-dot", { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.2, stagger: 0.03, ease: "back.out(1.7)" });
    tl.fromTo(".loader-name-reveal", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "power3.inOut" }, "+=0.1");
    tl.fromTo(".loader-tagline", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.3");

    return () => tl.kill();
  }, []);

  // Exit when both intro is done AND data is ready
  useEffect(() => {
    if (introDone && ready) runExit();
  }, [introDone, ready, runExit]);

  // Safety timeout
  useEffect(() => {
    const t = setTimeout(() => {
      if (!exitCalled.current) {
        console.warn("TenantLoader: safety timeout");
        runExit();
      }
    }, 6000);
    return () => clearTimeout(t);
  }, [runExit]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-700"
      style={{ backgroundColor: bg }}
    >
      {/* Dots — use accent color */}
      <div className="flex items-center justify-center gap-2.5 mb-12">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="loader-dot opacity-0 w-2.5 h-2.5 rounded-full transition-colors duration-700"
            style={{
              backgroundColor: i % 2 === 0 ? accent + "80" : primary + "25",
            }}
          />
        ))}
      </div>

      {/* Name with sweep reveal — uses primary color */}
      <div className="loader-name-group flex flex-col items-center">
        <div className="relative px-6">
          <h1
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-center tracking-tight select-none transition-colors duration-700"
            style={{ color: primary + "14" }}
          >
            {displayName}
          </h1>
          <h1
            className="loader-name-reveal absolute inset-0 font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-center tracking-tight select-none px-6 transition-colors duration-700"
            style={{ color: primary, clipPath: "inset(0 100% 0 0)" }}
          >
            {displayName}
          </h1>
        </div>
        <div className="loader-tagline opacity-0 mt-5 flex items-center gap-3">
          <div className="w-10 h-px transition-colors duration-700" style={{ backgroundColor: accent }} />
          <p
            className="text-sm tracking-[0.15em] uppercase font-body transition-colors duration-700"
            style={{ color: primary + "80" }}
          >
            Loading your portal
          </p>
          <div className="w-10 h-px transition-colors duration-700" style={{ backgroundColor: accent }} />
        </div>
      </div>

      {/* Bottom pulse — uses accent */}
      <div className="absolute bottom-14 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-pulse transition-colors duration-700"
            style={{ backgroundColor: accent, animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </div>
    </div>
  );
}
