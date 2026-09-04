import { shareMeta } from "@/lib/seo";

export const metadata = {
  ...shareMeta({
    title: "Политика персональных данных",
    description: "Как мы обрабатываем имя и телефон из заявки на межкомнатные двери в Казани.",
    path: "/legal",
  }),
  robots: { index: true },
};

export default function LegalPage() {
  return (
    <article className="container-site prose max-w-3xl py-12">
      <h1 className="mb-6 text-3xl font-bold">Политика персональных данных</h1>
      <p className="mb-4 text-muted">
        Оставляя заявку, вы соглашаетесь на обработку имени и телефона для связи по заказу межкомнатных дверей.
        Данные не продаём третьим лицам. Храним заявки для исполнения договора.
      </p>
      <p className="text-muted">По вопросам: dinamo7933@gmail.com, Казань.</p>
    </article>
  );
}
