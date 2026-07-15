import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Package, DollarSign, ShoppingCart, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, formatCurrency } from "@/lib/stockflow-store";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
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

  const stockValue = products.reduce((sum, p) => sum + p.cost * p.stock, 0);
  const todayTotal = salesToday.reduce((s, x) => s + x.total, 0);
  const weekTotal = salesWeek.reduce((s, x) => s + x.total, 0);
  const monthTotal = salesMonth.reduce((s, x) => s + x.total, 0);

  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);

  return (
    <StockFlowLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your inventory and sales</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon={<Package className="h-5 w-5 text-primary" />}
          iconBg="bg-accent"
          value={String(products.length)}
          label="Total Products"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-success" />}
          iconBg="bg-success-soft"
          value={formatCurrency(stockValue)}
          label="Stock Value"
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5 text-primary" />}
          iconBg="bg-accent"
          value={formatCurrency(todayTotal)}
          label="Sales Today"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          iconBg="bg-accent"
          value={formatCurrency(weekTotal)}
          label="Sales This Week"
        />
      </div>

      <div
        className="mt-4 rounded-2xl p-6 text-primary-foreground shadow-[var(--shadow-primary)]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <div className="text-sm/6 opacity-90">Sales This Month</div>
        <div className="mt-1 text-5xl font-bold tracking-tight">{formatCurrency(monthTotal)}</div>
        <div className="mt-1 text-sm opacity-80">{salesMonth.length} transactions</div>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Low Stock Alerts
          </h2>
          <Badge variant="secondary" className="rounded-full">
            {lowStock.length}
          </Badge>
        </div>
        {lowStock.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">All products are well stocked</p>
        ) : (
          <ul className="divide-y divide-border">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.category}</div>
                </div>
                {p.stock === 0 ? (
                  <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">
                    Out of stock
                  </span>
                ) : (
                  <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-semibold text-warning-foreground">
                    {p.stock} left
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Sales Activity</h2>
          <Link to="/sales" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {sales.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No sales recorded yet</p>
        ) : (
          <ul className="divide-y divide-border">
            {sales.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">
                    {s.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="font-semibold">{formatCurrency(s.total)}</div>
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
  iconBg,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
