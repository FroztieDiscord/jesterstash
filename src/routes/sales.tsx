import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, formatCurrency } from "@/lib/stockflow-store";

export const Route = createFileRoute("/sales")({
  head: () => ({ meta: [{ title: "Sales History — StockFlow" }] }),
  component: SalesPage,
});

function SalesPage() {
  const { sales } = useStore();
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
        <div className="space-y-3">
          {sales.map((s) => (
            <article
              key={s.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {new Date(s.createdAt).toLocaleString()}
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
      )}
    </StockFlowLayout>
  );
}