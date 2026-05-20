/**
 * Theme-aware hero image overlay.
 * Light tint of the tenant's primary color — lets the image show through clearly.
 */
export default function HeroOverlay() {
  return (
    <>
      {/* Dark base to ensure white text is readable */}
      <div className="absolute inset-0 bg-black/40" />
      {/* Subtle theme-colored tint on top */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-sidebar-top, #4A3F30))`,
          opacity: 0.25,
        }}
      />
    </>
  );
}
