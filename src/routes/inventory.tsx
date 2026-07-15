import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Package, Plus, Search, Trash2, Pencil } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — StockFlow" }] }),
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
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
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

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, barcode, or category..."
            className="h-11 pl-9"
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
            No products found
          </div>
        ) : (
          filtered.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
            >
              <div className="flex aspect-[16/7] items-center justify-center bg-muted">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.category}</div>
                  <div className="mt-1 text-sm">
                    <span className="font-semibold">{formatCurrency(p.price)}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(p);
                      setOpen(true);
                    }}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Delete ${p.name}?`)) store.deleteProduct(p.id);
                    }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price">
            <Input type="number" inputMode="decimal" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Cost">
            <Input type="number" inputMode="decimal" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stock">
            <Input type="number" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
          </Field>
          <Field label="Low stock at">
            <Input type="number" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </Field>
        </div>
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