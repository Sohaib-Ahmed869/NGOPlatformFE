/**
 * Reusable glassmorphism KPI card used across admin and donor dashboards.
 * Themed using CSS variables — adapts to org branding.
 *
 * Usage:
 *   <KpiCard title="Total" value="$500" icon={DollarSign} color="#059669" />
 *   <KpiCard title="Revenue" value="$1,200" icon={TrendingUp} color="#8B5CF6" sparkData={[2,4,3,6]} />
 */
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const DEFAULT_SPARKS = {
  rising: [2, 3, 2.5, 4, 3.5, 5, 6],
  steady: [3, 3.5, 3, 3.8, 3.2, 3.6, 3.4],
  dip: [5, 4.5, 3, 2.5, 3, 3.5, 4],
  wave: [2, 4, 3, 5, 2.5, 4.5, 3],
  flat: [2, 2, 2.5, 2, 2.2, 2, 2.3],
};

const kpiCSS = `
.kpi-glass {
  position: relative; overflow: hidden;
  transition: transform .3s ease, border-color .4s ease, box-shadow .4s ease;
}
.kpi-glass:hover {
  transform: translateY(-3px) scale(1.04);
  box-shadow:
    0 0 20px rgba(0,0,0,.06),
    0 8px 32px -8px rgba(0,0,0,.10);
}
.kpi-glass::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.50) 50%, transparent 65%);
  transform: translateX(-120%);
  transition: transform .6s ease;
  pointer-events: none;
}
.kpi-glass:hover::before { transform: translateX(120%); }
.kpi-glass .kpi-glow {
  transition: opacity .4s ease, transform .4s ease;
  opacity: 0.5;
}
.kpi-glass:hover .kpi-glow {
  opacity: 1;
  transform: translate(33%, -50%) scale(1.15);
}
`;

// Inject CSS once
let cssInjected = false;
function injectCSS() {
  if (cssInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = kpiCSS;
  document.head.appendChild(style);
  cssInjected = true;
}

const Sparkline = ({ data, color, height = 28 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(" ");
  const fill = `${pts} ${w},${height} 0,${height}`;
  const id = `sp-${color.replace(/[^a-zA-Z0-9]/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

export default function KpiCard({
  title,
  value,
  icon: Icon,
  color = "#059669",
  sparkData,
  defaultSpark,
  delta,
  index = 0,
  animate = true,
}) {
  injectCSS();

  const hasRealData = sparkData && sparkData.length >= 2 && sparkData.some((v) => v > 0);
  const finalSpark = hasRealData ? sparkData : defaultSpark || null;

  const Wrapper = animate ? motion.div : "div";
  const wrapperProps = animate ? { variants: fadeUp, custom: index } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="kpi-glass rounded-xl p-5"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,.75), rgba(255,255,255,.45))",
        backdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid rgba(0,0,0,.06)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(0,0,0,.04), 0 8px 24px -8px rgba(0,0,0,.06)",
      }}
    >
      <div
        className="kpi-glow absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}20, transparent 70%)` }}
      />
      <div className="flex items-start justify-between mb-2 relative">
        <div>
          <p className="text-[11px] tracking-[.05em] uppercase text-text-muted font-medium">{title}</p>
          <p className="text-[28px] font-bold text-primary leading-none mt-1 font-heading">{value}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl grid place-items-center"
          style={{
            background: `${color}12`,
            border: `1px solid ${color}25`,
            boxShadow: `0 0 12px ${color}20`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      {delta && (
        <div className="flex items-center gap-1 mb-2 relative">
          <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
          <span className="text-[11px] font-semibold text-green-600">{delta}</span>
        </div>
      )}
      {finalSpark && <Sparkline data={finalSpark} color={color} />}
    </Wrapper>
  );
}

export { DEFAULT_SPARKS };
