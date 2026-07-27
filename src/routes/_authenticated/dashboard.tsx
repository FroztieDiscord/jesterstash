import { createFileRoute, Link } from "@tanstack/react-router";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, formatCurrency } from "@/lib/stockflow-store";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Sparkles, TrendingUp, Package, Clock, Flame, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Jester's Stash" },
      { name: "description", content: "Team dashboard for Jester's Stash: monthly revenue, active inventory, sales today and this week, and low-stock alerts at a glance." },
      { property: "og:title", content: "Dashboard — Jester's Stash" },
      { property: "og:description", content: "Monthly revenue, inventory, and sales overview for the Jester's Stash team." },
      { name: "robots", content: "noindex" },
    ],
  }),
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

  // Last 7 days sparkline
  const spark = useMemo(() => {
    const days: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = d.getTime();
      const end = start + 86400000;
      const total = sales
        .filter((s) => {
          const t = new Date(s.createdAt).getTime();
          return t >= start && t < end;
        })
        .reduce((a, b) => a + b.total, 0);
      days.push({ label: d.toLocaleDateString([], { weekday: "short" })[0], total });
    }
    return days;
  }, [sales, now]);
  const sparkMax = Math.max(1, ...spark.map((d) => d.total));

  // Top products this month
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const s of salesMonth) {
      for (const it of s.items) {
        const prev = map.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 };
        prev.qty += it.quantity;
        prev.revenue += it.price * it.quantity;
        map.set(it.productId, prev);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  }, [salesMonth]);

  if (!ready) return <DashboardSkeleton />;

  return (
    <StockFlowLayout>
      {/* Hero */}
      <section className="corners vault-beam data-noise animate-fade-up relative isolate overflow-hidden rounded-3xl border border-primary/25 p-8 sm:p-12" style={{ background: "var(--gradient-royal)", boxShadow: "var(--shadow-primary)" }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl animate-float" style={{ background: "radial-gradient(circle, oklch(0.88 0.14 90 / 0.55), transparent 65%)" }} />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.5 0.22 28 / 0.65), transparent 65%)" }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(0.88 0.14 90 / 0.7), transparent)" }} />
        <div className="pointer-events-none absolute right-4 top-4 hidden font-mono text-[9px] uppercase tracking-[0.3em] text-primary/50 sm:block">
          [ vault_03 // classified ]
        </div>

        <div className="relative flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/40 px-3 py-1 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/90">Live · Ledger Sync</span>
            </div>
            <span className="hidden items-center gap-1.5 rounded-sm border border-success/40 bg-success/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-success sm:inline-flex">
              <Sparkles className="h-3 w-3" /> handler: root
            </span>
          </div>

          <div className="min-w-0">
            <h1 className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/70 terminal-caret">$ ./decrypt --stream monthly_revenue</h1>
            <div className="mt-3 flex flex-wrap items-baseline gap-3 sm:gap-4">
              <p className="animate-decrypt font-mono text-4xl font-bold tracking-tight text-foreground drop-shadow-[0_2px_20px_oklch(0.86_0.18_96_/_0.35)] sm:text-6xl md:text-7xl">
                {formatCurrency(monthTotal)}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background/40 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
                <TrendingUp className="h-3 w-3" /> {salesMonth.length} txns
              </span>
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-primary/50">
              &gt; channel authenticated · payload verified · <span className="text-success">200_ok</span>
            </p>
          </div>

          {/* Sparkline */}
          <div className="mt-2">
            <div className="mb-2 flex items-end justify-between text-[9px] uppercase tracking-[0.3em] text-primary/60">
              <span>Last 7 Days</span>
              <span>{formatCurrency(spark.reduce((a, b) => a + b.total, 0))}</span>
            </div>
            <div className="flex h-16 items-end gap-1.5">
              {spark.map((d, i) => {
                const h = Math.max(4, (d.total / sparkMax) * 100);
                const active = i === spark.length - 1;
                return (
                  <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm transition-all duration-500 hover:opacity-100"
                      style={{
                        height: `${h}%`,
                        background: active
                          ? "linear-gradient(180deg, oklch(0.9 0.13 92), oklch(0.6 0.12 65))"
                          : "linear-gradient(180deg, oklch(0.82 0.14 88 / 0.85), oklch(0.4 0.08 60 / 0.5))",
                        boxShadow: active ? "0 0 20px oklch(0.82 0.14 88 / 0.5)" : undefined,
                        animation: `fade-up 0.6s var(--ease-spring) both`,
                        animationDelay: `${i * 60}ms`,
                      }}
                    />
                    <span className="text-[8px] uppercase tracking-widest text-primary/50">{d.label}</span>
                    <div className="pointer-events-none absolute -top-8 rounded-md border border-primary/30 bg-background/90 px-2 py-0.5 text-[9px] text-primary opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                      {formatCurrency(d.total)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Package} label="Active Inventory" value={<Counter to={products.length} />} sub="items tracked" />
        <StatCard icon={Clock} label="Sales Today" value={formatCurrency(todayTotal)} sub={`${salesToday.length} txn${salesToday.length === 1 ? "" : "s"}`} />
        <StatCard icon={Flame} label="Sales This Week" value={formatCurrency(weekTotal)} sub={`${salesWeek.length} txn${salesWeek.length === 1 ? "" : "s"}`} accent />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70">
              <AlertTriangle className="h-3 w-3 text-primary/70" /> Low Stock
            </h2>
            <span className="rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 font-display text-xs text-primary/80">{lowStock.length.toString().padStart(2, "0")}</span>
          </div>
          {lowStock.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card/30 p-8 text-center">
              <div className="mx-auto mb-2 h-8 w-8 rounded-full border border-primary/30 bg-primary/10 p-1.5 text-primary/70">
                <Sparkles className="h-full w-full" />
              </div>
              <p className="text-sm italic text-muted-foreground/70">All reserves in order.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-card/30 px-4 py-3 transition-colors hover:border-primary/30">
                  <span className="font-display text-sm text-foreground/90">{p.name}</span>
                  <span className={p.stock === 0 ? "rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-destructive" : "rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary/80"}>
                    {p.stock === 0 ? "Depleted" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Top Products */}
          <div className="mt-10">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70">Top Movers · Month</h2>
            </div>
            {topProducts.length === 0 ? (
              <p className="rounded-2xl border border-border/40 bg-card/30 py-6 text-center text-sm italic text-muted-foreground/60">Awaiting first sale.</p>
            ) : (
              <ul className="space-y-2">
                {topProducts.map((p, i) => {
                  const max = topProducts[0].revenue || 1;
                  const pct = (p.revenue / max) * 100;
                  return (
                    <li key={i} className="relative overflow-hidden rounded-xl border border-border/40 bg-card/30 px-4 py-3">
                      <div className="pointer-events-none absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: "linear-gradient(90deg, oklch(0.82 0.14 88 / 0.12), transparent)" }} />
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-display text-xs text-primary/60">0{i + 1}</span>
                          <span className="font-display text-sm text-foreground/90">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-sm text-foreground">{formatCurrency(p.revenue)}</div>
                          <div className="text-[9px] uppercase tracking-widest text-muted-foreground/60">{p.qty} sold</div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70">Recent Activity</h2>
            <Link to="/sales" className="group inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] text-primary/70 hover:text-primary">
              View all <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
          {sales.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 bg-card/20 p-10 text-center">
              <p className="font-display text-lg italic text-muted-foreground/70">The ledger is quiet.</p>
              <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/50">Awaiting first transaction</p>
              <Link to="/sale" className="mt-4 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-primary hover:bg-primary/20">
                Record a sale <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <ul className="relative space-y-1">
              <div className="absolute bottom-2 left-[22px] top-2 w-px bg-gradient-to-b from-primary/40 via-border/40 to-transparent" />
              {sales.slice(0, 6).map((s) => {
                const d = new Date(s.createdAt);
                const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const qty = s.items.reduce((n, i) => n + i.quantity, 0);
                return (
                  <li key={s.id} className="relative flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-card/40">
                    <div className="relative z-10 flex h-11 w-11 flex-none items-center justify-center rounded-full border border-primary/40 bg-background/80 text-primary shadow-[0_0_18px_-6px_oklch(0.82_0.14_88_/_0.5)]">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/90">
                        Sale · <span className="text-muted-foreground/80">{qty} item{qty === 1 ? "" : "s"}</span>
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">{time}</p>
                    </div>
                    <div className="font-display text-sm text-primary">
                      +{formatCurrency(s.total)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-14 flex items-center justify-between border-t border-border/40 pt-5 text-[9px] uppercase tracking-[0.4em] text-muted-foreground/40">
        <span>Stock Value · <span className="text-primary/70">{formatCurrency(stockValue)}</span></span>
        <span className="hidden sm:inline">Jester&rsquo;s Stash · Terminal 01</span>
      </div>
    </StockFlowLayout>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: typeof Package; label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className={"lift group relative overflow-hidden rounded-2xl border p-5 " + (accent ? "border-primary/40 bg-primary/[0.03]" : "border-border/50 bg-card/30")}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70" style={{ background: accent ? "oklch(0.82 0.14 88 / 0.35)" : "oklch(0.5 0.05 280 / 0.3)" }} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className={"text-[10px] uppercase tracking-[0.25em] " + (accent ? "text-primary/80" : "text-muted-foreground/60")}>{label}</p>
          <p className={"mt-2 font-display text-3xl font-light tracking-tight " + (accent ? "text-primary" : "text-foreground")}>{value}</p>
          {sub && <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/50">{sub}</p>}
        </div>
        <div className={"flex h-9 w-9 items-center justify-center rounded-full border " + (accent ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-background/50 text-muted-foreground")}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Counter({ to }: { to: number }) {
  const [n, setN] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const dur = 800;
    const from = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (to - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [to]);
  return <>{n}</>;
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
