import { type ReactNode, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, LayoutDashboard, Package, ShoppingCart, Receipt, Users, LogOut, ShieldAlert } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";

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

  const items = nav.filter((n) => !n.adminOnly || isAdmin);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(0.82 0.14 88 / 0.5), transparent)" }} />
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-foreground/90 transition hover:border-primary/50 hover:text-primary"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="flex w-80 flex-col border-r border-border/60 bg-background/95 p-0 backdrop-blur-xl">
              <SheetHeader className="border-b border-border/60 p-6">
                <SheetTitle className="text-left text-2xl font-normal tracking-wide text-gold font-display">Jester&#39;s Stash</SheetTitle>
                {user?.email && (
                  <div className="text-left text-xs tracking-wide text-muted-foreground">
                    {user.email}
                    {isAdmin && <span className="ml-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">Admin</span>}
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
                        "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium tracking-wide transition-all",
                        active
                          ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.05)]"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold" />}
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-border/60 p-3">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium tracking-wide text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-normal leading-none tracking-wide text-gold">Jester&rsquo;s Stash</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground sm:inline">Premium</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 pb-24">{children}</main>
    </div>
  );
}