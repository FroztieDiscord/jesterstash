import { createFileRoute, Link } from "@tanstack/react-router";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, formatCurrency } from "@/lib/stockflow-store";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { products, sales } = useStore();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 320);
    return () => clearTimeout(t);
  }, []);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfDay - now.getDay() * 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const salesToday = sales.filter((s) => new Date(s.createdAt).getTime() >= startOfDay);
  const salesWeek = sales.filter((s) => new Date(s.createdAt).getTime() >= startOfWeek);
  const salesMonth = sales.filter((s) => new Date(s.createdAt).getTime() >= startOfMonth);

  const stockValue = products.reduce(
    (sum, p) => sum + (p.unlimited ? 0 : p.cost * p.stock),
    0,
  );
  const todayTotal = salesToday.reduce((s, x) => s + x.total, 0);
  const weekTotal = salesWeek.reduce((s, x) => s + x.total, 0);
  const monthTotal = salesMonth.reduce((s, x) => s + x.total, 0);

  const lowStock = products.filter(
    (p) => !p.unlimited && p.stock <= p.lowStockThreshold,
  );

  if (!ready) return <DashboardSkeleton />;

  return (
    <StockFlowLayout>
      <section className="animate-fade-in relative overflow-hidden border border-primary/15 bg-card/40 p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">Monthly Revenue</p>
          <div className="mt-3 flex items-baseline gap-4">
            <h1 className="font-display text-6xl font-light tracking-tight text-foreground">
              {formatCurrency(monthTotal)}
            </h1>
            <span className="font-display text-sm italic text-primary/80">
              {salesMonth.length} transactions
            </span>
          </div>
        </div>
      </section>

      <div className="mt-14 grid grid-cols-3 gap-8">
        <Stat label="Active Inventory" value={String(products.length)} />
        <Stat label="Sales Today" value={formatCurrency(todayTotal)} />
        <Stat label="Sales This Week" value={formatCurrency(weekTotal)} accent />
      </div>

      <div className="mt-14 grid grid-cols-1 gap-16 lg:grid-cols-2">
        <section>
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70">Low Stock</h2>
            <span className="font-display text-sm text-primary/70">{lowStock.length.toString().padStart(2, "0")}</span>
          </div>
          {lowStock.length === 0 ? (
            <p className="border-t border-border/40 py-8 text-sm italic text-muted-foreground/60">All reserves in order.</p>
          ) : (
            <ul>
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between border-t border-border/40 py-5">
                  <span className="font-display text-sm text-foreground/90">{p.name}</span>
                  <span className={p.stock === 0 ? "text-[10px] uppercase tracking-widest text-destructive/70" : "text-[10px] uppercase tracking-widest text-primary/70"}>
                    {p.stock === 0 ? "Depleted" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70">Activity</h2>
            <Link to="/sales" className="text-[10px] uppercase tracking-[0.3em] text-primary/70 hover:text-primary">
              View all
            </Link>
          </div>
          {sales.length === 0 ? (
            <p className="border-t border-border/40 py-8 text-sm italic text-muted-foreground/60">No sales recorded.</p>
          ) : (
            <ul>
              {sales.slice(0, 5).map((s) => {
                const d = new Date(s.createdAt);
                const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <li key={s.id} className="flex gap-5 border-t border-border/40 py-5">
                    <div className="w-12 pt-0.5 text-[10px] tabular-nums text-muted-foreground/50">{time}</div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground/80">
                        Sale recorded · <span className="text-foreground/90">{s.items.reduce((n, i) => n + i.quantity, 0)} item(s)</span>
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-primary/60">
                        +{formatCurrency(s.total)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-16 border-t border-border/40 pt-6 text-[9px] uppercase tracking-[0.4em] text-muted-foreground/40">
        Stock Value · {formatCurrency(stockValue)}
      </div>
    </StockFlowLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={"border-l pl-6 " + (accent ? "border-primary/40" : "border-border/40")}>
      <p className={"text-[10px] uppercase tracking-[0.25em] " + (accent ? "text-primary/70" : "text-muted-foreground/60")}>{label}</p>
      <p className={"mt-2 font-display text-3xl font-light tracking-tight " + (accent ? "text-primary" : "text-foreground")}>{value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <StockFlowLayout>
      <Skeleton className="h-40 w-full" />
      <div className="mt-14 grid grid-cols-3 gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-l border-border/40 pl-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="mt-14 grid grid-cols-2 gap-16">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </StockFlowLayout>
  );
}
