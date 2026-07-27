import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Package, Search, ShoppingCart, Minus, Plus, X, Infinity as InfinityIcon } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, store, formatCurrency, type SaleItem } from "@/lib/stockflow-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sale")({
  head: () => ({ meta: [{ title: "Record Sale — Jester's Stash" }] }),
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
    if (!p.unlimited && p.stock <= 0) return;
    const existing = cart.find((c) => c.productId === pid);
    if (existing) {
      if (!p.unlimited && existing.quantity >= p.stock) return;
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
    const clamped = p.unlimited
      ? Math.max(0, qty)
      : Math.max(0, Math.min(p.stock, qty));
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
      <div className="mb-10 border-b border-border/40 pb-6">
        <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">Point of Sale</p>
        <h1 className="mt-2 font-display text-4xl font-light tracking-tight">Record Sale</h1>
      </div>

      <div className="relative mb-8">
        <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search collection"
          className="h-11 rounded-none border-0 border-b border-border/40 bg-transparent pl-6 text-sm focus-visible:border-primary/60 focus-visible:ring-0"
        />
      </div>

      <ul className="border-t border-border/40">
        {list.map((p) => {
          const out = !p.unlimited && p.stock <= 0;
          return (
            <li key={p.id} className="border-b border-border/40">
              <button
                type="button"
                onClick={() => add(p.id)}
                disabled={out}
                className="grid w-full grid-cols-[64px_1fr_auto_auto] items-center gap-5 py-5 text-left transition disabled:opacity-40 enabled:hover:bg-muted/10 enabled:active:scale-[0.998]"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden border border-border/40 bg-muted/20">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-base text-foreground/90">{p.name}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">{p.category}</div>
                </div>
                <div className="w-20 text-right font-display text-sm font-light tabular-nums">{formatCurrency(p.price)}</div>
                <div className="flex w-24 items-center justify-end gap-1.5 text-[10px] uppercase tracking-[0.2em]">
                  {p.unlimited ? (
                    <>
                      <InfinityIcon className="h-3.5 w-3.5 text-primary/80" />
                      <span className="text-primary/70">Unlimited</span>
                    </>
                  ) : (
                    <>
                      <span className={"h-1.5 w-1.5 rounded-full " + (out ? "bg-destructive/70" : "bg-primary")} />
                      <span className={out ? "text-destructive/70" : "text-muted-foreground/80 tabular-nums"}>
                        {out ? "Depleted" : p.stock}
                      </span>
                    </>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <section className="mt-10 border border-primary/20 bg-card/30 p-8">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-lg text-primary">Cart</h2>
          {cart.length > 0 && (
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              {cart.reduce((n, i) => n + i.quantity, 0)} item(s)
            </span>
          )}
        </div>
        {cart.length === 0 ? (
          <p className="py-6 text-center text-sm italic text-muted-foreground/60">Empty</p>
        ) : (
          <>
            <ul className="divide-y divide-border/40">
              {cart.map((c) => (
                <li key={c.productId} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-sm text-foreground/90">{c.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{formatCurrency(c.price)} · each</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-none border-border/40 bg-transparent"
                      onClick={() => setQty(c.productId, c.quantity - 1)}
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-6 text-center font-display text-sm tabular-nums">{c.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-none border-border/40 bg-transparent"
                      onClick={() => setQty(c.productId, c.quantity + 1)}
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="w-16 text-right font-display text-sm tabular-nums">
                    {formatCurrency(c.price * c.quantity)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-none text-muted-foreground/60"
                    onClick={() => setQty(c.productId, 0)}
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-border/40 pt-4">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">Total</span>
              <span className="font-display text-2xl font-light text-foreground">{formatCurrency(total)}</span>
            </div>
            <Button
              className="mt-6 h-12 w-full rounded-none bg-primary text-[10px] uppercase tracking-[0.35em] text-primary-foreground hover:bg-primary/90"
              onClick={checkout}
            >
              Authorize Transaction
            </Button>
          </>
        )}
      </section>
    </StockFlowLayout>
  );
}