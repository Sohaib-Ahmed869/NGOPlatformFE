import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Building2, Phone, Mail, Globe, MapPin, Landmark } from "lucide-react";
import { toast } from "react-hot-toast";
import settingsService from "../../services/settings.service";
import PageLoader from "../../components/PageLoader";

const OrganisationSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contactEmail: "",
    contactPhone: "",
    address: "",
    website: "",
    bankName: "",
    bsb: "",
    accountNumber: "",
    accountName: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await settingsService.getSettings();
      const d = res.data;
      setForm({
        contactEmail: d.contactEmail || "",
        contactPhone: d.contactPhone || "",
        address: d.address || "",
        website: d.website || "",
        bankName: d.bankDetails?.bankName || "",
        bsb: d.bankDetails?.bsb || "",
        accountNumber: d.bankDetails?.accountNumber || "",
        accountName: d.bankDetails?.accountName || "",
      });
    } catch (err) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateSettings({
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        address: form.address,
        website: form.website,
        bankDetails: {
          bankName: form.bankName,
          bsb: form.bsb,
          accountNumber: form.accountNumber,
          accountName: form.accountName,
        },
      });
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const up = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const inputCls =
    "w-full px-4 py-3 bg-background border border-accent/15 rounded-xl text-sm text-primary placeholder-primary/30 focus:ring-2 focus:ring-accent/30 focus:border-accent/40 outline-none transition-all";

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-heading font-bold text-primary">Organisation Settings</h1>
            <p className="text-sm text-primary/50 mt-1">Manage your organisation's contact details and bank information</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-primary rounded-xl font-semibold text-sm hover:bg-accent/90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl border border-accent/10 p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-heading font-bold text-primary">Contact Information</h2>
          </div>
          <p className="text-xs text-primary/40 mb-5">This information is displayed on your public portal — footer, contact page, and donation receipts.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-2">
                <Mail className="w-3.5 h-3.5 text-accent" /> Email Address
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => up("contactEmail", e.target.value)}
                className={inputCls}
                placeholder="info@yourcharity.org"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-2">
                <Phone className="w-3.5 h-3.5 text-accent" /> Phone Number
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => up("contactPhone", e.target.value)}
                className={inputCls}
                placeholder="+61 400 000 000"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-2">
                <Globe className="w-3.5 h-3.5 text-accent" /> Website
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => up("website", e.target.value)}
                className={inputCls}
                placeholder="https://www.yourcharity.org"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-2">
                <MapPin className="w-3.5 h-3.5 text-accent" /> Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => up("address", e.target.value)}
                className={inputCls}
                placeholder="123 Charity Lane, Sydney NSW 2000"
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-2xl border border-accent/10 p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Landmark className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-heading font-bold text-primary">Bank Details</h2>
          </div>
          <p className="text-xs text-primary/40 mb-5">These details are shown to donors who choose bank transfer as their payment method.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-primary mb-2 block">Bank Name</label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => up("bankName", e.target.value)}
                className={inputCls}
                placeholder="Commonwealth Bank"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-primary mb-2 block">BSB</label>
              <input
                type="text"
                value={form.bsb}
                onChange={(e) => up("bsb", e.target.value)}
                className={inputCls}
                placeholder="062000"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-primary mb-2 block">Account Number</label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={(e) => up("accountNumber", e.target.value)}
                className={inputCls}
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-primary mb-2 block">Account Name</label>
              <input
                type="text"
                value={form.accountName}
                onChange={(e) => up("accountName", e.target.value)}
                className={inputCls}
                placeholder="Your Charity Foundation"
              />
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 text-xs text-primary/50">
          These settings are used across your portal — in the footer, contact page, checkout bank transfer section, and donation receipts/statements.
        </div>
      </motion.div>
    </div>
  );
};

export default OrganisationSettings;
