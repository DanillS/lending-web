"use client";

import { apiGet, apiSend } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { Order } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CONFIG_LABELS: Record<string, string> = {
  size: "Размер",
  opening: "Открывание",
  kit: "Комплект",
  wall_thickness_mm: "Толщина стены, мм",
  hardware: "Фурнитура",
};

const CONFIG_VALUES: Record<string, string> = {
  left: "левое",
  right: "правое",
  leaf_only: "полотно",
  standard_block: "стандартный блок",
  block_plus_extenders: "блок + доборы",
  none: "нет",
  minimal: "минимальная",
  hidden_hinges: "скрытые петли",
};

const SKIP_CONFIG = new Set(["product_id", "handle_id", "quantity", "services"]);

export default function AdminOrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setOrder(await apiGet<Order>(`/api/v1/admin/orders/${params.id}`));
  }

  useEffect(() => {
    void load().catch((err) => {
      if (err instanceof Error && "status" in err && (err as { status: number }).status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Не найдено");
    });
  }, [params.id]);

  async function setStatus(status: Order["status"]) {
    if (!order) return;
    const updated = await apiSend<Order>(`/api/v1/admin/orders/${order.id}`, "PATCH", { status });
    setOrder(updated);
  }

  async function confirmDelete() {
    if (!order) return;
    setDeleting(true);
    try {
      await apiSend(`/api/v1/admin/orders/${order.id}`, "DELETE");
      router.push("/admin/orders");
    } finally {
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <div>
        <Link href="/admin/orders" className="text-sm text-muted">
          ← К заявкам
        </Link>
        <p className="mt-6 text-red-700">{error}</p>
      </div>
    );
  }

  if (!order) {
    return <p className="text-sm text-muted">Загружаем…</p>;
  }

  const closed = order.status === "closed";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/orders" className="text-sm text-muted">
        ← К заявкам
      </Link>
      <div className={`mt-5 rounded-card bg-white p-6 ${closed ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{order.public_number}</h1>
            <p className="mt-1 text-sm text-muted">{formatDateTime(order.created_at)}</p>
          </div>
          <select
            className="rounded-md border border-line bg-wash px-3 py-2 text-sm"
            value={order.status}
            onChange={(e) => void setStatus(e.target.value as Order["status"])}
          >
            <option value="new">новая</option>
            <option value="in_progress">в работе</option>
            <option value="closed">закрыта</option>
          </select>
        </div>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Имя</dt>
            <dd className="font-medium">{order.customer_name}</dd>
          </div>
          <div>
            <dt className="text-muted">Телефон</dt>
            <dd>
              <a className="font-medium" href={`tel:${order.phone}`}>
                {order.phone}
              </a>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Адрес</dt>
            <dd className="font-medium">{order.address || "не указан"}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <p className="text-sm text-muted">Комментарий</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{order.comment || "нет"}</p>
        </div>
        <OrderConfig items={order.items} />
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="py-2 pr-3">Позиция</th>
                <th className="py-2 pr-3">Кол-во</th>
                <th className="py-2 pr-3">Цена</th>
                <th className="py-2">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b align-top">
                  <td className="py-2 pr-3">{item.title}</td>
                  <td className="py-2 pr-3">{item.quantity}</td>
                  <td className="py-2 pr-3">{formatPrice(item.unit_price)} ₽</td>
                  <td className="py-2">{formatPrice(item.line_total)} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-lg font-semibold">Итого: {formatPrice(order.total_snapshot)} ₽</p>
        {closed ? (
          <button type="button" className="mt-6 text-sm text-red-800" onClick={() => setPendingDelete(true)}>
            Удалить заявку
          </button>
        ) : null}
      </div>
      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="presentation"
          onClick={() => !deleting && setPendingDelete(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-order-title"
            className="w-full max-w-md rounded-card bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="delete-order-title" className="text-lg font-semibold">
              Точно удалить заявку?
            </p>
            <p className="mt-2 text-sm text-muted">
              {order.public_number} будет удалена без возможности восстановления.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                className="btn btn-outline !px-5 !py-2 text-sm"
                type="button"
                disabled={deleting}
                onClick={() => setPendingDelete(false)}
              >
                Оставить
              </button>
              <button
                className="btn btn-dark !px-5 !py-2 text-sm"
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? "Удаляем…" : "Да, удалить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OrderConfig({ items }: { items: Order["items"] }) {
  const config = items.find((item) => item.config_json && (item.config_json.size || item.config_json.kit))?.config_json;
  if (!config) return null;
  const rows = Object.entries(config).filter(([key, value]) => value != null && value !== "" && !SKIP_CONFIG.has(key));
  if (!rows.length) return null;
  return (
    <div className="mt-4">
      <p className="text-sm text-muted">Комплектация</p>
      <ul className="mt-1 text-sm">
        {rows.map(([key, value]) => (
          <li key={key}>
            {CONFIG_LABELS[key] || key}: {CONFIG_VALUES[String(value)] || String(value)}
          </li>
        ))}
      </ul>
    </div>
  );
}
