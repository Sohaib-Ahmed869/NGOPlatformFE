import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Share2, Users, User, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import GoFundMeService from "../../services/goFundMeService";
import Loader from "../../components/Loader";
import GoFundMeCheckout from "./GoFundMeCheckout";

const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const URGENCY = {
  low: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
};

export default function CampaignDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);

  const fetchCampaign = async () => {
    try {
      const res = await GoFundMeService.getCampaignBySlug(slug);
      setCampaign(res.goFundMe);
      setRecent(res.recentDonations || []);
    } catch {
      toast.error("Fundraiser not found");
      navigate("/p2p-campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (slug) fetchCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: campaign.title, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success("Link copied"); }
  };

  const onSuccess = (donation, updated) => {
    if (updated) {
      setCampaign((p) => ({
        ...p,
        currentAmount: updated.currentAmount,
        donationCount: updated.donationCount,
        status: updated.isCompleted ? "completed" : p.status,
        isActive: !updated.isCompleted,
      }));
    }
    fetchCampaign();
  };

  if (loading) return <Loader />;
  if (!campaign) return null;

  const pct = campaign.targetAmount > 0 ? Math.min(100, Math.round((campaign.currentAmount / campaign.targetAmount) * 100)) : 0;
  const remaining = Math.max(0, campaign.targetAmount - campaign.currentAmount);
  const days = Math.max(0, Math.ceil((Date.now() - new Date(campaign.createdAt)) / 86400000));
  const canDonate = campaign.status === "approved" && campaign.isActive;

  return (
    <div className="min-h-screen bg-background px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => navigate("/p2p-campaigns")} className="group mb-6 flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to fundraisers
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="space-y-6 lg:col-span-2">
            <div className="relative aspect-video overflow-hidden rounded-2xl shadow-sm">
              <img src={campaign.image} alt={campaign.title} className="h-full w-full object-cover" />
              <div className="absolute left-4 top-4 flex gap-2">
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium capitalize text-white">{campaign.category}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${URGENCY[campaign.urgencyLevel] || URGENCY.medium}`}>
                  {campaign.urgencyLevel} priority
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h1 className="font-heading text-2xl font-bold text-primary md:text-3xl">{campaign.title}</h1>
                <button onClick={share} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
              <div className="mb-5 flex flex-wrap items-center gap-4 text-sm text-text-muted">
                <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" /> by {campaign.userId?.name || "a supporter"}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {new Date(campaign.createdAt).toLocaleDateString()}</span>
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {campaign.donationCount} supporters</span>
              </div>
              <p className="mb-6 leading-relaxed text-gray-700">{campaign.description}</p>

              {[
                ["My Story", campaign.personalStory],
                ["Current Situation", campaign.financialSituation],
                ["Why I Need Your Help", campaign.reasonForFunding],
              ].map(([h, body]) => (
                <div key={h} className="mb-5">
                  <h2 className="mb-2 font-heading text-lg font-semibold text-primary">{h}</h2>
                  <p className="whitespace-pre-line leading-relaxed text-gray-700">{body}</p>
                </div>
              ))}
            </div>

            {recent.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-heading text-lg font-semibold text-primary">Recent donations</h2>
                <div className="space-y-3">
                  {recent.map((d, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg bg-background p-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10"><Heart className="h-4 w-4 text-accent" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-primary">{d.donorName}</p>
                          <span className="font-semibold text-accent">${d.amount}</span>
                        </div>
                        {d.message && <p className="mt-0.5 text-sm text-text-muted">"{d.message}"</p>}
                        <p className="mt-0.5 text-xs text-text-muted">{new Date(d.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-end justify-between">
                  <span className="font-heading text-2xl font-bold text-accent">{money(campaign.currentAmount)}</span>
                  <span className="text-sm text-text-muted">of {money(campaign.targetAmount)}</span>
                </div>
                <div className="mb-2 h-3 overflow-hidden rounded-full bg-gray-200">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
                </div>
                <p className="mb-4 text-sm text-text-muted">{pct}% of goal reached</p>

                <div className="mb-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 text-center text-sm">
                  <div><div className="font-bold text-primary">{campaign.donationCount}</div><div className="text-xs text-text-muted">Donors</div></div>
                  <div><div className="font-bold text-primary">{money(remaining)}</div><div className="text-xs text-text-muted">To go</div></div>
                  <div><div className="font-bold text-primary">{days}</div><div className="text-xs text-text-muted">Days</div></div>
                </div>

                {canDonate ? (
                  <button onClick={() => setShowCheckout(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent/90">
                    <Heart className="h-5 w-5" /> Donate now
                  </button>
                ) : campaign.status === "completed" ? (
                  <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 font-medium text-emerald-700">
                    <CheckCircle className="h-5 w-5" /> Goal reached!
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 font-medium text-gray-500">
                    <AlertTriangle className="h-5 w-5" /> Not accepting donations
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCheckout && (
        <GoFundMeCheckout campaign={campaign} onClose={() => setShowCheckout(false)} onSuccess={onSuccess} />
      )}
    </div>
  );
}
