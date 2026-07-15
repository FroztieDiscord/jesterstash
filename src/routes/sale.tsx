import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Package, Search, ShoppingCart, Minus, Plus, X } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, store, formatCurrency, type SaleItem } from "@/lib/stockflow-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/sale")({
  head: () => ({ meta: [{ title: "Record Sale — StockFlow" }] }),
  component: SalePage,
});

function SalePage() {
  const { products } = useStore();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.category.toLowerCase().includes(q.toLowerCase()),
      ),
    [products, q],
  );

  function add(pid: string) {
    const p = products.find((x) => x.id === pid);
    if (!p) return;
    if (p.stock <= 0) return;
    const existing = cart.find((c) => c.productId === pid);
    if (existing) {
      if (existing.quantity >= p.stock) return;
      setCart(
        cart.map((c) => (c.productId === pid ? { ...c, quantity: c.quantity + 1 } : c)),
      );
    } else {
      setCart([...cart, { productId: p.id, name: p.name, price: p.price, quantity: 1 }]);
    }
  }

  function setQty(pid: string, qty: number) {
    const p = products.find((x) => x.id === pid);
    if (!p) return;
    const clamped = Math.max(0, Math.min(p.stock, qty));
    if (clamped === 0) {
      setCart(cart.filter((c) => c.productId !== pid));
    } else {
      setCart(cart.map((c) => (c.productId === pid ? { ...c, quantity: clamped } : c)));
    }
  }

  function checkout() {
    if (cart.length === 0) return;
    const sale = store.recordSale(cart);
    setCart([]);
    toast.success(`Sale recorded · ${formatCurrency(sale.total)}`);
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <StockFlowLayout>
      <div className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight">Record Sale</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap products to add them to the cart</p>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products..."
          className="h-11 pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {list.map((p) => {
          const out = p.stock <= 0;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p.id)}
              disabled={out}
              className="group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[var(--shadow-card)] transition disabled:opacity-60 enabled:hover:border-primary/40 enabled:active:scale-[0.99]"
            >
              <div className="flex aspect-square items-center justify-center bg-muted">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div className="p-3">
                <div className="truncate text-sm text-muted-foreground">{p.name}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-bold">{formatCurrency(p.price)}</span>
                  <span
                    className={
                      out
                        ? "text-xs font-medium text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {out ? "Out" : `${p.stock}`}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Cart</h2>
          {cart.length > 0 && (
            <span className="ml-auto text-sm text-muted-foreground">
              {cart.reduce((n, i) => n + i.quantity, 0)} item(s)
            </span>
          )}
        </div>
        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Tap products to add them</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {cart.map((c) => (
                <li key={c.productId} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{formatCurrency(c.price)} each</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQty(c.productId, c.quantity - 1)}
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{c.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQty(c.productId, c.quantity + 1)}
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="w-16 text-right font-semibold">
                    {formatCurrency(c.price * c.quantity)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQty(c.productId, 0)}
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold">{formatCurrency(total)}</span>
            </div>
            <Button
              className="mt-4 h-11 w-full text-base"
              onClick={checkout}
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              Complete Sale
            </Button>
          </>
        )}
      </section>
    </StockFlowLayout>
  );
}