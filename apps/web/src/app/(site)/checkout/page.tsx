"use client";

import { apiGet, apiSend } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatPrice, newIdempotencyKey } from "@/lib/format";
import { Cart, SiteInfo } from "@/lib/types";
import { useEffect, useState } from "react";

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const { refresh } = useCart();

  useEffect(() => {
    void apiGet<Cart>("/api/v1/cart").then(setCart).catch(() => null);
    void apiGet<SiteInfo>("/api/v1/site").then(setSite).catch(() => null);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const order = await apiSend<{ public_number: string }>("/api/v1/orders", "POST", {
        name,
        phone,
        comment,
        consent,
        honeypot,
        idempotency_key: newIdempotencyKey(),
      });
      setDone(order.public_number);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="container-site py-20 text-center">
        <h1 className="text-3xl font-bold">Заявка {done} принята</h1>
        <p className="mt-4 text-muted">Мы перезвоним в течение 15 минут.</p>
      </div>
    );
  }

  return (
    <div className="container-site grid gap-12 py-12 lg:grid-cols-2">
      <div>
        <h1 className="mb-6 text-3xl font-bold">Оставить заявку</h1>
        <p className="mb-8 text-muted">
          Менеджер перезвонит и подтвердит состав, доставку и установку. Онлайн-оплата не требуется.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={site?.whatsapp} className="btn bg-[#25D366] text-white" target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a href={site?.telegram} className="btn bg-[#26A5E4] text-white" target="_blank" rel="noreferrer">
            Telegram
          </a>
          <a href={`mailto:${site?.email}`} className="btn bg-primary text-white">
            Email
          </a>
        </div>
        {cart?.items.length ? (
          <div className="mt-10 rounded-card border border-line p-6">
            <h2 className="mb-3 font-bold">Состав корзины</h2>
            {cart.items.map((item) => (
              <p key={item.id} className="flex justify-between text-sm">
                <span>{item.label}</span>
                <span>{formatPrice(item.quoted_total)} ₽</span>
              </p>
            ))}
            <p className="mt-3 font-bold">Итого {formatPrice(cart.total)} ₽</p>
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted">Можно отправить заявку без корзины — укажите модель в комментарии.</p>
        )}
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-card border border-line p-8">
        <input className="hidden" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} />
        <input
          required
          minLength={2}
          placeholder="Ваше имя *"
          className="w-full rounded-xl border border-line px-4 py-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          required
          placeholder="Телефон * +7..."
          className="w-full rounded-xl border border-line px-4 py-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <textarea
          rows={4}
          placeholder="Комментарий"
          className="w-full rounded-xl border border-line px-4 py-3"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          Согласен на обработку персональных данных. См. <a href="/legal">политику</a>.
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="btn btn-dark w-full" disabled={busy}>
          {busy ? "Отправка…" : "Отправить заявку"}
        </button>
      </form>
    </div>
  );
}
