import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import axiosInstance from "../services/axios";
import { useTenant } from "../context/TenantContext";

// Public landing page for the one-click unsubscribe link in campaign emails.
// Reads ?token=… and flips the subscriber to "unsubscribed" via the API.
export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { organisation } = useTenant();
  const [state, setState] = useState("loading"); // loading | done | error
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    axiosInstance
      .post("/newsletter/unsubscribe", { token })
      .then((res) => {
        setEmail(res.data?.email || "");
        setState("done");
      })
      .catch(() => setState("error"));
  }, [token]);

  const orgName = organisation?.name || "this organisation";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md border border-gray-100 bg-white p-8 text-center shadow-sm">
        {state === "loading" ? (
          <>
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-text-muted">Updating your preferences…</p>
          </>
        ) : state === "done" ? (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h1 className="text-xl font-bold text-primary">You've been unsubscribed</h1>
            <p className="mt-2 text-sm text-text-muted">
              {email ? <span className="font-medium text-primary">{email}</span> : "You"} will no longer receive newsletter
              emails from {orgName}.
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold text-primary">Link not valid</h1>
            <p className="mt-2 text-sm text-text-muted">
              This unsubscribe link is invalid or has already been used. If you keep receiving emails, contact {orgName}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
