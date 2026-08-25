"use client";

import { apiGet, apiSend } from "@/lib/api";
import { Product } from "@/lib/types";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [description, setDescription] = useState("");
  const [popular, setPopular] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void apiGet<Product>(`/api/v1/admin/products/${params.id}`).then((p) => {
      setProduct(p);
      setName(p.name);
      setBasePrice(p.base_price);
      setDescription(p.description);
      setPopular(p.popular);
    });
  }, [params.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    await apiSend(`/api/v1/admin/products/${product.id}`, "PUT", {
      name,
      type: product.type,
      base_price: basePrice,
      current_price: product.current_price,
      description,
      popular,
      category: product.category,
      specs: product.specs,
    });
    setMessage("Сохранено");
  }

  async function upload(file: File) {
    const body = new FormData();
    body.append("file", file);
    await apiSend(`/api/v1/admin/products/${params.id}/images`, "POST", body);
    setMessage("Фото загружено");
  }

  if (!product) return <p>Загрузка…</p>;

  return (
    <form onSubmit={save} className="max-w-xl space-y-4 rounded-card bg-white p-8">
      <h1 className="text-2xl font-bold">Редактирование</h1>
      <input className="w-full rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="block text-sm">
        Базовая цена (первоначальная)
        <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} />
      </label>
      <textarea className="w-full rounded-xl border px-3 py-2" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
      <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={popular} onChange={(e) => setPopular(e.target.checked)} /> популярная
      </label>
      <input
        type="file"
        accept="image/webp,image/jpeg,image/png"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {product.images[0] ? <img src={product.images[0].url} alt="" className="h-40 object-contain" /> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      <button className="btn btn-dark">Сохранить</button>
    </form>
  );
}
