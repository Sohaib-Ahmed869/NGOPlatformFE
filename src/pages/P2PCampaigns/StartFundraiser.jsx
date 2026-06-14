import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ImagePlus, Loader2, X, CheckCircle, Clock, Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import GoFundMeService from "../../services/goFundMeService";
import { useAuth } from "../../context/AuthContext";

const URGENCIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];
const inputCls = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent";
const labelCls = "mb-1 block text-sm font-medium text-primary";

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  completed: "bg-blue-50 text-blue-700",
  deactivated: "bg-gray-100 text-gray-600",
};

export default function StartFundraiser() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "", description: "", personalStory: "", financialSituation: "", reasonForFunding: "",
    targetAmount: "", category: "", customCategory: "", urgencyLevel: "medium",
  });
  const [categories, setCategories] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    GoFundMeService.getCategories().then((r) => setCategories(r.categories?.predefined || [])).catch(() => {});
    refreshMine();
  }, []);

  const refreshMine = () => {
    GoFundMeService.getMyRequests().then((r) => setMine(r.goFundMes || [])).catch(() => {});
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pickImage = (file) => {
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in to start a fundraiser"); return navigate("/login"); }
    const required = ["title", "description", "personalStory", "financialSituation", "reasonForFunding", "targetAmount", "category"];
    for (const k of required) if (!String(form[k]).trim()) return toast.error("Please complete all fields");
    if (form.category === "other" && !form.customCategory.trim()) return toast.error("Please name your category");
    if (Number(form.targetAmount) < 100) return toast.error("Minimum goal is $100");
    if (!image) return toast.error("Please add a cover image");

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("image", image);

    setSubmitting(true);
    try {
      await GoFundMeService.createGoFundMe(fd);
      setSubmitted(true);
      toast.success("Submitted for review!");
      refreshMine();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <Link to="/p2p-campaigns" className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to fundraisers
        </Link>

        {submitted ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-50"><CheckCircle className="h-7 w-7 text-emerald-600" /></div>
            <h1 className="font-heading text-2xl font-bold text-primary">Submitted for review</h1>
            <p className="mt-2 text-text-muted">Our team will review your fundraiser shortly. You'll get an email once it's approved and live.</p>
            <button onClick={() => { setSubmitted(false); setForm({ title: "", description: "", personalStory: "", financialSituation: "", reasonForFunding: "", targetAmount: "", category: "", customCategory: "", urgencyLevel: "medium" }); setImage(null); setPreview(null); }} className="mt-6 rounded-xl border border-gray-200 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
              Start another
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-heading text-3xl font-bold text-primary">Start a fundraiser</h1>
            <p className="mt-1 text-text-muted">Tell your story. Once approved by our team, it goes live for donations.</p>

            <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div>
                <label className={labelCls}>Cover image *</label>
                {preview ? (
                  <div className="relative h-48 w-full overflow-hidden rounded-xl">
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => { setImage(null); setPreview(null); }} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-red-500"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-accent hover:text-accent">
                    <ImagePlus className="mb-2 h-7 w-7" />
                    <span className="text-sm">Click to upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files[0])} />
                  </label>
                )}
              </div>

              <div>
                <label className={labelCls}>Title *</label>
                <input className={inputCls} value={form.title} maxLength={100} onChange={(e) => set("title", e.target.value)} placeholder="A clear, compelling title" />
              </div>
              <div>
                <label className={labelCls}>Short description *</label>
                <textarea className={`${inputCls} resize-none`} rows={2} maxLength={2000} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="A sentence or two that summarises your fundraiser" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Goal amount ($) *</label>
                  <input type="number" min="100" className={inputCls} value={form.targetAmount} onChange={(e) => set("targetAmount", e.target.value)} placeholder="1000" />
                </div>
                <div>
                  <label className={labelCls}>Urgency</label>
                  <select className={inputCls} value={form.urgencyLevel} onChange={(e) => set("urgencyLevel", e.target.value)}>
                    {URGENCIES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Category *</label>
                  <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
                    <option value="">Select a category</option>
                    {categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                {form.category === "other" && (
                  <div>
                    <label className={labelCls}>Custom category *</label>
                    <input className={inputCls} value={form.customCategory} onChange={(e) => set("customCategory", e.target.value)} placeholder="Name your category" />
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Your story *</label>
                <textarea className={`${inputCls} resize-none`} rows={4} maxLength={3000} value={form.personalStory} onChange={(e) => set("personalStory", e.target.value)} placeholder="Who are you and what's happening?" />
              </div>
              <div>
                <label className={labelCls}>Current situation *</label>
                <textarea className={`${inputCls} resize-none`} rows={3} maxLength={1500} value={form.financialSituation} onChange={(e) => set("financialSituation", e.target.value)} placeholder="Describe the financial situation" />
              </div>
              <div>
                <label className={labelCls}>Why you need help *</label>
                <textarea className={`${inputCls} resize-none`} rows={3} maxLength={1500} value={form.reasonForFunding} onChange={(e) => set("reasonForFunding", e.target.value)} placeholder="How will the funds be used?" />
              </div>

              <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50">
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Submit for review
              </button>
            </form>
          </>
        )}

        {/* My fundraisers */}
        {mine.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 font-heading text-lg font-bold text-primary">Your fundraisers</h2>
            <div className="space-y-2">
              {mine.map((c) => (
                <div key={c._id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  <img src={c.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary">{c.title}</p>
                    <p className="text-xs text-text-muted">${(c.currentAmount || 0).toLocaleString()} of ${c.targetAmount.toLocaleString()}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_BADGE[c.status]}`}>
                    {c.status === "pending" ? <Clock className="mr-1 inline h-3 w-3" /> : null}{c.status}
                  </span>
                  {c.status === "approved" && (
                    <Link to={`/p2p-campaigns/${c.slug}`} className="grid h-8 w-8 shrink-0 place-items-center text-gray-400 hover:text-accent"><Eye className="h-4 w-4" /></Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
