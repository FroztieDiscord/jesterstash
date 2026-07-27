import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Package, Plus, Search, Trash2, Pencil, Infinity as InfinityIcon } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, store, formatCurrency, type Product } from "@/lib/stockflow-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Jester's Stash" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { products } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  const filtered = products.filter((p) => {
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.category.toLowerCase().includes(q.toLowerCase()) ||
      (p.barcode ?? "").toLowerCase().includes(q.toLowerCase());
    const matchC = cat === "all" || p.category === cat;
    return matchQ && matchC;
  });

  return (
    <StockFlowLayout>
      <div className="mb-10 flex items-end justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">The Collection</p>
          <h1 className="mt-2 font-display text-4xl font-light tracking-tight">Inventory</h1>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2 rounded-none border-primary/30 bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-primary hover:bg-primary hover:text-primary-foreground">
              <Plus className="h-3 w-3" />
              New Entry
            </Button>
          </DialogTrigger>
          <ProductDialog
            key={editing?.id ?? "new"}
            initial={editing}
            onDone={() => {
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-11 rounded-none border-0 border-b border-border/40 bg-transparent pl-6 text-sm focus-visible:border-primary/60 focus-visible:ring-0"
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="h-11 rounded-none border-0 border-b border-border/40 bg-transparent text-[10px] uppercase tracking-[0.25em] focus:ring-0">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="border-t border-border/40 py-20 text-center text-sm italic text-muted-foreground/60">
          No products found
        </div>
      ) : (
        <ul className="border-t border-border/40">
          {filtered.map((p) => {
            const out = !p.unlimited && p.stock <= 0;
            const low = !p.unlimited && p.stock <= p.lowStockThreshold;
            return (
              <li key={p.id} className="group grid grid-cols-[64px_1fr_auto_auto_auto] items-center gap-5 border-b border-border/40 py-5">
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
                      <span className={"h-1.5 w-1.5 rounded-full " + (out ? "bg-destructive/70" : low ? "bg-warning/80" : "bg-primary")} />
                      <span className="text-muted-foreground/80 tabular-nums">{p.stock}</span>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none text-muted-foreground/70 hover:text-primary"
                    onClick={() => { setEditing(p); setOpen(true); }}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none text-muted-foreground/70 hover:text-destructive"
                    onClick={() => { if (confirm(`Delete ${p.name}?`)) store.deleteProduct(p.id); }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </StockFlowLayout>
  );
}

function ProductDialog({
  initial,
  onDone,
}: {
  initial: Product | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Uncategorized");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [cost, setCost] = useState(String(initial?.cost ?? ""));
  const [stock, setStock] = useState(String(initial?.stock ?? ""));
  const [threshold, setThreshold] = useState(String(initial?.lowStockThreshold ?? 5));
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [unlimited, setUnlimited] = useState<boolean>(initial?.unlimited ?? false);
  const [image, setImage] = useState(initial?.image ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      category: category.trim() || "Uncategorized",
      price: Number(price) || 0,
      cost: Number(cost) || 0,
      stock: Number(stock) || 0,
      lowStockThreshold: Number(threshold) || 0,
      barcode: barcode.trim() || undefined,
      unlimited,
      image: image.trim() || undefined,
    };
    if (initial) store.updateProduct(initial.id, data);
    else store.addProduct(data);
    onDone();
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{initial ? "Edit Product" : "Add Product"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label="Image URL (optional)">
          <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price">
            <Input type="number" inputMode="decimal" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Cost">
            <Input type="number" inputMode="decimal" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div>
            <div className="text-sm font-medium">Unlimited stock</div>
            <div className="text-xs text-muted-foreground">Never runs out</div>
          </div>
          <Switch checked={unlimited} onCheckedChange={setUnlimited} />
        </div>
        {!unlimited && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock">
              <Input type="number" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
            </Field>
            <Field label="Low stock at">
              <Input type="number" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </Field>
          </div>
        )}
        <Field label="Barcode (optional)">
          <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        </Field>
        <DialogFooter className="mt-2">
          <Button type="submit" className="w-full">
            {initial ? "Save changes" : "Add product"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}