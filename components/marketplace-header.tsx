'use client';

import {
  Bell,
  Building2,
  ChevronDown,
  Heart,
  Menu,
  UserRound,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { InternalLink as Link } from '@/components/internal-link';
import { useBuyerPreferences } from '@/components/buyer-preferences';
import { useSession } from '@/hooks/use-session';

type MarketplaceHeaderProps = {
  active?: 'all' | 'primary' | 'secondary' | 'seller';
};

export function MarketplaceHeader({ active = 'all' }: MarketplaceHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session } = useSession();
  const { locale, currency, rateDate, rateError, setLocale, setCurrency } =
    useBuyerPreferences();
  const canOpenDeveloper = session?.permissions.includes(
    'VIEW_DEVELOPER_DASHBOARD',
  );
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="EstateHub — главная">
          <span className="brand-mark" aria-hidden="true">
            <Building2 />
          </span>
          <span>
            Estate<span>Hub</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Основная навигация">
          <details className="header-navigation-menu">
            <summary>
              <Menu />
              <span>Разделы</span>
              <ChevronDown className="header-navigation-chevron" />
            </summary>
            <div className="header-navigation-panel">
              <div>
                <small>Недвижимость</small>
                <Link
                  className={active === 'all' ? 'active' : undefined}
                  href="/catalog?market=all"
                >
                  <span>Купить</span>
                </Link>
                <Link
                  className={active === 'primary' ? 'active' : undefined}
                  href="/catalog?market=primary"
                >
                  <span>Новостройки</span>
                </Link>
                <Link
                  className={active === 'secondary' ? 'active' : undefined}
                  href="/catalog?market=secondary"
                >
                  <span>Вторичный рынок</span>
                </Link>
                <Link
                  className={active === 'seller' ? 'active' : undefined}
                  href="/seller"
                >
                  <span>Продать квартиру</span>
                </Link>
              </div>
              <div>
                <small>EstateHub</small>
                <Link href="/#how-it-works">
                  <span>Как это работает</span>
                </Link>
                <Link href="/developer">
                  <span>Для застройщиков</span>
                </Link>
              </div>
            </div>
          </details>
        </nav>
        <div className="header-actions">
          <label className="preference-select" aria-label="Язык интерфейса">
            <span className="sr-only">Язык интерфейса</span>
            <select
              className="locale-button"
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value as 'ru' | 'uz' | 'en')
              }
            >
              <option value="ru">RU</option>
              <option value="uz">UZ</option>
              <option value="en">EN</option>
            </select>
          </label>
          <label
            className="preference-select"
            aria-label="Валюта"
            title={
              rateError ||
              (rateDate ? `Курс Центрального банка от ${rateDate}` : undefined)
            }
          >
            <span className="sr-only">Валюта</span>
            <select
              className="currency-button"
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value as 'UZS' | 'USD')
              }
            >
              <option value="UZS">UZS</option>
              <option value="USD" disabled={!rateDate}>
                USD
              </option>
            </select>
          </label>
          <Link
            className="icon-button desktop-only"
            href="/profile?section=favorites"
            aria-label="Избранное"
          >
            <Heart />
          </Link>
          <Link
            className="icon-button desktop-only notification-button"
            href="/profile?section=notifications"
            aria-label="Уведомления"
          >
            <Bell />
            <span />
          </Link>
          <Link
            className="profile-button"
            href="/account"
            aria-label={session ? 'Личный кабинет' : 'Войти'}
          >
            <UserRound />
          </Link>
          <button
            className="icon-button mobile-menu"
            type="button"
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="mobile-header-menu" aria-label="Мобильное меню">
          <Link href="/catalog?market=all">Купить</Link>
          <Link href="/catalog?market=primary">Новостройки</Link>
          <Link href="/catalog?market=secondary">Вторичный рынок</Link>
          <Link href="/seller">Продать квартиру</Link>
          <Link href="/profile?section=favorites">Избранное</Link>
          <Link href="/profile?section=notifications">Уведомления</Link>
          {canOpenDeveloper && (
            <Link href="/developer">Кабинет застройщика</Link>
          )}
        </nav>
      )}
    </header>
  );
}
