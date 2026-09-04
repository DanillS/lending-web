import { apiGet } from "@/lib/api";
import { siteOrigin } from "@/lib/seo";
import { ProductList } from "@/lib/types";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteOrigin();
  let items: { slug: string }[] = [];
  try {
    const data = await apiGet<ProductList>("/api/v1/products?type=door_leaf&page_size=100", { cache: "no-store" });
    items = data.items;
  } catch {
    items = [];
  }
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/delivery`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/legal`, changeFrequency: "yearly", priority: 0.3 },
    ...items.map((item) => ({
      url: `${base}/product/${item.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
