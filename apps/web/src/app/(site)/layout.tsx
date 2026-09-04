import { apiGet } from "@/lib/api";
import { SiteInfo } from "@/lib/types";
import { Footer, Header } from "@/components/Chrome";
import { Providers } from "@/components/Providers";

export const dynamic = "force-dynamic";

async function loadSite(): Promise<SiteInfo> {
  try {
    return await apiGet<SiteInfo>("/api/v1/site", { cache: "no-store" });
  } catch {
    return {
      name: "Качественные двери",
      phone: "+79046726360",
      whatsapp: "https://wa.me/79046726360",
      telegram: "https://t.me/pr0gger/",
      email: "dinamo7933@gmail.com",
      city: "Казань",
      reviews: [],
      faq: [],
    };
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await loadSite();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    telephone: site.phone,
    email: site.email,
    address: { "@type": "PostalAddress", addressLocality: site.city, addressCountry: "RU" },
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Providers>
        <Header site={site} />
        <main>{children}</main>
        <Footer site={site} />
      </Providers>
    </>
  );
}
