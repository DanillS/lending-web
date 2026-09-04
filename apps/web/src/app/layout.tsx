import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { SITE_NAME, shareMeta, siteOrigin } from "@/lib/seo";

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

const homeShare = shareMeta({
  title: "Купить межкомнатные двери в Казани",
  description:
    "Межкомнатные двери в Казани. Полотно, коробка, наличники, фурнитура и установка. Заявка за 2 минуты, гарантия до 5 лет.",
  path: "/",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: `${SITE_NAME} | Межкомнатные двери в Казани`,
    template: `%s | ${SITE_NAME}`,
  },
  description: homeShare.description,
  alternates: homeShare.alternates,
  openGraph: homeShare.openGraph,
  twitter: homeShare.twitter,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={nunito.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
