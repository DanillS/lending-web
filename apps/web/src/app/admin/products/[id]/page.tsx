"use client";

import { apiGet, apiSend } from "@/lib/api";
import { Product, ProductType } from "@/lib/types";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const TYPES: { value: ProductType; label: string }[] = [
  { value: "door_leaf", label: "Дверь" },
  { value: "handle", label: "Ручка" },
  { value: "hinge", label: "Петли" },
  { value: "lock", label: "Замок" },
  { value: "frame", label: "Коробка" },
  { value: "casing", label: "Наличник" },
  { value: "extender", label: "Добор" },
  { value: "service", label: "Услуга" },
];

function specsToText(specs: Record<string, string> | undefined): string {
  return Object.entries(specs || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function parseSpecs(text: string): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf(":");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    const value = trimmed.slice(sep + 1).trim();
    if (key) specs[key] = value;
  }
  return specs;
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ProductType>("door_leaf");
  const [basePrice, setBasePrice] = useState(0);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("glass");
  const [popular, setPopular] = useState(false);
  const [specsText, setSpecsText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const p = await apiGet<Product>(`/api/v1/admin/products/${params.id}`, { cache: "no-store" });
    setProduct(p);
    setName(p.name);
    setType(p.type);
    setBasePrice(p.base_price);
    setDescription(p.description);
    setCategory(p.category || "glass");
    setPopular(p.popular);
    setSpecsText(specsToText(p.specs));
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  useEffect(() => {
    const uploadError = new URLSearchParams(window.location.search).get("uploadError");
    if (uploadError) setError(uploadError);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setError("");
    try {
      const updated = await apiSend<Product>(`/api/v1/admin/products/${product.id}`, "PUT", {
        name,
        type,
        base_price: basePrice,
        current_price: product.current_price,
        description,
        popular,
        category: type === "door_leaf" ? category : null,
        specs: parseSpecs(specsText),
      });
      setProduct(updated);
      setMessage("Сохранено");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  async function upload(file: File) {
    setError("");
    const body = new FormData();
    body.append("file", file);
    try {
      await apiSend(`/api/v1/admin/products/${params.id}/images`, "POST", body);
      await load();
      setMessage("Фото загружено");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка загрузки фото";
      setError(message);
    }
  }

  if (!product) return <p>Загрузка…</p>;

  return (
    <form onSubmit={save} className="max-w-xl space-y-4 rounded-card bg-white p-8">
      <h1 className="text-2xl font-bold">Редактирование</h1>
      <input className="w-full rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="block text-sm">
        Тип
        <select className="mt-1 w-full rounded-xl border px-3 py-2" value={type} onChange={(e) => setType(e.target.value as ProductType)}>
          {TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {type === "door_leaf" ? (
        <select className="w-full rounded-xl border px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="glass">Со стеклом</option>
          <option value="unglass">Без стекла</option>
        </select>
      ) : null}
      <label className="block text-sm">
        Базовая цена (первоначальная)
        <input
          type="number"
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={basePrice}
          onChange={(e) => setBasePrice(Number(e.target.value))}
        />
      </label>
      <textarea className="w-full rounded-xl border px-3 py-2" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
      <label className="block text-sm">
        Характеристики (каждая с новой строки: Покрытие: экошпон)
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2"
          rows={6}
          value={specsText}
          onChange={(e) => setSpecsText(e.target.value)}
        />
      </label>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={popular} onChange={(e) => setPopular(e.target.checked)} /> популярная
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
      />
      {product.images.length ? (
        <div className="flex flex-wrap gap-3">
          {product.images.map((image) => (
            <img key={image.id} src={image.url} alt={image.alt} className="h-40 object-contain" />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Фото ещё нет</p>
      )}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button className="btn btn-dark">Сохранить</button>
    </form>
  );
}
