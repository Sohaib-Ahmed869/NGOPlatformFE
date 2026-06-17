import { Check } from "lucide-react";
import { STEPS, accentGlow } from "../constants";

export default function Stepper({ activeStep }) {
  return (
    <div className="mb-8 flex items-center">
      {STEPS.map((s, i) => {
        const done = s.n < activeStep;
        const active = s.n === activeStep;
        const lit = done || active;
        return (
          <div key={s.n} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : "flex-none"}`}>
            <div className="flex items-center gap-2.5">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center text-sm font-bold transition-all duration-300 ${
                  lit
                    ? `bg-gradient-to-br from-accent to-accent-light text-white ${accentGlow}`
                    : "bg-gray-200 text-text-muted"
                } ${active ? "scale-110" : ""}`}
              >
                {done ? <Check className="h-4 w-4" /> : s.n}
              </span>
              <span className={`hidden text-sm font-semibold sm:block ${lit ? "text-primary" : "text-text-muted"}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-3 h-0.5 flex-1 overflow-hidden bg-gray-200">
                <div className={`h-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500 ${done ? "w-full" : "w-0"}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
