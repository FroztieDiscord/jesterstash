import { useEffect, useState, useSyncExternalStore } from "react";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  barcode?: string;
  lowStockThreshold: number;
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
  products: Product[];
  sales: Sale[];
};

const KEY = "stockflow:v1";
const listeners = new Set<() => void>();
let cache: Store | null = null;

const seed: Store = {
  products: [
    {
      id: "p_vape1",
      name: "Vape 1ml",
      category: "Uncategorized",
      price: 15,
      cost: 8,
      stock: 0,
      lowStockThreshold: 5,
    },
    {
      id: "p_vape2",
      name: "Vape 2ml",
      category: "Uncategorized",
      price: 22,
      cost: 12,
      stock: 0,
      lowStockThreshold: 5,
    },
  ],
  sales: [],
};

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
      return it ? { ...p, stock: Math.max(0, p.stock - it.quantity) } : p;
    });
    write({ products, sales: [sale, ...s.sales] });
    return sale;
  },
};

export function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}