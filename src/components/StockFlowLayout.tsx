import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, LayoutDashboard, Package, ShoppingCart, Receipt } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/sale", label: "Record Sale", icon: ShoppingCart },
  { to: "/sales", label: "Sales History", icon: Receipt },
] as const;

export function StockFlowLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border p-5">
                <SheetTitle className="text-left text-xl font-bold">StockFlow</SheetTitle>
              </SheetHeader>
              <nav className="p-3">
                {nav.map((item) => {
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
            </SheetContent>
          </Sheet>
          <Link to="/" className="text-lg font-bold tracking-tight">
            StockFlow
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24">{children}</main>
    </div>
  );
}