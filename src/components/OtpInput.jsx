import { useRef } from "react";

/**
 * Segmented one-time-code input — N individual boxes with auto-advance, paste
 * support, backspace + arrow navigation. Controlled via `value` (a string) and
 * `onChange`. Calls `onComplete(code)` when all boxes are filled.
 *
 * Colours come from the `--tenant-accent` token (works in both the tenant admin
 * and the platform console).
 */
export default function OtpInput({ value = "", onChange, length = 6, disabled, autoFocus, onComplete, accent }) {
  const refs = useRef([]);

  const emit = (next) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length && onComplete) onComplete(clean);
    return clean;
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const cur = value.split("");
    for (let k = 0; k < raw.length && i + k < length; k++) cur[i + k] = raw[k];
    emit(cur.join(""));
    const focusIdx = Math.min(i + raw.length, length - 1);
    refs.current[focusIdx]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const cur = value.split("");
      if (cur[i]) {
        cur[i] = "";
        onChange(cur.join(""));
      } else if (i > 0) {
        cur[i - 1] = "";
        onChange(cur.join(""));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    const clean = emit(text);
    refs.current[Math.min(clean.length, length - 1)]?.focus();
  };

  return (
    // `accent` (a hex) sets the token locally so the focus styling themes
    // correctly even outside the console layout (e.g. the login page).
    <div className="flex gap-2 sm:gap-2.5" onPaste={handlePaste} style={accent ? { "--tenant-accent": accent } : undefined}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${i + 1}`}
          className="h-12 w-10 rounded-xl border border-gray-200 bg-white text-center text-lg font-bold text-gray-900 shadow-sm outline-none transition-all focus:-translate-y-0.5 focus:border-accent focus:shadow-md focus:ring-2 focus:ring-accent/30 disabled:opacity-50 sm:h-14 sm:w-12 sm:text-xl dark:border-white/15 dark:bg-white/5 dark:text-white"
        />
      ))}
    </div>
  );
}
