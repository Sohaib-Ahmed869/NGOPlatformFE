import { Loader2, ShieldCheck } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "../../../Contact/contact-phone.css";
import CustomSelect from "../../../../components/CustomSelect";
import { fieldLabel, underlineInput, STATE_OPTIONS } from "../constants";
import { useCheckout } from "../CheckoutContext";
import SectionHead from "../components/SectionHead";

const SavedTag = ({ show }) =>
  show ? <span className="ml-2 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Saved</span> : null;

export default function DonorDetailsStep() {
  const {
    user, formData, setFormData, errors, savedDataIndicator, isUpdatingProfile,
    handleInputChange, handleUpdateProfile,
  } = useCheckout();

  const emailLocked = !!(user && user.email);

  return (
    <>
      <SectionHead icon={ShieldCheck} title="Your details" desc="We'll send your receipt here and keep your info private." />

      <div className="space-y-7">
        <div className="grid gap-x-6 gap-y-7 sm:grid-cols-3">
          <div>
            <label htmlFor="name" className={fieldLabel}>Name <span className="text-red-500">*</span><SavedTag show={savedDataIndicator.name} /></label>
            <input id="name" type="text" name="name" value={formData.name} onChange={handleInputChange} className={underlineInput(!!errors.name)} placeholder="Your full name" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="phone" className={fieldLabel}>Phone <span className="text-red-500">*</span><SavedTag show={savedDataIndicator.phone} /></label>
            <div className={`contact-phone ${errors.phone ? "contact-phone-error" : ""}`}>
              <PhoneInput
                country="au"
                value={(formData.phone || "").replace(/^\+/, "")}
                onChange={(val) => handleInputChange({ target: { name: "phone", value: val ? `+${val}` : "", type: "tel" } })}
                enableSearch
                countryCodeEditable={false}
                inputProps={{ id: "phone", name: "phone" }}
              />
            </div>
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>
          <div>
            <label htmlFor="email" className={fieldLabel}>Email <span className="text-red-500">*</span><SavedTag show={savedDataIndicator.email} /></label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              readOnly={emailLocked}
              placeholder="you@example.com"
              className={`${underlineInput(!!errors.email)} ${emailLocked ? "cursor-not-allowed text-text-muted" : ""}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="streetAddress" className={fieldLabel}>Street address</label>
          <input id="streetAddress" type="text" name="streetAddress" value={formData.streetAddress} onChange={handleInputChange} className={underlineInput(false)} placeholder="Street and house number" />
        </div>

        <div className="grid gap-x-6 gap-y-7 sm:grid-cols-3">
          <div>
            <label htmlFor="townCity" className={fieldLabel}>Suburb</label>
            <input id="townCity" type="text" name="townCity" value={formData.townCity} onChange={handleInputChange} className={underlineInput(false)} placeholder="Suburb" />
          </div>
          <div>
            <label className={fieldLabel}>State</label>
            <CustomSelect
              className="w-full"
              variant="line"
              placeholder="Select state"
              value={formData.state}
              onChange={(v) => setFormData((p) => ({ ...p, state: v }))}
              options={STATE_OPTIONS}
            />
          </div>
          <div>
            <label htmlFor="postcode" className={fieldLabel}>Postcode</label>
            <input id="postcode" type="text" name="postcode" value={formData.postcode} onChange={handleInputChange} className={underlineInput(false)} placeholder="0000" />
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-6">
          <label className="flex items-start gap-2.5 text-sm text-gray-700">
            <input type="checkbox" name="rememberDetails" checked={formData.rememberDetails} onChange={(e) => { handleInputChange(e); if (e.target.checked && user) handleUpdateProfile(); }} disabled={isUpdatingProfile} className="mt-0.5 h-4 w-4 accent-accent" />
            <span>{user ? "Update my saved details with this information" : "Save my details for future donations"}</span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-gray-700">
            <input type="checkbox" name="agreeToMessages" checked={formData.agreeToMessages} onChange={handleInputChange} className="mt-0.5 h-4 w-4 accent-accent" />
            <span>I agree to receive Email, WhatsApp/SMS messages. SMS data rates may apply. Reply STOP to cancel.</span>
          </label>
          {isUpdatingProfile && <p className="flex items-center gap-2 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Updating profile…</p>}
        </div>
      </div>
    </>
  );
}
