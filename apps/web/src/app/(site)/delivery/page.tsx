export const metadata = {
  title: "Доставка и установка дверей в Казани",
  description: "Доставка межкомнатных дверей по Казани за 1–2 дня. Установка под ключ, врезка фурнитуры.",
  alternates: { canonical: "/delivery" },
};

export const dynamic = "force-dynamic";

export default function DeliveryPage() {
  return (
    <article className="container-site max-w-3xl py-12">
      <h1 className="mb-6 text-3xl font-bold">Доставка и установка в Казани</h1>
      <p className="mb-4 text-muted">
        Привозим полотна и погонаж по Казани за 1–2 дня. Установка — сборка коробки, навес полотна, наличники, врезка
        петель и защёлки. Гарантия на монтаж — 1 год.
      </p>
      <p className="text-muted">
        Доборы нужны, если стена толще коробки. Это можно сразу заложить в конфигураторе на карточке двери.
      </p>
    </article>
  );
}
