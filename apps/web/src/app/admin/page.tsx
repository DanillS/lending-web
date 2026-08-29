"use client";

import { apiGet, apiSend } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { livePricePreview, selectedProductIds } from "@/lib/pricePreview";
import { Product, ProductList } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [type, setType] = useState("door_leaf");
  const [percent, setPercent] = useState(-10);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [lastBatch, setLastBatch] = useState<{
    percent: number;
    count: number;
    batch_count: number;
    filtered: boolean;
    rows: { id: string; name: string; current_price: number; restore_price: number }[];
  } | null>(null);
  const [lastBatchError, setLastBatchError] = useState("");
  const [undoIds, setUndoIds] = useState<string[] | null>(null);

  async function load() {
    const query = new URLSearchParams({ page_size: "100", type, q });
    const data = await apiGet<ProductList>(`/api/v1/admin/products?${query}`);
    setItems(data.items);
  }

  useEffect(() => {
    setSelected({});
    setSelectAll(false);
    void load().catch(async () => {
      try {
        await apiSend("/api/v1/admin/refresh", "POST");
        await load();
      } catch {
        window.location.href = "/admin/login";
      }
    });
  }, [q, type]);

  const ids = useMemo(() => selectedProductIds(selected), [selected]);
  const shownPreview = useMemo(
    () => livePricePreview(items, selected, selectAll, percent),
    [items, selected, selectAll, percent],
  );

  async function apply() {
    try {
      const data = await apiSend<{ updated: number }>("/api/v1/admin/prices/apply", "POST", {
        product_ids: ids,
        select_all: selectAll,
        product_type: selectAll ? type : null,
        percent,
      });
      setMessage(`Обновлено: ${data.updated}`);
      setError("");
      setSelected({});
      setSelectAll(false);
      await load();
    } catch (err) {
      setMessage("");
      setError(err instanceof Error ? err.message : "Не удалось применить");
    }
  }

  async function openUndo() {
    const scoped = !selectAll && ids.length > 0 ? ids : null;
    setUndoIds(scoped);
    setConfirmUndo(true);
    setLastBatch(null);
    setLastBatchError("");
    try {
      const query = new URLSearchParams();
      if (scoped) {
        for (const id of scoped) query.append("product_ids", id);
      }
      const suffix = query.toString() ? `?${query}` : "";
      const data = await apiGet<{
        percent: number;
        count: number;
        batch_count: number;
        filtered: boolean;
        rows: { id: string; name: string; current_price: number; restore_price: number }[];
      }>(`/api/v1/admin/prices/last${suffix}`);
      setLastBatch(data);
    } catch (err) {
      setLastBatchError(err instanceof Error ? err.message : "Нет пересчёта для отмены");
    }
  }

  function closeUndo() {
    if (!undoing) {
      setConfirmUndo(false);
      setLastBatch(null);
      setLastBatchError("");
      setUndoIds(null);
    }
  }

  async function undo() {
    setUndoing(true);
    try {
      const data = await apiSend<{ restored: number }>("/api/v1/admin/prices/undo", "POST", {
        product_ids: undoIds ?? [],
      });
      setMessage(`Откат: ${data.restored}`);
      setError("");
      setConfirmUndo(false);
      setUndoIds(null);
      await load();
    } catch (err) {
      setMessage("");
      setError(err instanceof Error ? err.message : "Не удалось отменить");
      setConfirmUndo(false);
      setUndoIds(null);
    } finally {
      setUndoing(false);
    }
  }

  function toggleSelectAll(on: boolean) {
    setSelectAll(on);
    setSelected(on ? Object.fromEntries(items.map((item) => [item.id, true])) : {});
  }

  function toggleRow(itemId: string, checked: boolean) {
    if (selectAll && !checked) {
      setSelectAll(false);
      setSelected(Object.fromEntries(items.map((item) => [item.id, item.id !== itemId])));
      return;
    }
    setSelected((s) => ({ ...s, [itemId]: checked }));
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
          <input type="checkbox" checked={selectAll} onChange={(e) => toggleSelectAll(e.target.checked)} /> все по фильтру
        </label>
        <input
          type="number"
          className="w-24 rounded-xl border px-3 py-2"
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
        />
        <span className="text-sm text-muted">% от базовой цены</span>
        <button className="btn btn-dark !px-5 !py-2 text-sm" disabled={percent === 0 || !shownPreview} onClick={apply}>
          Применить
        </button>
        <button className="text-sm text-red-800" type="button" onClick={() => void openUndo()}>
          {!selectAll && ids.length > 0 ? "Отменить пересчёт у выбранных" : "Отменить последний пересчёт"}
        </button>
      </div>
      {confirmUndo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="presentation"
          onClick={closeUndo}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="undo-title"
            className="w-full max-w-lg rounded-card bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="undo-title" className="text-lg font-semibold">
              {lastBatch?.filtered ? "Отменить пересчёт у выбранных?" : "Отменить последний пересчёт?"}
            </p>
            {lastBatchError ? (
              <p className="mt-2 text-sm text-red-700">{lastBatchError}</p>
            ) : lastBatch ? (
              <>
                <p className="mt-2 text-sm text-muted">
                  {lastBatch.filtered
                    ? `Только выбранные: ${lastBatch.count} из ${lastBatch.batch_count} в последнем пересчёте (${lastBatch.percent > 0 ? "+" : ""}${lastBatch.percent}%).`
                    : `Вернуть цены у ${lastBatch.count} поз. после ${lastBatch.percent > 0 ? "+" : ""}${lastBatch.percent}% к значениям до пересчёта.`}
                </p>
                <div className="mt-3 max-h-56 overflow-y-auto text-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-muted">
                        <th className="py-1 pr-2">Товар</th>
                        <th className="py-1 pr-2">Сейчас</th>
                        <th className="py-1">Станет</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastBatch.rows.map((row) => (
                        <tr key={row.id}>
                          <td className="py-1 pr-2">{row.name}</td>
                          <td className="py-1 pr-2">{formatPrice(row.current_price)}</td>
                          <td className="py-1">{formatPrice(row.restore_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Загружаем список…</p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button className="btn btn-outline !px-5 !py-2 text-sm" type="button" disabled={undoing} onClick={closeUndo}>
                Оставить как есть
              </button>
              <button
                className="btn btn-dark !px-5 !py-2 text-sm"
                type="button"
                disabled={undoing || !lastBatch}
                onClick={() => void undo()}
              >
                {undoing ? "Отменяем…" : "Да, отменить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {message ? <p className="mb-4 text-sm text-green-700">{message}</p> : null}
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      {shownPreview ? (
        <div className="mb-6 max-h-80 overflow-y-auto rounded-card bg-white p-4 text-sm">
          <p className="mb-2 font-semibold">Будет обновлено: {shownPreview.count}</p>
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
              {shownPreview.rows.map((row) => (
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
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectAll || !!selected[item.id]}
                    onChange={(e) => toggleRow(item.id, e.target.checked)}
                  />
                </td>
                <td className="p-3">
                  <Link href={`/admin/products/${item.id}`} className="hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td className="p-3">{formatPrice(item.base_price)}</td>
                <td className="p-3">{formatPrice(item.current_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
