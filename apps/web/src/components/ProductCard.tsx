"use client";

import { apiSend } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { Product } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

const CTA: Record<string, string> = {
  door_leaf: "Собрать комплект",
  handle: "В корзину",
  hinge: "В корзину",
  lock: "В корзину",
  frame: "В корзину",
  casing: "В корзину",
  extender: "В корзину",
  service: "В корзину",
};

export function ProductCard({ product }: { product: Product }) {
  const [flipped, setFlipped] = useState(false);
  const [added, setAdded] = useState(false);
  const { refresh } = useCart();
  const isDoor = product.type === "door_leaf";
  const image = product.images[0]?.url || "/images/placeholder.svg";
  const specEntries = Object.entries(product.specs || {});

  function toggle(event: React.MouseEvent) {
    if ((event.target as HTMLElement).closest("a, button")) return;
    setFlipped((value) => !value);
  }

  async function addAccessory(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    await apiSend("/api/v1/cart/items", "POST", {
      product_id: product.id,
      quantity: 1,
      config: {
        product_id: product.id,
        size: "800x2000",
        opening: "left",
        kit: "leaf_only",
        wall_thickness_mm: 100,
        hardware: "none",
        services: [],
        quantity: 1,
      },
    });
    setAdded(true);
    await refresh();
  }

  return (
    <article className="flip-scene">
      <div className={`flip-card ${flipped ? "is-flipped" : ""}`} onClick={toggle}>
        <div className="flip-face flip-front">
          <div className="h-60 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url('${image}')` }} />
          <div className="flex flex-1 flex-col p-5">
            <h3 className="mb-2 text-xl font-bold">{product.name}</h3>
            <p className="mb-3 text-2xl font-semibold text-primary">
              от {formatPrice(product.current_price)} ₽
              {product.old_price ? (
                <span className="ml-2 text-base font-normal text-muted line-through">
                  {formatPrice(product.old_price)} ₽
                </span>
              ) : null}
            </p>
            <p className="mb-4 line-clamp-3 text-sm text-muted">{product.description}</p>
            <p className="mb-4 text-xs text-muted">Нажмите на карточку — характеристики</p>
            {isDoor ? (
              <Link href={`/product/${product.slug}`} className="btn btn-dark mt-auto !px-8 !py-3 text-sm">
                {CTA.door_leaf}
              </Link>
            ) : (
              <button type="button" className="btn btn-dark mt-auto !px-8 !py-3 text-sm" onClick={addAccessory}>
                {added ? "Добавлено" : CTA[product.type] || "В корзину"}
              </button>
            )}
          </div>
        </div>
        <div className="flip-face flip-back">
          <div className="flex h-full flex-col p-5">
            <h3 className="mb-3 border-b-2 border-primary pb-2 text-lg font-bold">Характеристики</h3>
            <div className="flex-1 overflow-auto pr-1">
              {specEntries.length ? (
                specEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3 border-b border-line py-2 text-sm">
                    <span className="text-muted">{key}</span>
                    <span className="text-right font-medium">{value}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">{product.description || "Характеристики появятся после заполнения в админке."}</p>
              )}
            </div>
            {isDoor ? (
              <Link href={`/product/${product.slug}`} className="btn btn-dark mt-4 !px-8 !py-3 text-sm">
                Собрать комплект
              </Link>
            ) : (
              <button type="button" className="btn btn-dark mt-4 !px-8 !py-3 text-sm" onClick={addAccessory}>
                {added ? "Добавлено" : "В корзину"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
