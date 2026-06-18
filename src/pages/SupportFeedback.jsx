import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Star, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import supportService from "../services/support.service";
import { useTenant } from "../context/TenantContext";

export default function SupportFeedback() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { branding, organisation } = useTenant();
  const accent = branding?.accentColor || "#C9A84C";

  // phase: "loading" | "ready" | "invalid" | "rated" | "done"
  const [phase, setPhase] = useState("loading");
  const [info, setInfo] = useState(null); // { ticketNumber, summary }
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  // Validate the link up front so we can show context (and catch invalid/expired
  // or already-rated links before the person fills anything in).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await supportService.getPublicSatisfaction(id, token);
        if (!alive) return;
        setInfo({ ticketNumber: res.data.ticketNumber, summary: res.data.summary });
        setPhase(res.data.alreadyRated ? "rated" : "ready");
      } catch {
        if (alive) setPhase("invalid");
      }
    })();
    return () => { alive = false; };
  }, [id, token]);

  const submit = async () => {
    if (!rating) return toast.error("Please pick a rating");
    setBusy(true);
    try {
      const res = await supportService.publicSatisfaction(id, { rating, feedback, token });
      setPhase(res?.data?.alreadyRated ? "rated" : "done");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  const Shell = ({ children }) => (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: branding?.backgroundColor || "#FAF7F2" }}>
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">{children}</div>
    </div>
  );

  if (phase === "loading") {
    return <Shell><Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-300" /></Shell>;
  }

  if (phase === "invalid") {
    return (
      <Shell>
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-900">This feedback link is invalid or has expired</h2>
        <p className="mt-1 text-sm text-gray-500">If you'd still like to share feedback, please reply to your support email.</p>
      </Shell>
    );
  }

  if (phase === "done" || phase === "rated") {
    return (
      <Shell>
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12" style={{ color: accent }} />
        <h2 className="text-lg font-semibold text-gray-900">{phase === "rated" ? "You've already rated this" : "Thank you for your feedback!"}</h2>
        <p className="mt-1 text-sm text-gray-500">{phase === "rated" ? "Thanks — your rating was already recorded." : `We appreciate you helping ${organisation?.name || "us"} improve.`}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-bold text-gray-900">How did we do?</h1>
      <p className="mt-1 text-sm text-gray-500">Rate your support experience with {organisation?.name || "us"}.</p>
      {info?.summary ? (
        <p className="mx-auto mt-3 max-w-xs rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <span className="font-mono text-gray-400">#{info.ticketNumber}</span> · {info.summary}
        </p>
      ) : null}
      <div className="my-6 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
            <Star className="h-9 w-9 transition-colors" style={{ color: (hover || rating) >= n ? accent : "#e5e7eb", fill: (hover || rating) >= n ? accent : "none" }} />
          </button>
        ))}
      </div>
      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder="Anything you'd like to add? (optional)" className="mb-4 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" />
      <button onClick={submit} disabled={busy} className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50" style={{ backgroundColor: accent }}>
        {busy ? "Submitting…" : "Submit feedback"}
      </button>
    </Shell>
  );
}
