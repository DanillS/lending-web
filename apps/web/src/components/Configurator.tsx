"use client";

import { apiGet, apiSend } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { Product, Quote, QuoteConfig } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

const defaultDoorConfig = (productId: string): QuoteConfig => ({
  product_id: productId,
  size: "800x2000",
  opening: "left",
  kit: "standard_block",
  wall_thickness_mm: 100,
  hardware: "none",
  handle_id: null,
  services: [],
  quantity: 1,
});

export function Configurator({ product }: { product: Product }) {
  if (product.type !== "door_leaf") {
    return <AccessoryBuy product={product} />;
  }
  return <DoorKit product={product} />;
}

function AccessoryBuy({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const { refresh } = useCart();

  async function addToCart() {
    setBusy(true);
    setError("");
    try {
      await apiSend("/api/v1/cart/items", "POST", {
        product_id: product.id,
        quantity: qty,
        config: {
          product_id: product.id,
          size: "800x2000",
          opening: "left",
          kit: "leaf_only",
          wall_thickness_mm: 100,
          hardware: "none",
          services: [],
          quantity: qty,
        },
      });
      setAdded(true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-white p-6 shadow-[0_12px_24px_rgba(0,0,0,0.05)]">
      <h2 className="mb-2 text-xl font-bold">{product.type === "service" ? "Заказать услугу" : "Купить отдельно"}</h2>
      <p className="mb-4 text-sm text-muted">
        {product.type === "service"
          ? "Услугу можно добавить к заявке отдельно или вместе с дверью."
          : "Фурнитуру и погонаж обычно удобнее собирать в комплекте на карточке двери."}
      </p>
      <p className="mb-4 text-2xl font-bold">{formatPrice(product.current_price * qty)} ₽</p>
      <label className="mb-4 block text-sm">
        Количество
        <input
          type="number"
          min={1}
          max={50}
          className="mt-1 w-full rounded-xl border border-line px-3 py-2"
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
        />
      </label>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {added ? (
        <p className="mb-3 text-sm text-green-700">
          Добавлено. <a href="/cart">Перейти в корзину</a>
        </p>
      ) : null}
      <button type="button" className="btn btn-dark w-full" disabled={busy} onClick={addToCart}>
        {busy ? "Добавляем…" : "В корзину"}
      </button>
      <a href="/catalog" className="mt-4 block text-center text-sm text-muted">
        К каталогу дверей
      </a>
    </div>
  );
}

function DoorKit({ product }: { product: Product }) {
  const [config, setConfig] = useState<QuoteConfig>(defaultDoorConfig(product.id));
  const [quote, setQuote] = useState<Quote | null>(null);
  const [handles, setHandles] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const { refresh } = useCart();
  const payload = useMemo(() => config, [config]);

  useEffect(() => {
    void apiGet<{ items: Product[] }>("/api/v1/handles")
      .then((data) => setHandles(data.items))
      .catch(() => setHandles([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const data = await apiSend<Quote>("/api/v1/quote", "POST", payload);
        setQuote(data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка расчёта");
      }
    }, 200);
    return () => clearTimeout(t);
  }, [payload]);

  async function addToCart() {
    setBusy(true);
    setError("");
    try {
      await apiSend("/api/v1/cart/items", "POST", {
        product_id: product.id,
        quantity: config.quantity,
        config,
      });
      setAdded(true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить");
    } finally {
      setBusy(false);
    }
  }

  function toggleService(key: string) {
    setConfig((c) => ({
      ...c,
      services: c.services.includes(key) ? c.services.filter((s) => s !== key) : [...c.services, key],
    }));
  }

  return (
    <div className="rounded-card border border-line bg-white p-6 shadow-[0_12px_24px_rgba(0,0,0,0.05)]">
      <h2 className="mb-4 text-xl font-bold">Собрать комплект</h2>
      <p className="mb-4 text-sm text-muted">
        Цена в каталоге — за полотно 800×2000. Ширина 900 мм даёт наценку на полотно. Ниже считается блок под проём.
      </p>

      <label className="mb-3 block text-sm font-medium">
        Размер полотна
        <select
          className="mt-1 w-full rounded-xl border border-line px-3 py-2"
          value={config.size}
          onChange={(e) => setConfig({ ...config, size: e.target.value })}
        >
          <option value="600x2000">600×2000</option>
          <option value="700x2000">700×2000</option>
          <option value="800x2000">800×2000 (базовая цена)</option>
          <option value="900x2000">900×2000 (+12% к полотну)</option>
        </select>
      </label>

      <label className="mb-3 block text-sm font-medium">
        Количество комплектов
        <input
          type="number"
          min={1}
          max={50}
          className="mt-1 w-full rounded-xl border border-line px-3 py-2"
          value={config.quantity}
          onChange={(e) => setConfig({ ...config, quantity: Math.max(1, Number(e.target.value) || 1) })}
        />
      </label>

      <fieldset className="mb-3">
        <legend className="text-sm font-medium">Открывание</legend>
        <div className="mt-1 flex gap-3">
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              type="button"
              className={`rounded-pill px-4 py-2 text-sm ${config.opening === side ? "bg-dark text-white" : "bg-wash"}`}
              onClick={() => setConfig({ ...config, opening: side })}
            >
              {side === "left" ? "Левое" : "Правое"}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-3">
        <legend className="text-sm font-medium">Комплект</legend>
        {(
          [
            ["leaf_only", "Только полотно"],
            ["standard_block", "Полотно + коробка 2.5 + наличник 5"],
            ["block_plus_extenders", "Блок + доборы"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="mt-1 flex items-start gap-2 text-sm">
            <input type="radio" checked={config.kit === value} onChange={() => setConfig({ ...config, kit: value })} />
            {label}
          </label>
        ))}
      </fieldset>

      {config.kit === "block_plus_extenders" ? (
        <label className="mb-3 block text-sm">
          Толщина стены, мм
          <input
            type="number"
            min={50}
            max={400}
            className="mt-1 w-full rounded-xl border border-line px-3 py-2"
            value={config.wall_thickness_mm}
            onChange={(e) => setConfig({ ...config, wall_thickness_mm: Number(e.target.value) })}
          />
        </label>
      ) : null}

      <fieldset className="mb-3">
        <legend className="text-sm font-medium">Фурнитура</legend>
        {(
          [
            ["none", "Без фурнитуры"],
            ["minimal", "Минимальный: 2 петли + ручка + защёлка"],
            ["hidden_hinges", "Скрытые петли + ручка + защёлка"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="mt-1 flex items-start gap-2 text-sm">
            <input
              type="radio"
              checked={config.hardware === value}
              onChange={() =>
                setConfig({
                  ...config,
                  hardware: value,
                  handle_id: value === "none" ? null : config.handle_id,
                })
              }
            />
            {label}
          </label>
        ))}
      </fieldset>

      {config.hardware !== "none" && handles.length ? (
        <label className="mb-3 block text-sm">
          Ручка
          <select
            className="mt-1 w-full rounded-xl border border-line px-3 py-2"
            value={config.handle_id || ""}
            onChange={(e) => setConfig({ ...config, handle_id: e.target.value || null })}
          >
            <option value="">Ручка стандарт</option>
            {handles.map((handle) => (
              <option key={handle.id} value={handle.id}>
                {handle.name} — {formatPrice(handle.current_price)} ₽
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <fieldset className="mb-4">
        <legend className="text-sm font-medium">Услуги</legend>
        {[
          ["install", "Установка"],
          ["delivery", "Доставка по Казани"],
          ["cutting", "Врезка фурнитуры"],
        ].map(([key, label]) => (
          <label key={key} className="mt-1 flex gap-2 text-sm">
            <input type="checkbox" checked={config.services.includes(key)} onChange={() => toggleService(key)} />
            {label}
          </label>
        ))}
      </fieldset>

      <ul className="mb-4 space-y-1 text-sm">
        {quote?.lines.map((line) => (
          <li key={`${line.sku}-${line.title}`} className="flex justify-between gap-4">
            <span>
              {line.title} × {line.quantity}
            </span>
            <span>{formatPrice(line.line_total)} ₽</span>
          </li>
        ))}
      </ul>
      <p className="mb-4 text-2xl font-bold">Итого: {formatPrice(quote?.total ?? product.current_price)} ₽</p>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {added ? (
        <p className="mb-3 text-sm text-green-700">
          Добавлено. <a href="/cart">Перейти в корзину</a>
        </p>
      ) : null}
      <button type="button" className="btn btn-dark w-full" disabled={busy || !quote} onClick={addToCart}>
        {busy ? "Добавляем…" : "В корзину"}
      </button>
    </div>
  );
}
