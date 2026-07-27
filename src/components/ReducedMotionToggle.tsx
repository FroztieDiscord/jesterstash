import { useEffect, useState } from "react";
import { Zap, ZapOff } from "lucide-react";

const KEY = "js-reduce-motion";

export function applyReducedMotionFromStorage() {
  if (typeof document === "undefined") return;
  const stored = localStorage.getItem(KEY);
  const prefers = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const on = stored === "true" || (stored === null && prefers);
  document.documentElement.dataset.reduceMotion = on ? "true" : "false";
}

export function ReducedMotionToggle() {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.dataset.reduceMotion === "true";
  });

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = on ? "true" : "false";
    localStorage.setItem(KEY, String(on));
  }, [on]);

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      aria-label={on ? "Enable motion" : "Reduce motion"}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-primary/20 bg-card/40 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
    >
      <span className="flex items-center gap-2">
        {on ? <ZapOff className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
        Motion
      </span>
      <span
        className={
          "inline-flex h-4 w-8 items-center rounded-full border transition-colors " +
          (on ? "border-muted-foreground/40 bg-muted-foreground/20" : "border-success/50 bg-success/20")
        }
      >
        <span
          className={
            "h-3 w-3 rounded-full transition-transform " +
            (on ? "translate-x-0.5 bg-muted-foreground" : "translate-x-4 bg-success shadow-[0_0_8px_oklch(0.82_0.22_145_/_0.9)]")
          }
        />
      </span>
    </button>
  );
}