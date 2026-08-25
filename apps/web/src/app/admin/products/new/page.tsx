"use client";

import { apiSend } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState(5000);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("glass");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const product = await apiSend<{ id: string }>("/api/v1/admin/products", "POST", {
        name,
        type: "door_leaf",
        base_price: basePrice,
        description,
        category,
      });
      router.push(`/admin/products/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-card bg-white p-8">
      <h1 className="text-2xl font-bold">Новая дверь</h1>
      <input required className="w-full rounded-xl border px-3 py-2" placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
      <input type="number" className="w-full rounded-xl border px-3 py-2" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} />
      <select className="w-full rounded-xl border px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="glass">Со стеклом</option>
        <option value="unglass">Без стекла</option>
      </select>
      <textarea className="w-full rounded-xl border px-3 py-2" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button className="btn btn-dark">Создать</button>
    </form>
  );
}
