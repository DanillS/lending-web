"use client";

import { apiSend } from "@/lib/api";
import { ProductType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProductType>("door_leaf");
  const [basePrice, setBasePrice] = useState(5000);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("glass");
  const [specsText, setSpecsText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    let createdId: string | null = null;
    try {
      const product = await apiSend<{ id: string }>("/api/v1/admin/products", "POST", {
        name,
        type,
        base_price: basePrice,
        description,
        category: type === "door_leaf" ? category : null,
        specs: parseSpecs(specsText),
      });
      createdId = product.id;
      if (file) {
        const body = new FormData();
        body.append("file", file);
        try {
          await apiSend(`/api/v1/admin/products/${product.id}/images`, "POST", body);
        } catch (uploadErr) {
          const uploadMessage = uploadErr instanceof Error ? uploadErr.message : "Ошибка загрузки фото";
          router.push(`/admin/products/${product.id}?uploadError=${encodeURIComponent(uploadMessage)}`);
          return;
        }
      }
      router.push(`/admin/products/${product.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка";
      if (createdId) {
        router.push(`/admin/products/${createdId}?uploadError=${encodeURIComponent(message)}`);
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-card bg-white p-8">
      <h1 className="text-2xl font-bold">Новый товар</h1>
      <input
        required
        className="w-full rounded-xl border px-3 py-2"
        placeholder="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
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
      <input
        type="number"
        className="w-full rounded-xl border px-3 py-2"
        value={basePrice}
        onChange={(e) => setBasePrice(Number(e.target.value))}
      />
      <textarea
        className="w-full rounded-xl border px-3 py-2"
        rows={4}
        placeholder="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <label className="block text-sm">
        Характеристики (каждая с новой строки: Покрытие: экошпон)
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2"
          rows={5}
          placeholder={"Покрытие: экошпон\nСтиль оформления: современный"}
          value={specsText}
          onChange={(e) => setSpecsText(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Фото (webp, jpeg, png до 5 МБ)
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button className="btn btn-dark" disabled={busy}>
        {busy ? "Создание…" : "Создать"}
      </button>
    </form>
  );
}
