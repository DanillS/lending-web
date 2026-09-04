import { apiGet } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { ProductList } from "@/lib/types";
import { CatalogFilters } from "@/components/CatalogFilters";
import { shareMeta } from "@/lib/seo";
import { Suspense } from "react";

export const metadata = shareMeta({
  title: "Каталог межкомнатных дверей",
  description: "Более 50 моделей межкомнатных дверей. Полотно от 4 050 ₽. Коробка, наличники и фурнитура в комплекте.",
  path: "/catalog",
});

type Search = {
  q?: string;
  category?: string;
  sort?: string;
  page?: string;
  type?: string;
};

export const dynamic = "force-dynamic";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  if (params.sort) query.set("sort", params.sort);
  query.set("page", params.page || "1");
  query.set("page_size", "24");
  query.set("type", params.type || "door_leaf");

  let data: ProductList = { items: [], total: 0, page: 1, page_size: 24 };
  try {
    data = await apiGet<ProductList>(`/api/v1/products?${query.toString()}`, { cache: "no-store" });
  } catch {
    data = { items: [], total: 0, page: 1, page_size: 24 };
  }

  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  const titles: Record<string, string> = {
    door_leaf: "Каталог дверей",
    handle: "Ручки",
    hinge: "Петли",
    lock: "Замки",
    frame: "Коробки",
    casing: "Наличники",
    service: "Услуги",
  };
  const heading = titles[params.type || "door_leaf"] || "Каталог";

  return (
    <div className="container-site py-10">
      <h1 className="section-title">{heading}</h1>
      <Suspense fallback={null}>
        <CatalogFilters />
      </Suspense>
      <p className="mb-6 text-sm text-muted">Найдено: {data.total}</p>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {pages > 1 ? (
        <nav className="mt-10 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((page) => {
            const sp = new URLSearchParams();
            if (params.q) sp.set("q", params.q);
            if (params.category) sp.set("category", params.category);
            if (params.sort) sp.set("sort", params.sort);
            if (params.type) sp.set("type", params.type);
            sp.set("page", String(page));
            return (
              <a
                key={page}
                href={`/catalog?${sp.toString()}`}
                className={`rounded-pill px-4 py-2 ${page === data.page ? "bg-dark text-white" : "bg-wash"}`}
              >
                {page}
              </a>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
