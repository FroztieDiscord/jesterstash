import { type ReactNode, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, LayoutDashboard, Package, ShoppingCart, Receipt, Users, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";

type NavItem = { to: "/dashboard" | "/inventory" | "/sale" | "/sales" | "/admin/applications"; label: string; icon: typeof Menu; adminOnly?: boolean };

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Package, adminOnly: true },
  { to: "/sale", label: "Record Sale", icon: ShoppingCart },
  { to: "/sales", label: "Sales History", icon: Receipt },
  { to: "/admin/applications", label: "Team Applications", icon: Users, adminOnly: true },
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
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col p-0">
              <SheetHeader className="border-b border-border p-5">
                <SheetTitle className="text-left text-xl font-bold">StockFlow</SheetTitle>
                {user?.email && (
                  <div className="text-left text-xs text-muted-foreground">
                    {user.email}
                    {isAdmin && <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">ADMIN</span>}
                  </div>
                )}
              </SheetHeader>
              <nav className="flex-1 p-3">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-border p-3">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="text-lg font-bold tracking-tight">
            StockFlow
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24">{children}</main>
    </div>
  );
}