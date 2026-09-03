"use client";

import { apiGet, apiSend } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { Order } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const GROUPS: { status: Order["status"]; title: string; hint: string }[] = [
  { status: "new", title: "Новые", hint: "Ждут ответа" },
  { status: "in_progress", title: "В работе", hint: "Сейчас занимаемся" },
  { status: "closed", title: "Закрытые", hint: "Можно удалить" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    setOrders(await apiGet<Order[]>("/api/v1/admin/orders"));
  }

  useEffect(() => {
    void load().catch(() => {
      window.location.href = "/admin/login";
    });
    const id = window.setInterval(() => {
      void load().catch(() => {});
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  const grouped = useMemo(
    () => ({
      new: orders.filter((order) => order.status === "new"),
      in_progress: orders.filter((order) => order.status === "in_progress"),
      closed: orders.filter((order) => order.status === "closed"),
    }),
    [orders],
  );

  async function setStatus(id: string, status: Order["status"]) {
    await apiSend(`/api/v1/admin/orders/${id}`, "PATCH", { status });
    await load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Заявки</h1>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {GROUPS.map((group) => {
          const items = grouped[group.status];
          return (
            <section key={group.status} className="flex min-h-64 flex-col rounded-card border border-line bg-wash">
              <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div>
                  <h2 className="font-semibold">{group.title}</h2>
                  <p className="text-xs text-muted">{group.hint}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-muted">{items.length}</span>
              </header>
              <div className="max-h-[calc(100vh-16rem)] space-y-3 overflow-y-auto p-3">
                {items.length === 0 ? (
                  <p className="px-1 py-8 text-center text-sm text-muted">Пока пусто</p>
                ) : (
                  items.map((order) => <OrderCard key={order.id} order={order} onStatus={setStatus} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
}: {
  order: Order;
  onStatus: (id: string, status: Order["status"]) => void;
}) {
  const closed = order.status === "closed";
  const extra = Math.max(0, order.items.length - 3);
  return (
    <article className={`relative rounded-xl border border-line bg-white p-3.5 ${closed ? "opacity-50" : ""}`}>
      <Link
        href={`/admin/orders/${order.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`Открыть заявку ${order.public_number}`}
      />
      <div className="relative mb-2 flex items-start justify-between gap-2">
        <div>
          <strong className="text-sm">{order.public_number}</strong>
          <p className="mt-0.5 text-xs text-muted">{formatDateTime(order.created_at)}</p>
        </div>
        <select
          className="relative z-10 max-w-[9.5rem] rounded-md border border-line bg-wash px-2 py-1 text-xs"
          value={order.status}
          onChange={(e) => onStatus(order.id, e.target.value as Order["status"])}
        >
          <option value="new">новая</option>
          <option value="in_progress">в работе</option>
          <option value="closed">закрыта</option>
        </select>
      </div>
      <p className="text-sm">
        {order.customer_name} · {order.phone}
      </p>
      {order.address ? <p className="mt-1 line-clamp-2 text-xs text-muted">{order.address}</p> : null}
      {order.comment ? <p className="mt-1 line-clamp-2 text-xs text-muted">{order.comment}</p> : null}
      <ul className="mt-2 space-y-0.5 text-xs text-muted">
        {order.items.slice(0, 3).map((item) => (
          <li key={item.id}>
            {item.title} × {item.quantity}
          </li>
        ))}
        {extra > 0 ? <li>ещё {extra}</li> : null}
      </ul>
      <p className="mt-3 text-sm font-semibold">{formatPrice(order.total_snapshot)} ₽</p>
    </article>
  );
}
