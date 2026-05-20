import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, BarChart3, Users, Calendar, CreditCard, Settings, ShoppingCart } from "lucide-react";

const previewViews = ["Homepage", "Admin Dashboard", "Donor Portal"];

export default function ThemePreview({ theme, orgName, className = "" }) {
  const [activeView, setActiveView] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveView((v) => (v + 1) % previewViews.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!theme) return null;

  const p = theme.primary;
  const a = theme.accent;
  const bg = theme.bg;
  const sb = theme.sidebar || darken(p, 10);
  const name = orgName || "Your Organisation";

  return (
    <div className={className}>
      {/* View toggle */}
      <div className="flex items-center justify-center gap-1 mb-4">
        {previewViews.map((view, i) => (
          <button
            key={view}
            onClick={() => setActiveView(i)}
            className="relative px-4 py-2 text-xs font-semibold rounded-xl transition-all"
            style={{
              color: activeView === i ? "#FFFFFF" : "#8B7E6A",
              backgroundColor: activeView === i ? a : "rgba(255,255,255,0.3)",
              boxShadow: activeView === i ? `0 4px 12px ${a}30` : "none",
            }}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Browser mockup */}
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/10 border border-white/20 bg-white">
        {/* Chrome */}
        <div className="bg-[#F5F5F5] px-4 py-2.5 flex items-center gap-2.5 border-b border-gray-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 bg-white rounded-lg h-6 ml-2 flex items-center px-3 border border-gray-200">
            <span className="text-[10px] text-gray-400 font-mono">
              {(orgName || "yourorg").toLowerCase().replace(/\s+/g, "-")}.platform.com
            </span>
          </div>
        </div>

        {/* Preview area */}
        <div className="relative overflow-hidden" style={{ backgroundColor: bg, height: "clamp(320px, 45vh, 500px)" }}>
          <AnimatePresence mode="wait">
            {activeView === 0 && <motion.div key="hp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="absolute inset-0"><HomepagePreview p={p} a={a} bg={bg} name={name} /></motion.div>}
            {activeView === 1 && <motion.div key="ad" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="absolute inset-0"><AdminPreview p={p} a={a} bg={bg} sb={sb} name={name} /></motion.div>}
            {activeView === 2 && <motion.div key="dn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="absolute inset-0"><DonorPreview p={p} a={a} bg={bg} name={name} /></motion.div>}
          </AnimatePresence>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {previewViews.map((_, i) => (
          <button key={i} onClick={() => setActiveView(i)} className="h-1.5 rounded-full transition-all duration-300" style={{ width: activeView === i ? 24 : 8, backgroundColor: activeView === i ? a : "#D1D5DB" }} />
        ))}
      </div>
    </div>
  );
}

function darken(hex, amt) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max((n >> 16) - amt * 2.55, 0);
  const g = Math.max(((n >> 8) & 0xff) - amt * 2.55, 0);
  const b = Math.max((n & 0xff) - amt * 2.55, 0);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ═══ HOMEPAGE ═══
function HomepagePreview({ p, a, bg, name }) {
  return (
    <div className="h-full" style={{ backgroundColor: bg }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: a + "20" }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: a }}>{name.charAt(0)}</div>
          <span className="text-[11px] font-bold" style={{ color: p }}>{name}</span>
        </div>
        <div className="flex items-center gap-3">
          {["Home", "About", "Programs", "Events"].map((l) => <span key={l} className="text-[9px] font-medium" style={{ color: p + "70" }}>{l}</span>)}
          <div className="px-3 py-1 rounded-lg text-white text-[9px] font-bold" style={{ backgroundColor: a }}>Donate</div>
        </div>
      </div>
      <div className="px-5 py-8 text-center">
        <p className="text-[16px] font-bold mb-1.5" style={{ color: p }}>Making a Difference Together</p>
        <p className="text-[9px] mb-4 max-w-[70%] mx-auto" style={{ color: p + "50" }}>Join us in creating lasting change in communities worldwide through sustainable giving</p>
        <div className="flex justify-center gap-2.5 mb-6">
          <div className="px-5 py-1.5 rounded-full text-white text-[9px] font-bold" style={{ backgroundColor: a }}>Donate Now</div>
          <div className="px-5 py-1.5 rounded-full text-[9px] font-bold border" style={{ color: p, borderColor: p + "25" }}>Learn More</div>
        </div>
      </div>
      <div className="px-5">
        <p className="text-[10px] font-bold mb-3" style={{ color: p }}>Active Campaigns</p>
        <div className="grid grid-cols-3 gap-3">
          {[{ t: "Education Fund", pct: 72 }, { t: "Clean Water", pct: 45 }, { t: "Health Care", pct: 88 }].map((c) => (
            <div key={c.t} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <div className="w-full h-8 rounded-lg mb-2" style={{ backgroundColor: a + "12" }} />
              <p className="text-[8px] font-bold mb-1" style={{ color: p }}>{c.t}</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ backgroundColor: a, width: `${c.pct}%` }} />
              </div>
              <p className="text-[7px] mt-1" style={{ color: p + "50" }}>{c.pct}% funded</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-5 mt-4 rounded-xl p-3 flex justify-around" style={{ backgroundColor: p }}>
        {[{ v: "1.2K", l: "Donors" }, { v: "$50K", l: "Raised" }, { v: "12", l: "Programs" }].map((s) => (
          <div key={s.l} className="text-center text-white">
            <p className="text-[11px] font-bold">{s.v}</p>
            <p className="text-[7px] opacity-50">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ ADMIN ═══
function AdminPreview({ p, a, bg, sb, name }) {
  return (
    <div className="flex h-full">
      <div className="w-[90px] py-3 px-2 flex flex-col" style={{ background: `linear-gradient(180deg, ${sb} 0%, ${darken(sb, 10)} 100%)` }}>
        <div className="mb-4 px-1">
          <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: a }}>{name.charAt(0)}</div>
          <p className="text-[6px] text-white/40 text-center mt-1.5 truncate">{name}</p>
        </div>
        {[{ icon: BarChart3, label: "Dashboard", active: true }, { icon: Heart, label: "Donations" }, { icon: Users, label: "Donors" }, { icon: Calendar, label: "Events" }, { icon: CreditCard, label: "Subscriptions" }, { icon: Settings, label: "Branding" }].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg mb-0.5" style={{ backgroundColor: item.active ? a + "25" : "transparent", color: item.active ? a : "rgba(255,255,255,0.45)" }}>
            <item.icon className="w-3 h-3" />
            <span className="text-[7px] font-medium">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 p-4" style={{ backgroundColor: bg }}>
        <p className="text-[12px] font-bold mb-3" style={{ color: p }}>Dashboard</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[{ v: "$12,450", l: "Total Raised", c: "#10B981" }, { v: "234", l: "Total Donors", c: "#3B82F6" }, { v: "8", l: "Active Programs", c: a }].map((card) => (
            <div key={card.l} className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm">
              <p className="text-[7px]" style={{ color: p + "50" }}>{card.l}</p>
              <p className="text-[12px] font-bold" style={{ color: p }}>{card.v}</p>
              <div className="w-8 h-[3px] rounded mt-1" style={{ backgroundColor: card.c }} />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm mb-3">
          <p className="text-[8px] font-bold mb-2" style={{ color: p }}>Revenue Overview</p>
          <div className="flex items-end gap-1 h-14">
            {[35, 50, 42, 65, 55, 78, 60, 85, 70, 90, 75, 95].map((h, i) => (
              <div key={i} className="flex-1 rounded-t transition-all" style={{ height: `${h}%`, backgroundColor: i === 11 ? a : a + "25" }} />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
          <p className="text-[8px] font-bold mb-2" style={{ color: p }}>Recent Donations</p>
          {["Sarah M. — $250", "Ahmed K. — $100", "Maria S. — $500"].map((d) => (
            <div key={d} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
              <span className="text-[7px]" style={{ color: p }}>{d}</span>
              <span className="text-[6px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: a + "15", color: a }}>completed</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ DONOR ═══
function DonorPreview({ p, a, bg, name }) {
  return (
    <div className="h-full" style={{ backgroundColor: bg }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: a + "20" }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: a }}>{name.charAt(0)}</div>
          <span className="text-[11px] font-bold" style={{ color: p }}>{name}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <ShoppingCart className="w-3.5 h-3.5" style={{ color: p + "60" }} />
          <div className="w-5 h-5 rounded-full" style={{ backgroundColor: p + "10" }} />
        </div>
      </div>
      <div className="flex h-full">
        <div className="w-[80px] border-r py-3 px-2" style={{ borderColor: a + "10" }}>
          {[{ l: "Dashboard", active: true }, { l: "Donations" }, { l: "Active Subs" }, { l: "Previous" }, { l: "Profile" }].map((item) => (
            <div key={item.l} className="px-2 py-1.5 rounded-lg mb-0.5 text-[7px] font-medium" style={{ backgroundColor: item.active ? a + "15" : "transparent", color: item.active ? a : p + "50" }}>{item.l}</div>
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold" style={{ color: p }}>Welcome Back</p>
            <div className="px-3 py-1 rounded-lg text-white text-[8px] font-bold" style={{ backgroundColor: a }}>Make a Donation</div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[{ v: "$2,450", l: "Total Given" }, { v: "3", l: "Active Subs" }, { v: "12", l: "Donations" }].map((s) => (
              <div key={s.l} className="bg-white rounded-xl p-2.5 border border-gray-100 text-center shadow-sm">
                <p className="text-[11px] font-bold" style={{ color: p }}>{s.v}</p>
                <p className="text-[6px]" style={{ color: p + "50" }}>{s.l}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm mb-3">
            <p className="text-[8px] font-bold mb-2" style={{ color: p }}>Recent Donations</p>
            {[{ t: "Education Fund", amt: "$100", s: "completed" }, { t: "Clean Water", amt: "$50", s: "completed" }, { t: "Monthly - Health", amt: "$25/mo", s: "active" }].map((d) => (
              <div key={d.t} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <span className="text-[7px] font-medium" style={{ color: p }}>{d.t}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[7px]" style={{ color: p }}>{d.amt}</span>
                  <span className="text-[5px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: d.s === "active" ? a + "15" : "#10B98120", color: d.s === "active" ? a : "#10B981" }}>{d.s}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <p className="text-[8px] font-bold mb-1.5" style={{ color: p }}>Active Subscription</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] font-bold" style={{ color: p }}>Monthly Giving - Health</p>
                <p className="text-[6px]" style={{ color: p + "50" }}>$25/month · Next: Jan 15</p>
              </div>
              <div className="flex gap-1">
                <div className="px-2 py-0.5 rounded-md text-[6px] font-medium border" style={{ color: p + "60", borderColor: p + "20" }}>Pause</div>
                <div className="px-2 py-0.5 rounded-md text-[6px] text-white font-medium" style={{ backgroundColor: a }}>Manage</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
