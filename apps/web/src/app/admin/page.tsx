"use client";

import { apiGet, apiSend } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Product, ProductList } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Preview = {
  count: number;
  rows: { id: string; name: string; base_price: number; current_price: number; new_price: number }[];
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [type, setType] = useState("door_leaf");
  const [percent, setPercent] = useState(-10);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  async function load() {
    const query = new URLSearchParams({ page_size: "100", type, q });
    const data = await apiGet<ProductList>(`/api/v1/admin/products?${query}`);
    setItems(data.items);
  }

  useEffect(() => {
    void load().catch(async () => {
      try {
        await apiSend("/api/v1/admin/refresh", "POST");
        await load();
      } catch {
        window.location.href = "/admin/login";
      }
    });
  }, [q, type]);

  const ids = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([id]) => id), [selected]);

  async function doPreview() {
    const data = await apiSend<Preview>("/api/v1/admin/prices/preview", "POST", {
      product_ids: ids,
      select_all: selectAll,
      product_type: selectAll ? type : null,
      percent,
    });
    setPreview(data);
    setMessage("");
  }

  async function apply() {
    const data = await apiSend<{ updated: number }>("/api/v1/admin/prices/apply", "POST", {
      product_ids: ids,
      select_all: selectAll,
      product_type: selectAll ? type : null,
      percent,
    });
    setMessage(`Обновлено: ${data.updated}`);
    setPreview(null);
    await load();
  }

  async function undo() {
    const data = await apiSend<{ restored: number }>("/api/v1/admin/prices/undo", "POST");
    setMessage(`Откат: ${data.restored}`);
    await load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <input
          placeholder="Поиск"
          className="rounded-xl border px-3 py-2"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="rounded-xl border px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="door_leaf">Двери</option>
          <option value="handle">Ручки</option>
          <option value="hinge">Петли</option>
          <option value="lock">Замки</option>
          <option value="frame">Коробки</option>
          <option value="casing">Наличники</option>
          <option value="service">Услуги</option>
        </select>
        <label className="text-sm">
          <input type="checkbox" checked={selectAll} onChange={(e) => setSelectAll(e.target.checked)} /> все по фильтру
        </label>
        <input
          type="number"
          className="w-24 rounded-xl border px-3 py-2"
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
        />
        <span className="text-sm text-muted">% от базовой цены</span>
        <button className="btn btn-outline !px-5 !py-2 text-sm" disabled={percent === 0} onClick={doPreview}>
          Превью
        </button>
        <button className="btn btn-dark !px-5 !py-2 text-sm" disabled={percent === 0 || !preview} onClick={apply}>
          Применить
        </button>
        <button className="text-sm" onClick={undo}>
          Отменить последний пересчёт
        </button>
      </div>
      {message ? <p className="mb-4 text-sm text-green-700">{message}</p> : null}
      {preview ? (
        <div className="mb-6 rounded-card bg-white p-4 text-sm">
          <p className="mb-2 font-semibold">Будет обновлено: {preview.count}</p>
          <table className="w-full">
            <thead>
              <tr className="text-left text-muted">
                <th>Товар</th>
                <th>База</th>
                <th>Сейчас</th>
                <th>Станет</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{formatPrice(row.base_price)}</td>
                  <td>{formatPrice(row.current_price)}</td>
                  <td>{formatPrice(row.new_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-card bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3"></th>
              <th className="p-3">Название</th>
              <th className="p-3">База</th>
              <th className="p-3">Текущая</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={!!selected[item.id]}
                    onChange={(e) => setSelected((s) => ({ ...s, [item.id]: e.target.checked }))}
                  />
                </td>
                <td className="p-3">{item.name}</td>
                <td className="p-3">{formatPrice(item.base_price)}</td>
                <td className="p-3">{formatPrice(item.current_price)}</td>
                <td className="p-3">
                  <Link href={`/admin/products/${item.id}`}>Изменить</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
