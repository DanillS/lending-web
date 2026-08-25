"use client";

import { apiGet, apiSend } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Order } from "@/lib/types";
import { useEffect, useState } from "react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    setOrders(await apiGet<Order[]>("/api/v1/admin/orders"));
  }

  useEffect(() => {
    void load().catch(() => {
      window.location.href = "/admin/login";
    });
  }, []);

  async function setStatus(id: string, status: Order["status"]) {
    await apiSend(`/api/v1/admin/orders/${id}`, "PATCH", { status });
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Заявки</h1>
      {orders.map((order) => (
        <article key={order.id} className="rounded-card bg-white p-5">
          <div className="mb-2 flex flex-wrap justify-between gap-2">
            <strong>{order.public_number}</strong>
            <select value={order.status} onChange={(e) => setStatus(order.id, e.target.value as Order["status"])}>
              <option value="new">новая</option>
              <option value="in_progress">в работе</option>
              <option value="closed">закрыта</option>
            </select>
          </div>
          <p>
            {order.customer_name} · {order.phone}
          </p>
          <p className="text-sm text-muted">{order.comment}</p>
          <ul className="mt-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.title} × {item.quantity} — {formatPrice(item.line_total)} ₽
              </li>
            ))}
          </ul>
          <p className="mt-2 font-semibold">Сумма: {formatPrice(order.total_snapshot)} ₽</p>
        </article>
      ))}
    </div>
  );
}
