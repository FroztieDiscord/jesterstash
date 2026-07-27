import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Package, Plus, Search, Trash2, Pencil, Infinity as InfinityIcon, FolderPlus, ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { useStore, store, formatCurrency, type Product, type Folder } from "@/lib/stockflow-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VaultDialog } from "@/components/VaultDialog";
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
  const { products, folders } = useStore();
  const [q, setQ] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const dirtyRef = useRef(false);

  function tryClose(next: boolean) {
    if (!next && dirtyRef.current) {
      if (!confirm("Discard unsaved changes?")) return;
    }
    dirtyRef.current = false;
    setOpen(next);
    if (!next) setEditing(null);
  }

  const folderName = useMemo(() => {
    const m = new Map<string, string>();
    folders.forEach((f) => m.set(f.id, f.name));
    return m;
  }, [folders]);

  const filtered = products.filter((p) => {
    const fname = folderName.get(p.folderId) ?? "";
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      fname.toLowerCase().includes(q.toLowerCase()) ||
      (p.barcode ?? "").toLowerCase().includes(q.toLowerCase());
    const matchF = folderFilter === "all" || p.folderId === folderFilter;
    return matchQ && matchF;
  });

  const grouped = useMemo(() => {
    const g = new Map<string, Product[]>();
    folders.forEach((f) => g.set(f.id, []));
    filtered.forEach((p) => {
      if (!g.has(p.folderId)) g.set(p.folderId, []);
      g.get(p.folderId)!.push(p);
    });
    return g;
  }, [folders, filtered]);

  return (
    <StockFlowLayout>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/40 pb-6 sm:mb-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">The Collection</p>
          <h1 className="mt-2 font-display text-3xl font-light tracking-tight sm:text-4xl">Inventory</h1>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 rounded-none border-border/60 bg-transparent px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:border-primary/40 hover:text-primary"
            onClick={() => { setEditingFolder(null); setFolderDialogOpen(true); }}
          >
            <FolderPlus className="h-3 w-3" />
            <span className="hidden sm:inline">New Folder</span>
          </Button>
        <Dialog open={open} onOpenChange={tryClose}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2 rounded-none border-primary/30 bg-transparent px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-primary hover:bg-primary hover:text-primary-foreground">
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">New Entry</span>
              <span className="sm:hidden">Item</span>
            </Button>
          </DialogTrigger>
          <ProductDialog
            key={editing?.id ?? "new"}
            initial={editing}
            folders={folders}
            dirtyRef={dirtyRef}
            onDone={() => {
              dirtyRef.current = false;
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-11 rounded-none border-0 border-b border-border/40 bg-transparent pl-6 text-sm focus-visible:border-primary/60 focus-visible:ring-0"
          />
        </div>
        <Select value={folderFilter} onValueChange={setFolderFilter}>
          <SelectTrigger className="h-11 rounded-none border-0 border-b border-border/40 bg-transparent text-[10px] uppercase tracking-[0.25em] focus:ring-0">
            <SelectValue placeholder="All folders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All folders</SelectItem>
            {folders.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
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
        <div className="border-t border-border/40">
          {folders
            .filter((f) => folderFilter === "all" || f.id === folderFilter)
            .map((f) => {
              const items = grouped.get(f.id) ?? [];
              if (items.length === 0 && q) return null;
              const isCollapsed = collapsed[f.id];
              return (
                <section key={f.id} className="border-b border-border/40">
                  <div className="group/folder flex items-center gap-2 py-3 sm:py-4">
                    <button
                      type="button"
                      onClick={() => setCollapsed((c) => ({ ...c, [f.id]: !c[f.id] }))}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-primary/70" />
                      )}
                      <FolderOpen className="h-3.5 w-3.5 text-primary/60" />
                      <span className="font-display text-sm uppercase tracking-[0.25em] text-foreground/90">{f.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50">· {items.length}</span>
                    </button>
                    <div className="flex gap-0.5 opacity-60 transition-opacity group-hover/folder:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-none text-muted-foreground/70 hover:text-primary"
                        onClick={() => { setEditingFolder(f); setFolderDialogOpen(true); }}
                        aria-label="Edit folder"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {folders.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-none text-muted-foreground/70 hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete folder "${f.name}"? Products will move to another folder.`)) {
                              store.deleteFolder(f.id);
                            }
                          }}
                          aria-label="Delete folder"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {!isCollapsed && (
                    <ul className="border-t border-border/30">
                      {items.length === 0 ? (
                        <li className="py-6 text-center text-xs italic text-muted-foreground/50">Empty folder</li>
                      ) : (
                        items.map((p) => {
                          const out = !p.unlimited && p.stock <= 0;
                          const low = !p.unlimited && p.stock <= p.lowStockThreshold;
                          return (
                            <li
                              key={p.id}
                              className="group grid cursor-pointer grid-cols-[44px_1fr_auto_auto] items-center gap-2.5 border-b border-border/30 py-3 transition-colors last:border-b-0 hover:bg-muted/10 sm:grid-cols-[56px_1fr_auto_auto_auto] sm:gap-4 sm:py-4"
                              onClick={() => { setEditing(p); setOpen(true); }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setEditing(p);
                                  setOpen(true);
                                }
                              }}
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
                                      <span className={"h-1.5 w-1.5 rounded-full " + (out ? "bg-destructive/70" : low ? "bg-warning/80" : "bg-primary")} />
                                      <span className="tabular-nums">{out ? "Depleted" : `${p.stock} in stock`}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="w-14 text-right font-display text-sm font-light tabular-nums sm:w-20">{formatCurrency(p.price)}</div>
                              <div className="hidden w-24 sm:block" />
                              <div
                                className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-none text-muted-foreground/70 hover:text-primary sm:h-8 sm:w-8"
                                  onClick={(e) => { e.stopPropagation(); setEditing(p); setOpen(true); }}
                                  aria-label="Edit"
                                >
                                  <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-none text-muted-foreground/70 hover:text-destructive sm:h-8 sm:w-8"
                                  onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${p.name}?`)) store.deleteProduct(p.id); }}
                                  aria-label="Delete"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </Button>
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}
                </section>
              );
            })}
        </div>
      )}

      <Dialog open={folderDialogOpen} onOpenChange={(o) => { setFolderDialogOpen(o); if (!o) setEditingFolder(null); }}>
        <FolderDialog key={editingFolder?.id ?? "new-folder"} initial={editingFolder} onDone={() => { setFolderDialogOpen(false); setEditingFolder(null); }} />
      </Dialog>
    </StockFlowLayout>
  );
}

function ProductDialog({
  initial,
  folders,
  dirtyRef,
  onDone,
}: {
  initial: Product | null;
  folders: Folder[];
  dirtyRef: React.MutableRefObject<boolean>;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [folderId, setFolderId] = useState(initial?.folderId ?? folders[0]?.id ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [cost, setCost] = useState(String(initial?.cost ?? ""));
  const [stock, setStock] = useState(String(initial?.stock ?? ""));
  const [threshold, setThreshold] = useState(String(initial?.lowStockThreshold ?? 5));
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [unlimited, setUnlimited] = useState<boolean>(initial?.unlimited ?? false);
  const [image, setImage] = useState(initial?.image ?? "");

  const snapshot = useRef({
    name: initial?.name ?? "",
    folderId: initial?.folderId ?? folders[0]?.id ?? "",
    price: String(initial?.price ?? ""),
    cost: String(initial?.cost ?? ""),
    stock: String(initial?.stock ?? ""),
    threshold: String(initial?.lowStockThreshold ?? 5),
    barcode: initial?.barcode ?? "",
    unlimited: initial?.unlimited ?? false,
    image: initial?.image ?? "",
  });

  useEffect(() => {
    const s = snapshot.current;
    dirtyRef.current =
      name !== s.name ||
      folderId !== s.folderId ||
      price !== s.price ||
      cost !== s.cost ||
      stock !== s.stock ||
      threshold !== s.threshold ||
      barcode !== s.barcode ||
      unlimited !== s.unlimited ||
      image !== s.image;
  }, [name, folderId, price, cost, stock, threshold, barcode, unlimited, image, dirtyRef]);

  function handleDelete() {
    if (!initial) return;
    if (confirm(`Delete ${initial.name}? This cannot be undone.`)) {
      store.deleteProduct(initial.id);
      dirtyRef.current = false;
      onDone();
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    let fid = folderId;
    if (!fid) {
      const f = store.addFolder("Uncategorized");
      fid = f?.id ?? folders[0]?.id ?? "";
    }
    const data = {
      name: name.trim(),
      folderId: fid,
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
    <VaultDialog title={initial ? `edit ${initial.name}` : "deploy new asset"} channel={initial ? "vault_03/edit" : "vault_03/deploy"}>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Folder">
          <Select value={folderId} onValueChange={setFolderId}>
            <SelectTrigger><SelectValue placeholder="Select folder" /></SelectTrigger>
            <SelectContent>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="mt-1 rounded-sm border border-primary/20 bg-primary/[0.03] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/70">
          <span className="text-success">✓</span> payload verified · signature: 0x{initial?.id.slice(0, 8) ?? "new_asset"}
        </div>
        <DialogFooter className="mt-2">
          {initial ? (
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                purge
              </Button>
              <Button type="submit" className="flex-1 font-mono uppercase tracking-[0.25em]">commit</Button>
            </div>
          ) : (
            <Button type="submit" className="w-full font-mono uppercase tracking-[0.25em]">deploy asset</Button>
          )}
        </DialogFooter>
      </form>
    </VaultDialog>
  );
}

function FolderDialog({ initial, onDone }: { initial: Folder | null; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (initial) store.renameFolder(initial.id, name);
    else store.addFolder(name);
    onDone();
  }
  return (
    <VaultDialog title={initial ? `rename ${initial.name}` : "new dead-drop"} channel="vault_03/folders" className="max-w-sm">
      <form onSubmit={submit} className="grid gap-3">
        <Field label="Folder name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </Field>
        <DialogFooter className="mt-2">
          <Button type="submit" className="w-full font-mono uppercase tracking-[0.25em]">{initial ? "commit" : "seal"}</Button>
        </DialogFooter>
      </form>
    </VaultDialog>
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