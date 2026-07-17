import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Package, DollarSign, ShoppingCart, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, formatCurrency } from "@/lib/stockflow-store";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { products, sales } = useStore();

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

  return (
    <StockFlowLayout>
      <div className="mb-8">
        <div className="text-[10px] font-medium uppercase tracking-[0.4em] text-primary/70">Maison</div>
        <h1 className="mt-2 font-display text-5xl font-normal tracking-tight">
          <span className="text-gold">Dashboard</span>
        </h1>
        <p className="mt-2 text-sm tracking-wide text-muted-foreground">A curated overview of inventory and revenue.</p>
        <div className="mt-5 h-px w-full" style={{ background: "linear-gradient(90deg, oklch(0.82 0.14 88 / 0.5), transparent)" }} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          value={String(products.length)}
          label="Total Products"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          value={formatCurrency(stockValue)}
          label="Stock Value"
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5" />}
          value={formatCurrency(todayTotal)}
          label="Sales Today"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          value={formatCurrency(weekTotal)}
          label="Sales This Week"
        />
      </div>

      <div className="relative mt-5 overflow-hidden rounded-3xl border border-primary/30 p-8 shadow-[var(--shadow-primary)]">
        <div className="absolute inset-0 opacity-70" style={{ background: "var(--gradient-primary)" }} />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-holo)" }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.4), transparent)" }} />
        <div className="relative">
          <div className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/80">Monthly Revenue</div>
          <div className="mt-3 font-display text-6xl font-normal tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)]">
            {formatCurrency(monthTotal)}
          </div>
          <div className="mt-2 text-sm tracking-wide text-white/80">{salesMonth.length} transactions this period</div>
        </div>
      </div>

      <section className="hairline-gold mt-5 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 font-display text-2xl font-normal">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Low Stock Alerts
          </h2>
          <Badge variant="secondary" className="rounded-full border border-border/60 bg-muted/60 px-3 tracking-wide">
            {lowStock.length}
          </Badge>
        </div>
        {lowStock.length === 0 ? (
          <p className="py-8 text-center text-sm italic tracking-wide text-muted-foreground">All products are well stocked.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-4">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{p.category}</div>
                </div>
                {p.stock === 0 ? (
                  <span className="rounded-full border border-destructive/50 bg-destructive/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-destructive">
                    Out of stock
                  </span>
                ) : (
                  <span className="rounded-full border border-warning/40 bg-warning/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-warning">
                    {p.stock} left
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="hairline-gold mt-5 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl font-normal">Recent Activity</h2>
          <Link to="/sales" className="group flex items-center gap-1 text-xs font-medium uppercase tracking-[0.25em] text-primary transition hover:gap-2">
            View all <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {sales.length === 0 ? (
          <p className="py-10 text-center text-sm italic tracking-wide text-muted-foreground">No sales recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {sales.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-4">
                <div>
                  <div className="font-medium">
                    {s.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                  </div>
                  <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="font-display text-lg font-medium text-gold">{formatCurrency(s.total)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </StockFlowLayout>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="hairline-gold group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-5 shadow-[var(--shadow-card)] backdrop-blur transition-all hover:border-primary/40">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-all group-hover:bg-primary/15">
        {icon}
      </div>
      <div className="mt-4 font-display text-3xl font-normal tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
    </div>
  );
}
