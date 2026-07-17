import { createFileRoute } from "@tanstack/react-router";
import { Receipt, Clock, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, store, formatCurrency, type Sale } from "@/lib/stockflow-store";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales History — Jester's Stash" }] }),
  component: SalesPage,
});

function SalesPage() {
  const { sales } = useStore();
  const { isAdmin } = useCurrentUser();
  const groups = groupByDay(sales);
  return (
    <StockFlowLayout>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sales.length} transactions</p>
        </div>
        {isAdmin && sales.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" /> Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all sales?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes all {sales.length} recorded transactions. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    store.clearSales();
                    toast.success("All sales cleared");
                  }}
                >
                  Clear all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
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
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold">{formatCurrency(s.total)}</div>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  aria-label="Delete sale"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Removes the entire transaction ({formatCurrency(s.total)}).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      store.deleteSale(s.id);
                                      toast.success("Sale deleted");
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
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
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {formatCurrency(i.price * i.quantity)}
                              </span>
                              {isAdmin && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                      aria-label={`Remove ${i.name}`}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove {i.name}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Removes this item from the sale. If it's the last item,
                                        the whole sale is deleted.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          store.deleteSaleItem(s.id, i.productId);
                                          toast.success("Item removed");
                                        }}
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
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