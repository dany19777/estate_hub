'use client';

import { Bell, Building2, ChevronDown, Heart, Menu, UserRound } from 'lucide-react';

import { InternalLink as Link } from '@/components/internal-link';

type MarketplaceHeaderProps = {
  active?: 'all' | 'primary' | 'secondary';
};

export function MarketplaceHeader({ active = 'all' }: MarketplaceHeaderProps) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="EstateHub — главная">
          <span className="brand-mark" aria-hidden="true"><Building2 /></span>
          <span>Estate<span>Hub</span></span>
        </Link>
        <nav className="desktop-nav" aria-label="Основная навигация">
          <Link className={active === 'all' ? 'active' : undefined} href="/catalog?market=all">Купить</Link>
          <Link className={active === 'primary' ? 'active' : undefined} href="/catalog?market=primary">Новостройки</Link>
          <Link className={active === 'secondary' ? 'active' : undefined} href="/catalog?market=secondary">Вторичный рынок</Link>
          <Link href="/#how-it-works">Как это работает</Link>
          <Link href="/developer">Для застройщиков</Link>
        </nav>
        <div className="header-actions">
          <button className="locale-button" type="button">RU <ChevronDown /></button>
          <button className="currency-button" type="button">UZS <ChevronDown /></button>
          <button className="icon-button desktop-only" type="button" aria-label="Избранное"><Heart /></button>
          <button className="icon-button desktop-only notification-button" type="button" aria-label="Уведомления"><Bell /><span /></button>
          <Link className="profile-button" href="/profile" aria-label="Личный кабинет"><UserRound /></Link>
          <button className="icon-button mobile-menu" type="button" aria-label="Открыть меню"><Menu /></button>
        </div>
      </div>
    </header>
  );
}
