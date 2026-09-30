'use client';

import { InternalLink as Link } from '@/components/internal-link';

const legalLinks = [
  ['/legal/terms', 'Правила пользования'],
  ['/legal/privacy', 'Политика конфиденциальности'],
  ['/legal/offer', 'Публичная оферта'],
  ['/legal/refunds', 'Правила возврата'],
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <strong>EstateHub</strong>
          <p>Недвижимость Самарканда</p>
          <small>
            Юридические документы и реквизиты будут опубликованы до открытия
            регистрации и оплаты.
          </small>
        </div>
        <nav aria-label="Юридические документы">
          <strong>Документы</strong>
          {legalLinks.map(([href, title]) => (
            <Link href={href} key={href}>
              {title}
            </Link>
          ))}
        </nav>
        <div>
          <strong>Реквизиты</strong>
          <p>Официальные реквизиты компании готовятся к публикации.</p>
        </div>
        <div>
          <strong>Связаться с нами</strong>
          <a href="mailto:support@estatehub.uz">support@estatehub.uz</a>
          <p>Вопросы модерации: через поддержку EstateHub.</p>
          <p>Телефон поддержки будет опубликован после подключения линии.</p>
        </div>
      </div>
    </footer>
  );
}
