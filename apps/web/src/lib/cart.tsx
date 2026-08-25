"use client";

import { apiGet } from "@/lib/api";
import { debugLog } from "@/lib/debug";
import { Cart } from "@/lib/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type CartState = {
  count: number;
  total: number;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartState>({ count: 0, total: 0, refresh: async () => {} });

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const cart = await apiGet<Cart>("/api/v1/cart");
      setCount(cart.items.length);
      setTotal(cart.total);
      debugLog("cart.tsx:refresh", "cart loaded", { count: cart.items.length, total: cart.total }, "B");
    } catch {
      setCount(0);
      setTotal(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ count, total, refresh }), [count, total, refresh]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
