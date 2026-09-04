import { apiGet } from "@/lib/api";
import { Configurator } from "@/components/Configurator";
import { formatPrice } from "@/lib/format";
import { shareImageUrl, shareMeta } from "@/lib/seo";
import { Product } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await apiGet<Product>(`/api/v1/products/${slug}`, { cache: "no-store" });
    const price = `от ${formatPrice(product.current_price)} ₽`;
    const description =
      product.seo_description ||
      product.description ||
      `${product.name} — ${price}. Межкомнатные двери в Казани, заявка без оплаты на сайте.`;
    return shareMeta({
      title: product.seo_title || `${product.name} — ${price}`,
      description,
      path: `/product/${product.slug}`,
      image: product.images[0]?.url,
    });
  } catch {
    return shareMeta({ title: "Товар", description: "Межкомнатные двери в Казани.", path: `/product/${slug}` });
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: Product;
  try {
    product = await apiGet<Product>(`/api/v1/products/${slug}`, { cache: "no-store" });
  } catch {
    notFound();
  }

  const image = product.images[0]?.url || "/images/placeholder.svg";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: shareImageUrl(image),
    brand: product.brand,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: product.current_price,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="container-site py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-6 text-sm text-muted">
        <a href="/">Главная</a> / <a href="/catalog">Каталог</a> / {product.name}
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div
            className="min-h-[320px] rounded-card bg-contain bg-center bg-no-repeat sm:min-h-[420px]"
            style={{ backgroundImage: `url('${image}')` }}
          />
          <h1 className="mt-6 text-3xl font-bold">{product.name}</h1>
          <p className="mt-3 text-2xl font-semibold">
            от {formatPrice(product.current_price)} ₽
            {product.old_price ? (
              <span className="ml-2 text-lg font-normal text-muted line-through">
                {formatPrice(product.old_price)} ₽
              </span>
            ) : null}
          </p>
          <p className="mt-4 text-muted">{product.description}</p>
          <h2 className="mb-3 mt-8 text-xl font-bold">Характеристики</h2>
          <dl className="divide-y divide-line rounded-card border border-line">
            {Object.entries(product.specs || {}).map(([key, value]) => (
              <div key={key} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
                <dt className="text-muted">{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-muted">
            {product.type === "door_leaf"
              ? "Гарантия до 5 лет на полотно, 1 год на монтаж."
              : "Позиция из комплекта. Для двери соберите комплект в каталоге."}
          </p>
        </div>
        <Configurator product={product} />
      </div>
    </div>
  );
}
