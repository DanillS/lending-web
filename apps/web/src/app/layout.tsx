import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost"),
  title: {
    default: "Качественные двери | Межкомнатные двери в Казани",
    template: "%s | Качественные двери",
  },
  description: "Межкомнатные двери в Казани. Полотно, коробка, наличники, фурнитура и установка. Гарантия до 5 лет.",
  openGraph: {
    title: "Купить межкомнатные двери в Казани",
    description: "Широкий выбор дверей с гарантией 5 лет. Доставка по Казани.",
    images: ["/beutyDoor/1.jpg"],
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={nunito.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
