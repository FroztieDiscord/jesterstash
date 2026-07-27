import { type ReactNode } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  channel?: string;
  status?: "armed" | "decrypting" | "sealed";
  children: ReactNode;
  className?: string;
};

/**
 * VaultDialog — blacksite/vault-styled DialogContent wrapper.
 * Adds glitch-open transition, encrypted status lines, and tactical corners.
 */
export function VaultDialog({ title, channel = "vault_03", status = "armed", children, className }: Props) {
  const hash = Math.random().toString(16).slice(2, 10);
  return (
    <DialogContent
      className={cn(
        "vault-open corners max-w-md gap-0 overflow-hidden rounded-md border border-primary/40 bg-background/95 p-0 font-mono shadow-[0_0_0_1px_oklch(0.86_0.18_96_/_0.2),0_40px_80px_-30px_oklch(0_0_0_/_0.9)] backdrop-blur-xl",
        className,
      )}
    >
      {/* Status header strip */}
      <div className="flex items-center justify-between border-b border-primary/25 bg-primary/[0.04] px-4 py-2 text-[9px] uppercase tracking-[0.3em] text-primary/80">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-2.5 w-2.5" />
          <span>{channel}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_currentColor]" />
          {status}
        </span>
      </div>

      <DialogHeader className="space-y-1 border-b border-primary/15 px-5 py-4">
        <DialogTitle className="animate-decrypt font-mono text-lg uppercase tracking-[0.2em] text-primary">
          &gt; {title}
        </DialogTitle>
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground/60">
          handshake · 0x{hash} · aes-256-gcm
        </p>
      </DialogHeader>

      <div className="animate-fade-up px-5 py-4">{children}</div>

      {/* Status footer */}
      <div className="flex items-center justify-between border-t border-primary/15 bg-background/60 px-4 py-2 text-[9px] uppercase tracking-[0.3em] text-muted-foreground/60">
        <span className="inline-flex items-center gap-1.5 text-success/80">
          <ShieldCheck className="h-2.5 w-2.5" /> integrity_ok
        </span>
        <span className="terminal-caret">awaiting_input</span>
      </div>
    </DialogContent>
  );
}