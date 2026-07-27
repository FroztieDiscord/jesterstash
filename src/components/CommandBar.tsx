import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Terminal as TerminalIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Cmd = {
  name: string;
  desc: string;
  run: (ctx: Ctx) => void | Promise<void>;
  admin?: boolean;
};

type Ctx = {
  navigate: ReturnType<typeof useNavigate>;
  close: () => void;
  print: (line: string) => void;
  signOut: () => Promise<void>;
  isAdmin: boolean;
};

const COMMANDS: Cmd[] = [
  { name: "help", desc: "list all available commands", run: (c) => c.print("__HELP__") },
  { name: "dashboard", desc: "jump to dashboard", run: (c) => { c.navigate({ to: "/dashboard" }); c.close(); } },
  { name: "sale", desc: "record a new sale", run: (c) => { c.navigate({ to: "/sale" }); c.close(); } },
  { name: "sales", desc: "open sales history", run: (c) => { c.navigate({ to: "/sales" }); c.close(); } },
  { name: "inventory", desc: "open the vault inventory", admin: true, run: (c) => { c.navigate({ to: "/inventory" }); c.close(); } },
  { name: "audit", desc: "open the audit log", admin: true, run: (c) => { c.navigate({ to: "/admin/audit" }); c.close(); } },
  { name: "team", desc: "open team applications", admin: true, run: (c) => { c.navigate({ to: "/admin/applications" }); c.close(); } },
  { name: "clear", desc: "clear the terminal output", run: (c) => c.print("__CLEAR__") },
  { name: "whoami", desc: "print current session identity", run: (c) => c.print("__WHOAMI__") },
  { name: "disconnect", desc: "sign out of the vault", run: async (c) => { await c.signOut(); c.close(); } },
  { name: "exit", desc: "close the command bar", run: (c) => c.close() },
];

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<{ kind: "in" | "out" | "err"; text: string }[]>([
    { kind: "out", text: "jester_stash terminal · type `help` for commands · esc to close" },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useCurrentUser();

  const available = useMemo(() => COMMANDS.filter((c) => !c.admin || isAdmin), [isAdmin]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && !inField && !open) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function print(line: string) {
    if (line === "__CLEAR__") { setLog([]); return; }
    if (line === "__WHOAMI__") {
      setLog((l) => [
        ...l,
        { kind: "out", text: `user: ${user?.email ?? "anonymous"}` },
        { kind: "out", text: `role: ${isAdmin ? "root" : "operator"}` },
        { kind: "out", text: `node: node_01 · aes-256-gcm` },
      ]);
      return;
    }
    if (line === "__HELP__") {
      setLog((l) => [
        ...l,
        { kind: "out", text: "available commands:" },
        ...available.map((c) => ({ kind: "out" as const, text: `  ${c.name.padEnd(14, " ")} ${c.desc}` })),
        { kind: "out", text: "shortcuts: ⌘K / ctrl+k to toggle · / to open · esc to close" },
      ]);
      return;
    }
    setLog((l) => [...l, { kind: "out", text: line }]);
  }

  async function submit() {
    const raw = input.trim();
    if (!raw) return;
    setInput("");
    setLog((l) => [...l, { kind: "in", text: `$ ${raw}` }]);
    const cmd = available.find((c) => c.name === raw.toLowerCase());
    if (!cmd) {
      setLog((l) => [...l, { kind: "err", text: `command not found: ${raw} — try \`help\`` }]);
      return;
    }
    await cmd.run({ navigate, close: () => setOpen(false), print, signOut, isAdmin });
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command terminal"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-md border border-primary/40 bg-background/85 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-primary shadow-[0_10px_30px_-10px_oklch(0_0_0_/_0.8)] backdrop-blur-xl transition hover:border-primary hover:bg-primary/10 sm:bottom-6 sm:right-6"
      >
        <TerminalIcon className="h-3 w-3" />
        <span className="hidden sm:inline">./cmd</span>
        <kbd className="hidden rounded border border-primary/30 bg-background/60 px-1.5 py-0.5 text-[9px] tracking-widest text-primary/70 sm:inline">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-3 backdrop-blur-md sm:items-center sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="vault-open corners w-full max-w-xl overflow-hidden rounded-md border border-primary/40 bg-background/95 font-mono shadow-[0_0_0_1px_oklch(0.86_0.18_96_/_0.2),0_40px_80px_-30px_oklch(0_0_0_/_0.9)]">
            <div className="flex items-center justify-between border-b border-primary/25 bg-primary/[0.04] px-3 py-2 text-[9px] uppercase tracking-[0.3em] text-primary/80">
              <span className="inline-flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-destructive/70" />
                  <span className="h-2 w-2 rounded-full bg-warning/70" />
                  <span className="h-2 w-2 rounded-full bg-success/70" />
                </span>
                <span>terminal · node_01</span>
              </span>
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground/70 hover:text-primary" aria-label="Close terminal">
                <X className="h-3 w-3" />
              </button>
            </div>

            <div
              ref={logRef}
              className="max-h-[40vh] min-h-[10rem] space-y-0.5 overflow-y-auto px-4 py-3 text-[12px] leading-relaxed sm:max-h-[50vh]"
            >
              {log.map((l, i) => (
                <div
                  key={i}
                  className={
                    l.kind === "in"
                      ? "text-primary"
                      : l.kind === "err"
                        ? "text-destructive"
                        : "whitespace-pre-wrap text-muted-foreground"
                  }
                >
                  {l.text}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); void submit(); }}
              className="flex items-center gap-2 border-t border-primary/20 bg-background/70 px-3 py-2"
            >
              <span className="text-[12px] text-success">$</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                placeholder="type `help` and press enter"
                className="flex-1 bg-transparent font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground/40"
              />
              <span className="caret-blink text-[12px] text-primary">▍</span>
            </form>
          </div>
        </div>
      )}
    </>
  );
}