"use client";

import { apiGet, apiSend } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { Cart } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

function kitLabel(kit?: string) {
  if (kit === "leaf_only") return "Только полотно / позиция";
  if (kit === "block_plus_extenders") return "Блок + доборы";
  if (kit === "standard_block") return "Полотно + коробка + наличник";
  return "Комплект";
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState("");
  const { refresh } = useCart();

  async function load() {
    try {
      const data = await apiGet<Cart>("/api/v1/cart");
      setCart(data);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка корзины");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    await apiSend(`/api/v1/cart/items/${id}`, "DELETE");
    await load();
  }

  if (!cart) return <div className="container-site py-16">{error || "Загрузка…"}</div>;

  return (
    <div className="container-site py-10">
      <h1 className="section-title">Корзина</h1>
      {cart.items.length === 0 ? (
        <p className="text-center text-muted">
          Пусто. <Link href="/catalog">Перейти в каталог</Link>
        </p>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 rounded-card border border-line p-5">
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-sm text-muted">
                  {kitLabel(item.config_json?.kit)}
                  {item.config_json?.size ? ` · ${item.config_json.size}` : ""} · {formatPrice(item.quoted_total)} ₽
                </p>
              </div>
              <button className="text-sm text-muted" onClick={() => remove(item.id)}>
                Удалить
              </button>
            </div>
          ))}
          <p className="text-right text-2xl font-bold">Итого: {formatPrice(cart.total)} ₽</p>
          <div className="text-right">
            <Link href="/checkout" className="btn btn-dark">
              Оформить заявку
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
