import { InternalLink as Link } from '@/components/internal-link';

const titles: Record<string, string> = {
  terms: 'Правила пользования',
  privacy: 'Политика конфиденциальности',
  offer: 'Публичная оферта',
  refunds: 'Правила возврата',
};

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  const title = titles[document];
  return (
    <main className="legal-page">
      <Link href="/">← На главную</Link>
      <h1>{title ?? 'Документ не найден'}</h1>
      <p>
        {title
          ? 'Документ готовится к публикации. Регистрация и онлайн-оплата будут открыты после утверждения и публикации полного текста.'
          : 'Проверьте адрес страницы.'}
      </p>
      <a href="mailto:support@estatehub.uz">Вопрос в службу поддержки</a>
    </main>
  );
}
