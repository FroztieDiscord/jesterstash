import { createFileRoute } from "@tanstack/react-router";
import { Receipt, Clock } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, formatCurrency, type Sale } from "@/lib/stockflow-store";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales History — Jester's Stash" }] }),
  component: SalesPage,
});

function SalesPage() {
  const { sales } = useStore();
  const groups = groupByDay(sales);
  return (
    <StockFlowLayout>
      <div className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
        <p className="mt-1 text-sm text-muted-foreground">{sales.length} transactions</p>
      </div>
      {sales.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-3 h-10 w-10 opacity-50" />
          No sales recorded yet
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => {
            const dayTotal = g.sales.reduce((s, x) => s + x.total, 0);
            return (
              <section key={g.key}>
                <header className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.label}
                  </h2>
                  <span className="text-sm font-semibold">{formatCurrency(dayTotal)}</span>
                </header>
                <div className="space-y-3">
                  {g.sales.map((s) => (
                    <article
                      key={s.id}
                      className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(s.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-lg font-bold">{formatCurrency(s.total)}</div>
                      </div>
                      <ul className="divide-y divide-border">
                        {s.items.map((i) => (
                          <li
                            key={i.productId}
                            className="flex items-center justify-between py-2 text-sm"
                          >
                            <span>
                              {i.name}{" "}
                              <span className="text-muted-foreground">× {i.quantity}</span>
                            </span>
                            <span className="font-medium">
                              {formatCurrency(i.price * i.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </StockFlowLayout>
  );
}

function groupByDay(sales: Sale[]) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const map = new Map<string, Sale[]>();
  for (const s of sales) {
    const d = new Date(s.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([key, group]) => {
    const d = new Date(group[0].createdAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    let label: string;
    if (dayStart === startOfToday) label = "Today";
    else if (dayStart === startOfYesterday) label = "Yesterday";
    else
      label = d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
      });
    return { key, label, sales: group };
  });
}