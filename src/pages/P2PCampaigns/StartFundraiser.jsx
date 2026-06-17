import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  X,
  CheckCircle,
  Clock,
  Eye,
  Megaphone,
  Plus,
  Sparkles,
  PenLine,
  Image as ImageIcon,
  Target as TargetIcon,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import GoFundMeService from "../../services/goFundMeService";
import { useAuth } from "../../context/AuthContext";
import { PageHero, reveal } from "../../components/giving";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../utils/cn";

const HERO_IMG = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80";

const URGENCIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

// Underline fields, matching the Contact page (no box, accent on focus).
const baseInput =
  "w-full rounded-token-input border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent disabled:opacity-60";
const labelCls = "mb-1 block text-sm font-medium text-gray-700";

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  completed: "bg-blue-50 text-blue-700",
  deactivated: "bg-gray-100 text-gray-600",
};

const TIPS = [
  { icon: PenLine, title: "Tell a clear, honest story", text: "Who it's for, what happened, and what the funds will do." },
  { icon: ImageIcon, title: "Add a bright, relevant photo", text: "A real, well-lit landscape image builds instant trust." },
  { icon: TargetIcon, title: "Set a realistic goal", text: "Break down what the money covers so donors know their impact." },
  { icon: Share2, title: "Share it widely once live", text: "Most donations come from people you reach out to directly." },
];

const EMPTY = {
  title: "", description: "", personalStory: "", financialSituation: "", reasonForFunding: "",
  targetAmount: "", category: "", customCategory: "", urgencyLevel: "medium",
};

export default function StartFundraiser() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
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
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
  };

  const resetForm = () => {
    setSubmitted(false);
    setForm(EMPTY);
    removeImage();
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = categories.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="bg-background">
      <PageHero
        image={HERO_IMG}
        icon={Megaphone}
        eyebrow="Rally your community"
        title="Start a fundraiser"
        subtitle="Tell your story and set a goal. Once our team approves it, your page goes live to collect donations."
        maxWidth="max-w-4xl"
      />

      <section className="px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <Link to="/p2p-campaigns" className="group mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to fundraisers
          </Link>

          {submitted ? (
            <motion.div {...reveal()} className="mx-auto max-w-2xl rounded-token border border-gray-100 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-50"><CheckCircle className="h-9 w-9 text-emerald-600" /></div>
              <h2 className="font-heading text-2xl font-bold text-primary">Submitted for review 🎉</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
                Thank you! Our team will review your fundraiser shortly — you'll get an email the moment it's approved and live for donations.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/p2p-campaigns" className="inline-flex items-center gap-2 rounded-token-btn bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
                  Browse fundraisers
                </Link>
                <button onClick={resetForm} className="inline-flex items-center gap-2 rounded-token-btn border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-accent/50 hover:text-accent">
                  <Plus className="h-4 w-4" /> Start another
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
              {/* Form */}
              <motion.div {...reveal()} className="lg:col-span-3">
                <form onSubmit={submit} className="relative overflow-hidden rounded-token border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent to-accent/40" />

                  {/* Cover */}
                  <div className="mb-6">
                    <label className={labelCls}>Cover image <span className="text-red-500">*</span></label>
                    <input id="cover" type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
                    {preview ? (
                      <div className="relative h-56 w-full overflow-hidden border border-gray-200">
                        <img src={preview} alt="Cover preview" className="h-full w-full object-cover" />
                        <div className="absolute right-2 top-2 flex gap-1.5">
                          <label htmlFor="cover" className="grid h-8 w-8 cursor-pointer place-items-center bg-white/90 text-primary shadow-sm transition-colors hover:text-accent" title="Replace">
                            <ImagePlus className="h-4 w-4" />
                          </label>
                          <button type="button" onClick={removeImage} className="grid h-8 w-8 place-items-center bg-white/90 text-red-500 shadow-sm transition-colors hover:bg-red-50" title="Remove">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="cover" className="flex h-56 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-accent hover:bg-accent/5 hover:text-accent">
                        <ImagePlus className="mb-2 h-7 w-7" />
                        <span className="text-sm font-medium">Click to upload a cover photo</span>
                        <span className="mt-0.5 text-xs">JPG, PNG or WebP · landscape · up to 5MB</span>
                      </label>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className={labelCls}>Title <span className="text-red-500">*</span></label>
                      <input className={baseInput} value={form.title} maxLength={100} onChange={(e) => set("title", e.target.value)} placeholder="A clear, compelling title" />
                    </div>
                    <div>
                      <label className={labelCls}>Short description <span className="text-red-500">*</span></label>
                      <textarea className={cn(baseInput, "resize-none")} rows={2} maxLength={2000} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="A sentence or two that summarises your fundraiser" />
                    </div>

                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>Goal amount ($) <span className="text-red-500">*</span></label>
                        <input type="number" min="100" className={baseInput} value={form.targetAmount} onChange={(e) => set("targetAmount", e.target.value)} placeholder="1000" />
                      </div>
                      <div>
                        <label className={labelCls}>Urgency</label>
                        <CustomSelect value={form.urgencyLevel} onChange={(v) => set("urgencyLevel", v)} options={URGENCIES} variant="line" className="w-full" />
                      </div>
                      <div>
                        <label className={labelCls}>Category <span className="text-red-500">*</span></label>
                        <CustomSelect value={form.category} onChange={(v) => set("category", v)} options={categoryOptions} placeholder="Select a category" variant="line" className="w-full" />
                      </div>
                      {form.category === "other" && (
                        <div>
                          <label className={labelCls}>Custom category <span className="text-red-500">*</span></label>
                          <input className={baseInput} value={form.customCategory} onChange={(e) => set("customCategory", e.target.value)} placeholder="Name your category" />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={labelCls}>Your story <span className="text-red-500">*</span></label>
                      <textarea className={cn(baseInput, "resize-none")} rows={4} maxLength={3000} value={form.personalStory} onChange={(e) => set("personalStory", e.target.value)} placeholder="Who are you and what's happening?" />
                    </div>
                    <div>
                      <label className={labelCls}>Current situation <span className="text-red-500">*</span></label>
                      <textarea className={cn(baseInput, "resize-none")} rows={3} maxLength={1500} value={form.financialSituation} onChange={(e) => set("financialSituation", e.target.value)} placeholder="Describe the financial situation" />
                    </div>
                    <div>
                      <label className={labelCls}>Why you need help <span className="text-red-500">*</span></label>
                      <textarea className={cn(baseInput, "resize-none")} rows={3} maxLength={1500} value={form.reasonForFunding} onChange={(e) => set("reasonForFunding", e.target.value)} placeholder="How will the funds be used?" />
                    </div>

                    <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-token-btn bg-accent py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-accent-light disabled:opacity-50">
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Megaphone className="h-5 w-5" />} Submit for review
                    </button>
                    <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-text-muted">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Reviewed by our team before it goes live.
                    </p>
                  </div>
                </form>
              </motion.div>

              {/* Sidebar */}
              <motion.div {...reveal(0.1)} className="lg:col-span-2">
                <div className="lg:sticky lg:top-24 space-y-6">
                  {/* Tips */}
                  <div className="rounded-token border border-gray-100 bg-white p-6 shadow-sm">
                    <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                      <Sparkles className="h-3.5 w-3.5" /> Tips for success
                    </span>
                    <h3 className="mt-3 font-heading text-lg font-bold text-primary">Make it count</h3>
                    <div className="mt-4 space-y-4">
                      {TIPS.map((t) => (
                        <div key={t.title} className="flex items-start gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
                            <t.icon className="h-[18px] w-[18px]" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-primary">{t.title}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{t.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Your fundraisers */}
                  {mine.length > 0 && (
                    <div className="rounded-token border border-gray-100 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 font-heading text-lg font-bold text-primary">Your fundraisers</h3>
                      <div className="space-y-2.5">
                        {mine.map((c) => (
                          <div key={c._id} className="flex items-center gap-3 rounded-token border border-gray-100 p-2.5">
                            <img src={c.image} alt="" className="h-11 w-11 shrink-0 border border-gray-100 object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-primary">{c.title}</p>
                              <p className="text-xs text-text-muted">${(c.currentAmount || 0).toLocaleString()} of ${Number(c.targetAmount).toLocaleString()}</p>
                            </div>
                            <span className={cn("inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-[10px] font-semibold capitalize", STATUS_BADGE[c.status])}>
                              {c.status === "pending" && <Clock className="h-3 w-3" />}
                              {c.status}
                            </span>
                            {c.status === "approved" && (
                              <Link to={`/p2p-campaigns/${c.slug}`} state={{ campaign: c }} className="grid h-8 w-8 shrink-0 place-items-center text-gray-400 transition-colors hover:text-accent" title="View">
                                <Eye className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
