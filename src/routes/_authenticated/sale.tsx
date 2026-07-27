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
  const { products, folders } = useStore();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);

  const folderName = useMemo(() => {
    const m = new Map<string, string>();
    folders.forEach((f) => m.set(f.id, f.name));
    return m;
  }, [folders]);

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          (folderName.get(p.folderId) ?? "").toLowerCase().includes(q.toLowerCase()),
      ),
    [products, q, folderName],
  );

  const productById = useMemo(() => {
    const m = new Map<string, typeof products[number]>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

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
      <div className="mb-8 border-b border-border/40 pb-6 sm:mb-10">
        <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">Point of Sale</p>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight sm:text-4xl">Record Sale</h1>
      </div>

      <div className="relative mb-6 sm:mb-8">
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
                className="grid w-full grid-cols-[44px_1fr_auto] items-center gap-2.5 py-3 text-left transition disabled:opacity-40 enabled:hover:bg-muted/10 enabled:active:scale-[0.998] sm:grid-cols-[56px_1fr_auto] sm:gap-4 sm:py-4"
              >
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden border border-border/40 bg-muted/20 sm:h-14 sm:w-14">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-sm text-foreground/90 sm:text-base">{p.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 sm:text-[10px] sm:tracking-[0.25em]">
                    {p.unlimited ? (
                      <>
                        <InfinityIcon className="h-3 w-3 text-primary/70" />
                        <span className="text-primary/70">Unlimited</span>
                      </>
                    ) : (
                      <>
                        <span className={"h-1.5 w-1.5 rounded-full " + (out ? "bg-destructive/70" : "bg-primary")} />
                        <span className={out ? "text-destructive/70" : "tabular-nums"}>
                          {out ? "Depleted" : `${p.stock} in stock`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right font-display text-sm font-light tabular-nums">{formatCurrency(p.price)}</div>
              </button>
            </li>
          );
        })}
      </ul>

      <section className="mt-8 border border-primary/20 bg-card/30 p-5 sm:mt-10 sm:p-8">
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
              {cart.map((c) => {
                const p = productById.get(c.productId);
                return (
                  <li key={c.productId} className="flex items-center gap-2.5 py-3 sm:gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-border/40 bg-muted/20">
                      {p?.image ? (
                        <img src={p.image} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm text-foreground/90">{c.name}</div>
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground/60 sm:text-[10px]">{formatCurrency(c.price)} · each</div>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1">
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
                    <div className="hidden w-16 text-right font-display text-sm tabular-nums sm:block">
                      {formatCurrency(c.price * c.quantity)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-none text-muted-foreground/60"
                      onClick={() => setQty(c.productId, 0)}
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
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