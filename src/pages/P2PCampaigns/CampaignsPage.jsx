import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Users, Plus, Target, Loader2 } from "lucide-react";
import GoFundMeService from "../../services/goFundMeService";

const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "urgent", label: "Most urgent" },
  { value: "progress", label: "Closest to goal" },
  { value: "amount", label: "Largest goal" },
];

function Card({ c, i }) {
  const pct = c.targetAmount > 0 ? Math.min(100, Math.round((c.currentAmount / c.targetAmount) * 100)) : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
      <Link to={`/p2p-campaigns/${c.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="relative h-44 overflow-hidden bg-accent/10">
          <img src={c.image} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold capitalize text-primary backdrop-blur">{c.category}</span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-heading text-lg font-bold text-primary line-clamp-2">{c.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-text-muted">{c.description}</p>
          <div className="mt-auto pt-4">
            <div className="mb-1.5 flex items-end justify-between">
              <span className="text-sm font-bold text-primary">{money(c.currentAmount)}</span>
              <span className="text-xs font-semibold text-accent">{pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
              <span>of {money(c.targetAmount)}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.donationCount}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setLoading(true);
    GoFundMeService.getPublicCampaigns({ sort, limit: 24 })
      .then((res) => setCampaigns(res.goFundMes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sort]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden py-28 lg:py-36">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/80">
            <Target className="h-3.5 w-3.5" /> Community fundraisers
          </span>
          <h1 className="font-heading text-4xl font-bold text-white md:text-5xl">Support a cause, or start your own</h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">Real fundraisers from our community. Give directly, or launch your own in minutes.</p>
          <Link to="/p2p-campaigns/start" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-primary transition-transform hover:scale-105">
            <Plus className="h-5 w-5" /> Start a fundraiser
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-primary">Active fundraisers</h2>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center shadow-sm">
            <Heart className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="text-text-muted">No active fundraisers yet — be the first to start one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c, i) => <Card key={c._id} c={c} i={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
