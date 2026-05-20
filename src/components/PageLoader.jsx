/**
 * Consistent page-level loading spinner used across all admin and donor portal tabs.
 * Themed using CSS variables — always matches the org's branding.
 *
 * Usage:
 *   if (loading) return <PageLoader />;
 *   if (loading) return <PageLoader text="Loading donations..." />;
 */
export default function PageLoader({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-10 h-10 rounded-full border-[3px] border-accent/20" />
        {/* Spinning arc */}
        <div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-transparent border-t-accent animate-spin" />
      </div>
      <p className="mt-4 text-sm text-text-muted font-medium">{text}</p>
    </div>
  );
}
