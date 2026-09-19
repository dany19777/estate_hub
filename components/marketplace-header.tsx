'use client';

import {
  Bell,
  Building2,
  Heart,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { InternalLink as Link } from '@/components/internal-link';
import { useSession } from '@/hooks/use-session';

type MarketplaceHeaderProps = {
  active?: 'all' | 'primary' | 'secondary' | 'seller';
};

export function MarketplaceHeader({ active = 'all' }: MarketplaceHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session } = useSession();
  const canOpenAdmin = session?.permissions.includes('VIEW_ADMIN');
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
          <Link
            className={active === 'all' ? 'active' : undefined}
            href="/catalog?market=all"
          >
            Купить
          </Link>
          <Link
            className={active === 'primary' ? 'active' : undefined}
            href="/catalog?market=primary"
          >
            Новостройки
          </Link>
          <Link
            className={active === 'secondary' ? 'active' : undefined}
            href="/catalog?market=secondary"
          >
            Вторичный рынок
          </Link>
          <Link
            className={active === 'seller' ? 'active' : undefined}
            href="/seller"
          >
            Продать квартиру
          </Link>
          <Link href="/#how-it-works">Как это работает</Link>
          <Link href="/developer">Для застройщиков</Link>
          {canOpenAdmin && (
            <Link className="role-navigation-link" href="/admin">
              <ShieldCheck /> Админ-панель
            </Link>
          )}
        </nav>
        <div className="header-actions">
          <button
            className="locale-button"
            type="button"
            disabled
            title="Узбекский и английский будут подключены на этапе локализации"
          >
            RU
          </button>
          <button
            className="currency-button"
            type="button"
            disabled
            title="Цены MVP фиксированы в сумах"
          >
            UZS
          </button>
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
            href="/profile"
            aria-label="Личный кабинет"
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
          {canOpenAdmin && <Link href="/admin">Панель администратора</Link>}
        </nav>
      )}
    </header>
  );
}
