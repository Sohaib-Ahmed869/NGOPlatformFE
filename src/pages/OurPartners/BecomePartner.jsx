import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HeartHandshake,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Handshake,
  Sparkles,
  ImagePlus,
  X,
} from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "../Contact/contact-phone.css";
import { toast } from "react-hot-toast";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { useTenant } from "../../context/TenantContext";
import partnersService from "../../services/partners.service";
import { PageHero, reveal } from "../../components/giving";
import { CustomSelect } from "../../components/CustomSelect";
import { PARTNER_TYPES, PARTNERS_HERO_IMG, PARTNERS_FORM_IMG } from "../../config/partners";
import { cn } from "../../utils/cn";

// Underline fields, matching the Contact page (no box, accent on focus).
const baseInput =
  "w-full border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent disabled:opacity-60";

/* Labelled underline field (Contact-page style). */
function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function BecomePartner() {
  const { organisation } = useTenant();
  const orgName = organisation?.name || "us";
  const [params] = useSearchParams();
  const presetType = params.get("type");

  const [form, setForm] = useState({
    name: "",
    organisationName: "",
    email: "",
    phone: "",
    website: "",
    partnershipType: PARTNER_TYPES.some((t) => t.value === presetType) ? presetType : "corporate",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const fileRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickLogo = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2MB");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Please enter your name");
    if (!/\S+@\S+\.\S+/.test(form.email)) return toast.error("Please enter a valid email");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("organisationName", form.organisationName.trim());
      fd.append("email", form.email.trim());
      fd.append("phone", form.phone.trim());
      fd.append("website", form.website.trim());
      fd.append("partnershipType", form.partnershipType);
      fd.append("message", form.message.trim());
      if (logoFile) fd.append("logo", logoFile);
      await partnersService.apply(fd);
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.response?.data?.error || "Couldn't send your enquiry — please try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHero
        image={PARTNERS_HERO_IMG}
        icon={Handshake}
        eyebrow="Partner with us"
        title="Become a partner"
        subtitle={`Tell us a little about you and how you'd like to work with ${orgName}. Our team will be in touch.`}
        maxWidth="max-w-4xl"
      />

      <section className="relative overflow-hidden bg-background px-6 py-16 lg:py-24">
        {/* Soft decorative washes */}
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <Link to="/our-partners" className="group mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to partners
          </Link>

          {sent ? (
            <motion.div {...reveal()} className="mx-auto max-w-2xl overflow-hidden border border-gray-100 bg-white text-center shadow-sm">
              <div className="relative h-40 w-full overflow-hidden">
                <img src={PARTNERS_FORM_IMG} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
              <div className="p-10">
                <span className="mx-auto -mt-[3.75rem] mb-5 grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-emerald-50 text-emerald-600 shadow-sm">
                  <CheckCircle2 className="h-9 w-9" />
                </span>
                <h2 className="font-heading text-2xl font-bold text-primary">Enquiry sent 🎉</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
                  Thank you for reaching out. The {orgName} team has received your enquiry and a confirmation is on its way to
                  your inbox — we'll be in touch within 1–2 business days.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link to="/our-partners" className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
                    Back to partners
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="inline-flex items-center gap-2 border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-accent hover:text-accent"
                  >
                    Send another enquiry
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
              {/* Left — pitch + image + reassurance */}
              <motion.div {...reveal()} className="lg:col-span-2">
                <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                  <HeartHandshake className="h-3.5 w-3.5" /> Let's work together
                </span>
                <h2 className="mt-3 font-heading text-3xl font-bold text-primary">Stronger together</h2>
                <p className="mt-3 text-text-muted">
                  Whether you're a business, community group or individual, there's a way to partner that fits. Share a few
                  details and we'll take it from there.
                </p>

                {/* Image with overlay caption */}
                <div className="group relative mt-7 overflow-hidden shadow-sm">
                  <img
                    src={PARTNERS_FORM_IMG}
                    alt="People partnering together"
                    loading="lazy"
                    className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105 lg:h-[26rem]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute inset-x-5 bottom-5 text-white">
                    <p className="font-heading text-xl font-bold leading-tight">Together, we reach further</p>
                    <p className="mt-1 text-sm text-white/80">Join a growing network of partners making real change.</p>
                  </div>
                </div>
              </motion.div>

              {/* Right — form card */}
              <motion.div {...reveal(0.1)} className="lg:col-span-3">
                <div className="relative overflow-hidden border border-gray-100 bg-white p-6 shadow-lg shadow-black/5 sm:p-8">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent to-accent/40" />
                  <div className="mb-6 flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-heading text-xl font-bold text-primary">Tell us about you</h3>
                      <p className="text-sm text-text-muted">It only takes a minute.</p>
                    </div>
                  </div>

                  <form onSubmit={submit} noValidate className="space-y-5">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                      <Field label="Your name" required>
                        <input value={form.name} disabled={busy} onChange={(e) => set("name", e.target.value)} placeholder="Full name" className={baseInput} />
                      </Field>
                      <Field label="Organisation">
                        <input value={form.organisationName} disabled={busy} onChange={(e) => set("organisationName", e.target.value)} placeholder="Company / group" className={baseInput} />
                      </Field>
                      <Field label="Email" required>
                        <input type="email" value={form.email} disabled={busy} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" className={baseInput} />
                      </Field>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                        <div className="contact-phone">
                          <PhoneInput
                            country="au"
                            value={(form.phone || "").replace(/^\+/, "")}
                            onChange={(val) => set("phone", val ? `+${val}` : "")}
                            enableSearch
                            countryCodeEditable={false}
                            disabled={busy}
                            inputProps={{ name: "phone" }}
                          />
                        </div>
                      </div>
                    </div>

                    <Field label="Website">
                      <input type="url" value={form.website} disabled={busy} onChange={(e) => set("website", e.target.value)} placeholder="https:// (optional)" className={baseInput} />
                    </Field>

                    {/* Brand logo upload */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Brand logo</label>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => pickLogo(e.target.files?.[0])}
                      />
                      {logoPreview ? (
                        <div className="flex items-center gap-3 border border-gray-200 p-3">
                          <img src={logoPreview} alt="Logo preview" className="h-16 w-16 shrink-0 bg-gray-50 object-contain" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-primary">{logoFile?.name}</p>
                            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="text-xs font-medium text-accent hover:underline">
                              Replace
                            </button>
                          </div>
                          <button type="button" onClick={removeLogo} disabled={busy} aria-label="Remove logo" className="grid h-8 w-8 shrink-0 place-items-center text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={busy}
                          className="flex w-full items-center gap-3 border border-dashed border-gray-300 px-4 py-3.5 text-left transition-colors hover:border-accent hover:bg-accent/5"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center bg-accent/10 text-accent">
                            <ImagePlus className="h-5 w-5" />
                          </span>
                          <span className="text-sm">
                            <span className="block font-medium text-primary">Upload your logo</span>
                            <span className="block text-xs text-text-muted">PNG, JPG, SVG or WebP · up to 2MB · optional</span>
                          </span>
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Partnership type</label>
                      <CustomSelect
                        value={form.partnershipType}
                        onChange={(v) => set("partnershipType", v)}
                        options={PARTNER_TYPES}
                        disabled={busy}
                        variant="line"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">How would you like to work together?</label>
                      <textarea rows={5} value={form.message} disabled={busy} onChange={(e) => set("message", e.target.value)} placeholder="Tell us about your organisation and how you'd like to partner…" className={cn(baseInput, "resize-none")} />
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 bg-accent py-3.5 font-semibold text-white shadow-lg shadow-accent/25 transition-colors hover:bg-accent-light disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <HeartHandshake className="h-5 w-5" />}
                      Send enquiry
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      <NewsletterSection />
    </motion.div>
  );
}
