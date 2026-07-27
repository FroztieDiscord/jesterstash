import { type ReactNode, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, LayoutDashboard, Package, ShoppingCart, Receipt, Users, LogOut, ShieldAlert, Lock, Terminal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { ReducedMotionToggle, applyReducedMotionFromStorage } from "@/components/ReducedMotionToggle";
import { useEffect } from "react";

type NavItem = { to: "/dashboard" | "/inventory" | "/sale" | "/sales" | "/admin/applications" | "/admin/audit"; label: string; icon: typeof Menu; adminOnly?: boolean };

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Package, adminOnly: true },
  { to: "/sale", label: "Record Sale", icon: ShoppingCart },
  { to: "/sales", label: "Sales History", icon: Receipt },
  { to: "/admin/applications", label: "Team Applications", icon: Users, adminOnly: true },
  { to: "/admin/audit", label: "Audit Log", icon: ShieldAlert, adminOnly: true },
];

export function StockFlowLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useCurrentUser();

  useEffect(() => { applyReducedMotionFromStorage(); }, []);

  const items = nav.filter((n) => !n.adminOnly || isAdmin);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-primary/20 bg-background/80 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(0.86 0.18 96 / 0.5), transparent)" }} />
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-primary/30 bg-card/60 text-primary/90 transition hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-90"
            >
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[85vw] max-w-[20rem] flex-col border-r border-primary/25 bg-background/95 p-0 backdrop-blur-xl">
              <SheetHeader className="border-b border-primary/20 p-5">
                <SheetTitle className="text-left font-mono text-xl font-bold uppercase tracking-[0.15em] text-primary">
                  <span className="text-primary/60">./</span>jester_stash
                </SheetTitle>
                <div className="text-left font-mono text-[10px] uppercase tracking-[0.3em] text-success">
                  <span className="encrypted-badge">Encrypted</span>
                </div>
                {user?.email && (
                  <div className="mt-1 text-left font-mono text-[11px] tracking-wide text-muted-foreground">
                    <span className="text-success">$</span> {user.email}
                    {isAdmin && <span className="ml-2 rounded-sm border border-primary/50 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">ROOT</span>}
                  </div>
                )}
              </SheetHeader>
              <nav className="flex-1 space-y-1 p-3">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md px-3 py-2.5 font-mono text-[13px] uppercase tracking-[0.12em] transition-all",
                        active
                          ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.05)]"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                      )}
                    >
                      {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary shadow-[0_0_10px_oklch(0.86_0.18_96_/_0.9)]" />}
                      <Icon className="h-3.5 w-3.5" />
                      <span>{active ? <span className="text-primary/70">&gt; </span> : null}{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-primary/20 p-3">
                <div className="mb-2">
                  <ReducedMotionToggle />
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 font-mono text-[13px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="flex min-w-0 flex-col leading-none hover-glitch">
            <span className="font-mono text-base font-bold uppercase tracking-[0.15em] text-primary sm:text-lg">
              <span className="text-primary/50">./</span>jester_stash
            </span>
            <span className="mt-1 flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.3em] text-success/80">
              <Lock className="h-2.5 w-2.5" /> aes-256 · node-01
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex encrypted-badge">Secure</span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-success/40 bg-success/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-success">
              <Terminal className="h-2.5 w-2.5" />
              <span>LIVE</span>
            </span>
          </div>
        </div>
      </header>
      <div aria-hidden className="ticker border-b border-primary/15 bg-background/60 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-primary/70">
        <div>
          {Array.from({ length: 2 }).map((_, r) => (
            <span key={r} className="inline-flex items-center gap-3">
              <span className="text-success">●</span> uplink secure
              <span className="text-primary/40">//</span>
              tls 1.3 · aes-256-gcm
              <span className="text-primary/40">//</span>
              <span className="text-success">●</span> node_01 online
              <span className="text-primary/40">//</span>
              hash 0x{Math.random().toString(16).slice(2, 10)}
              <span className="text-primary/40">//</span>
              <span className="text-destructive">◆</span> intruder shield: armed
              <span className="text-primary/40">//</span>
              blackline established
              <span className="text-primary/40">//</span>
              <span className="text-success">●</span> vault sealed
              <span className="text-primary/40">//</span>
              access: root only
              <span className="text-primary/40">//</span>
            </span>
          ))}
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}