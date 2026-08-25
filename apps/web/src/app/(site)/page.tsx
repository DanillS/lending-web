import { apiGet } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { GoldIcon } from "@/components/HomeIcons";
import { FaqAccordion } from "@/components/FaqAccordion";
import { ProductList, SiteInfo } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let popular: ProductList = { items: [], total: 0, page: 1, page_size: 24 };
  let site: SiteInfo | null = null;
  try {
    popular = await apiGet<ProductList>("/api/v1/products?popular=true&page_size=8", { cache: "no-store" });
    site = await apiGet<SiteInfo>("/api/v1/site", { cache: "no-store" });
  } catch {
    site = {
      name: "Качественные двери",
      phone: "",
      whatsapp: "https://wa.me/79503101560",
      telegram: "https://t.me/pr0gger/",
      email: "stepanovpg@gmail.com",
      city: "Казань",
      reviews: [],
      faq: [],
    };
  }

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (site?.faq || []).map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <section className="container-site grid items-center gap-12 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-[3.2rem] font-bold leading-tight tracking-tight">Двери, которые вдохновляют</h1>
          <p className="mt-6 text-lg text-muted">
            Качественные межкомнатные двери в Казани. Полотно, коробка, наличники и фурнитура — соберите комплект и
            оставьте заявку.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/catalog" className="btn btn-dark">
              Выбрать дверь
            </Link>
            <Link href="/checkout" className="btn btn-outline">
              Связаться с нами
            </Link>
          </div>
        </div>
        <div
          className="min-h-[380px] rounded-[32px] bg-wash bg-cover bg-center"
          style={{ backgroundImage: "url('/beutyDoor/1.jpg')" }}
        />
      </section>

      <section id="services" className="container-site mb-[150px] scroll-mt-32">
        <h2 className="section-title">Наши услуги</h2>
        <div className="services-grid">
          {[
            ["door", "Установка дверей", "Профессиональный монтаж любой сложности"],
            ["grid", "Фурнитура", "Ручки, петли, замки премиум-класса"],
            ["truck", "Доставка", "Быстрая доставка по Казани и области"],
            ["chat", "Консультации", "Поможем подобрать идеальное решение"],
          ].map(([icon, title, text]) => (
            <div key={title} className="service-card">
              <GoldIcon name={icon as "door"} />
              <h3>{title}</h3>
              <p className="text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="catalog" className="container-site scroll-mt-32">
        <h2 className="section-title">Популярные модели</h2>
        <div className="mb-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {popular.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mb-[150px] text-center">
          <Link href="/catalog" className="btn btn-dark btn-long">
            Смотреть весь каталог →
          </Link>
        </div>
      </section>

      <section id="advantages" className="container-site mb-[130px]">
        <h2 className="section-title">Почему выбирают нас</h2>
        <div className="advantages-grid">
          {[
            ["star", "Качество", "Только проверенные материалы"],
            ["shield", "Гарантия", "До 5 лет на все двери"],
            ["truck", "Быстрая доставка", "По Казани за 1–2 дня"],
            ["like", "500+ клиентов", "Довольны нашими дверями"],
          ].map(([icon, title, text]) => (
            <div key={title} className="advantage-item">
              <GoldIcon name={icon as "star"} />
              <h3>{title}</h3>
              <p className="text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="reviews" className="container-site mb-[130px]">
        <h2 className="section-title">Отзывы наших клиентов</h2>
        <div className="reviews-grid">
          {(site?.reviews || []).map((review) => (
            <blockquote key={review.author} className="review-card">
              <p className="review-text">«{review.text}»</p>
              <p className="review-author">— {review.author}</p>
            </blockquote>
          ))}
        </div>
      </section>

      <section id="faq" className="container-site mb-[120px] scroll-mt-32">
        <h2 className="section-title">Частые вопросы</h2>
        <FaqAccordion
          items={
            site?.faq?.length
              ? site.faq
              : [
                  { q: "Есть ли гарантия?", a: "Да, на все двери гарантия до 5 лет, на монтаж — 1 год." },
                  {
                    q: "Как сделать заказ?",
                    a: "Соберите комплект в корзине или напишите в WhatsApp — перезвоним в течение 15 минут.",
                  },
                ]
          }
        />
      </section>
    </>
  );
}
