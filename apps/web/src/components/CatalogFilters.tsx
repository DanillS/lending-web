"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function CatalogFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/catalog?${next.toString()}`);
  }

  const category = params.get("category") || "all";
  const sort = params.get("sort") || "name";
  const type = params.get("type") || "door_leaf";

  return (
    <div className="mb-8 space-y-4">
      <input
        defaultValue={params.get("q") || ""}
        placeholder="Поиск по названию"
        className="w-full rounded-pill border border-line px-5 py-3"
        onChange={(e) => {
          const value = e.target.value;
          window.clearTimeout((window as unknown as { t?: number }).t);
          (window as unknown as { t?: number }).t = window.setTimeout(() => set("q", value), 300);
        }}
      />
      <div className="flex flex-wrap gap-2">
        {[
          ["door_leaf", "Двери"],
          ["handle", "Ручки"],
          ["hinge", "Петли"],
          ["lock", "Замки"],
          ["frame", "Коробки"],
          ["casing", "Наличники"],
          ["service", "Услуги"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`rounded-pill px-4 py-2 text-sm ${type === value ? "bg-dark text-white" : "bg-wash"}`}
            onClick={() => set("type", value)}
          >
            {label}
          </button>
        ))}
      </div>
      {type === "door_leaf" ? (
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "Все"],
            ["glass", "Со стеклом"],
            ["unglass", "Без стекла"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`rounded-pill px-4 py-2 text-sm ${category === value ? "bg-dark text-white" : "bg-wash"}`}
              onClick={() => set("category", value === "all" ? "" : value)}
            >
              {label}
            </button>
          ))}
          <select
            className="rounded-pill border border-line px-4 py-2 text-sm"
            value={sort}
            onChange={(e) => set("sort", e.target.value)}
          >
            <option value="name">По названию</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
          </select>
        </div>
      ) : null}
    </div>
  );
}
