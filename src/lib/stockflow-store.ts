import { useEffect, useState, useSyncExternalStore } from "react";
import aceImage from "@/assets/ace-ultra-premium.webp.asset.json";

export type Folder = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  folderId: string;
  price: number;
  cost: number;
  stock: number;
  barcode?: string;
  lowStockThreshold: number;
  unlimited?: boolean;
  image?: string;
};

export type SaleItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Sale = {
  id: string;
  items: SaleItem[];
  total: number;
  createdAt: string; // ISO
};

type Store = {
  folders: Folder[];
  products: Product[];
  sales: Sale[];
};

const KEY = "stockflow:v3";
const listeners = new Set<() => void>();
let cache: Store | null = null;

const VAPES_FOLDER_ID = "f_vapes";

const seed: Store = {
  folders: [{ id: VAPES_FOLDER_ID, name: "Vapes" }],
  products: [
    {
      id: "p_vape1",
      name: "Vape 1ml",
      folderId: VAPES_FOLDER_ID,
      price: 1,
      cost: 0,
      stock: 0,
      unlimited: true,
      image: aceImage.url,
      lowStockThreshold: 5,
    },
    {
      id: "p_vape2",
      name: "Vape 2ml",
      folderId: VAPES_FOLDER_ID,
      price: 1,
      cost: 0,
      stock: 0,
      unlimited: true,
      image: aceImage.url,
      lowStockThreshold: 5,
    },
  ],
  sales: [],
};

function migrate(raw: unknown): Store {
  const s = raw as Partial<Store> & {
    products?: Array<Product & { category?: string }>;
  };
  const folders: Folder[] = Array.isArray(s.folders) ? s.folders : [];
  const products: Product[] = [];
  const byName = new Map(folders.map((f) => [f.name.toLowerCase(), f]));
  for (const p of s.products ?? []) {
    let folderId = (p as Product).folderId;
    if (!folderId) {
      const cat = ((p as { category?: string }).category ?? "Uncategorized").trim() || "Uncategorized";
      const existing = byName.get(cat.toLowerCase());
      if (existing) {
        folderId = existing.id;
      } else {
        const f: Folder = { id: `f_${Math.random().toString(36).slice(2, 10)}`, name: cat };
        folders.push(f);
        byName.set(cat.toLowerCase(), f);
        folderId = f.id;
      }
    }
    const { category: _c, ...rest } = p as Product & { category?: string };
    void _c;
    products.push({ ...rest, folderId });
  }
  if (folders.length === 0) folders.push({ id: VAPES_FOLDER_ID, name: "Vapes" });
  return { folders, products, sales: Array.isArray(s.sales) ? s.sales : [] };
}

function read(): Store {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = seed;
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw) as Store;
      return cache;
    }
    // migrate from v2
    const legacy = window.localStorage.getItem("stockflow:v2");
    if (legacy) {
      cache = migrate(JSON.parse(legacy));
      window.localStorage.setItem(KEY, JSON.stringify(cache));
      return cache;
    }
  } catch {
    /* ignore */
  }
  cache = seed;
  window.localStorage.setItem(KEY, JSON.stringify(cache));
  return cache;
}

function write(next: Store) {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useStore(): Store {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const snap = useSyncExternalStore(
    subscribe,
    () => read(),
    () => seed,
  );
  return hydrated ? snap : seed;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const store = {
  addFolder(name: string) {
    const s = read();
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = s.folders.find((f) => f.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    const f: Folder = { id: uid("f"), name: trimmed };
    write({ ...s, folders: [...s.folders, f] });
    return f;
  },
  renameFolder(id: string, name: string) {
    const s = read();
    const trimmed = name.trim();
    if (!trimmed) return;
    write({ ...s, folders: s.folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f)) });
  },
  deleteFolder(id: string, moveToId?: string) {
    const s = read();
    if (s.folders.length <= 1 && !moveToId) return;
    const target = moveToId ?? s.folders.find((f) => f.id !== id)?.id;
    if (!target) return;
    write({
      folders: s.folders.filter((f) => f.id !== id),
      products: s.products.map((p) => (p.folderId === id ? { ...p, folderId: target } : p)),
      sales: s.sales,
    });
  },
  moveProduct(productId: string, folderId: string) {
    const s = read();
    write({
      ...s,
      products: s.products.map((p) => (p.id === productId ? { ...p, folderId } : p)),
    });
  },
  addProduct(p: Omit<Product, "id">) {
    const s = read();
    write({ ...s, products: [{ ...p, id: uid("p") }, ...s.products] });
  },
  updateProduct(id: string, patch: Partial<Product>) {
    const s = read();
    write({
      ...s,
      products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  },
  deleteProduct(id: string) {
    const s = read();
    write({ ...s, products: s.products.filter((p) => p.id !== id) });
  },
  recordSale(items: SaleItem[]) {
    const s = read();
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const sale: Sale = {
      id: uid("s"),
      items,
      total,
      createdAt: new Date().toISOString(),
    };
    const products = s.products.map((p) => {
      const it = items.find((i) => i.productId === p.id);
      if (!it || p.unlimited) return p;
      return { ...p, stock: Math.max(0, p.stock - it.quantity) };
    });
    write({ products, sales: [sale, ...s.sales] });
    return sale;
  },
  deleteSale(id: string) {
    const s = read();
    write({ ...s, sales: s.sales.filter((x) => x.id !== id) });
  },
  deleteSaleItem(saleId: string, productId: string) {
    const s = read();
    const sales = s.sales
      .map((sale) => {
        if (sale.id !== saleId) return sale;
        const items = sale.items.filter((i) => i.productId !== productId);
        if (items.length === 0) return null;
        const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        return { ...sale, items, total };
      })
      .filter((x): x is Sale => x !== null);
    write({ ...s, sales });
  },
  clearSales() {
    const s = read();
    write({ ...s, sales: [] });
  },
};

export function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}