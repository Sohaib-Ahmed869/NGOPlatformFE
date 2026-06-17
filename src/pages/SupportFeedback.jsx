import { useState } from "react";
import { useParams } from "react-router-dom";
import { Star, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import supportService from "../services/support.service";
import { useTenant } from "../context/TenantContext";

export default function SupportFeedback() {
  const { id } = useParams();
  const { branding, organisation } = useTenant();
  const accent = branding?.accentColor || "#C9A84C";
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!rating) return toast.error("Please pick a rating");
    setBusy(true);
    try {
      await supportService.publicSatisfaction(id, { rating, feedback });
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: branding?.backgroundColor || "#FAF7F2" }}>
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        {done ? (
          <>
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12" style={{ color: accent }} />
            <h2 className="text-lg font-semibold text-gray-900">Thank you for your feedback!</h2>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">How did we do?</h1>
            <p className="mt-1 text-sm text-gray-500">Rate your support experience with {organisation?.name || "us"}.</p>
            <div className="my-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
                  <Star className="h-9 w-9 transition-colors" style={{ color: (hover || rating) >= n ? accent : "#e5e7eb", fill: (hover || rating) >= n ? accent : "none" }} />
                </button>
              ))}
            </div>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder="Anything you'd like to add? (optional)" className="mb-4 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" />
            <button onClick={submit} disabled={busy} className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50" style={{ backgroundColor: accent }}>
              {busy ? "Submitting…" : "Submit feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
