'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  FileSearch,
  Gauge,
  Landmark,
  ListChecks,
  Menu,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const adminNav = [
  { label: 'Обзор', icon: Gauge, active: true },
  { label: 'Пользователи', icon: Users },
  { label: 'Застройщики', icon: Building2 },
  { label: 'Агентства и владельцы', icon: Landmark },
  { label: 'Жилые комплексы', icon: Building2 },
  { label: 'Верификация', icon: FileCheck2, count: 17 },
  { label: 'Модерация', icon: ListChecks, count: 9 },
  { label: 'Брони и платежи', icon: WalletCards },
  { label: 'Споры и возвраты', icon: AlertTriangle, count: 3 },
  { label: 'Тарифы и биллинг', icon: CircleDollarSign },
  { label: 'Аудит', icon: FileSearch },
  { label: 'Аналитика', icon: BarChart3 },
  { label: 'Настройки системы', icon: Settings },
];

const verificationRows = [
  { name: 'Imorat Invest LLC', type: 'Застройщик', subject: 'Компания и полномочия', date: '29 авг, 01:42', risk: 'Низкий', status: 'Новая' },
  { name: 'Zarafshan Realty', type: 'Агентство', subject: 'Компания + объект A-097', date: '29 авг, 00:18', risk: 'Средний', status: 'В работе' },
  { name: 'Икром Рахмонов', type: 'Собственник', subject: 'Право собственности', date: '28 авг, 22:51', risk: 'Низкий', status: 'Новая' },
  { name: 'Orient House', type: 'Застройщик', subject: 'Связь с ЖК Silk Road', date: '28 авг, 19:32', risk: 'Высокий', status: 'Эскалация' },
  { name: 'Самарканд Уйлар', type: 'Агентство', subject: 'Доверенность владельца', date: '28 авг, 17:04', risk: 'Средний', status: 'Изменения' },
];

export default function AdminDashboard() {
  const [mobileNav, setMobileNav] = useState(false);
  const [queue, setQueue] = useState('Все');

  return (
    <main className="platform-admin dark">
      <aside className={`admin-sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="admin-brand"><span><ShieldCheck /></span><div><strong>Estate<em>Hub</em></strong><small>Platform Admin</small></div><button type="button" onClick={() => setMobileNav(false)} aria-label="Закрыть меню"><X /></button></div>
        <div className="admin-user"><span>МА</span><div><strong>Мухаммадали А.</strong><small>Superadmin</small></div><ChevronDown /></div>
        <nav>{adminNav.map((item) => <button type="button" className={item.active ? 'active' : ''} key={item.label}><item.icon /><span>{item.label}</span>{item.count && <em>{item.count}</em>}</button>)}</nav>
        <div className="system-status"><span><i/> Все системы работают</span><small>Последняя проверка: сейчас</small></div>
      </aside>
      {mobileNav && <button className="developer-sidebar-backdrop" type="button" onClick={() => setMobileNav(false)} aria-label="Закрыть меню" />}

      <section className="admin-workspace">
        <header className="admin-topbar"><div><button type="button" onClick={() => setMobileNav(true)} aria-label="Открыть меню"><Menu /></button><strong>Операционный центр</strong></div><div className="admin-global-search"><Search /><Input aria-label="Глобальный поиск" placeholder="Пользователь, объект, платёж…" /></div><div><button type="button" aria-label="Уведомления"><Bell /><span>6</span></button><span>МА</span></div></header>
        <div className="admin-content">
          <div className="admin-heading"><div><span>29 августа 2026 · Самарканд</span><h1>Контроль платформы</h1><p>Верификация, модерация, бронирования и финансовые операции.</p></div><Button variant="outline"><SlidersHorizontal /> Настроить дашборд</Button></div>

          <div className="admin-kpis">
            <article><span className="ak-blue"><Users /></span><div><small>Пользователи</small><strong>24 821</strong><em>+184 за неделю</em></div></article>
            <article><span className="ak-green"><Building2 /></span><div><small>Активные ЖК</small><strong>42</strong><em>347 объявлений</em></div></article>
            <article><span className="ak-orange"><FileCheck2 /></span><div><small>На верификации</small><strong>17</strong><em>5 просрочено</em></div></article>
            <article><span className="ak-violet"><WalletCards /></span><div><small>Активные брони</small><strong>31</strong><em>3,8 млрд сум</em></div></article>
            <article><span className="ak-red"><AlertTriangle /></span><div><small>Требует решения</small><strong>12</strong><em>3 финансовых спора</em></div></article>
          </div>

          <div className="admin-main-grid">
            <section className="admin-panel verification-queue">
              <div className="admin-panel-heading"><div><h2>Очередь верификации</h2><p>Компании, продавцы и документы объектов</p></div><a href="#all">Открыть всю очередь</a></div>
              <div className="admin-queue-toolbar"><div>{['Все', 'Новые', 'В работе', 'Эскалации'].map((item) => <button className={queue === item ? 'active' : ''} type="button" onClick={() => setQueue(item)} key={item}>{item}</button>)}</div><div><Search /><Input aria-label="Поиск заявки" placeholder="Поиск заявки" /></div></div>
              <Table className="admin-table"><TableHeader><TableRow><TableHead>Заявитель</TableHead><TableHead>Тип</TableHead><TableHead>Предмет проверки</TableHead><TableHead>Получено</TableHead><TableHead>Риск</TableHead><TableHead>Статус</TableHead><TableHead /></TableRow></TableHeader><TableBody>{verificationRows.filter((row) => queue === 'Все' || queue === 'Новые' && row.status === 'Новая' || queue === 'В работе' && row.status === 'В работе' || queue === 'Эскалации' && row.status === 'Эскалация').map((row) => <TableRow key={row.name}><TableCell><div className="admin-applicant"><span>{row.name.slice(0,2).toUpperCase()}</span><strong>{row.name}</strong></div></TableCell><TableCell>{row.type}</TableCell><TableCell>{row.subject}</TableCell><TableCell>{row.date}</TableCell><TableCell><Badge className={`risk-badge ${row.risk.toLowerCase()}`}>{row.risk}</Badge></TableCell><TableCell><Badge className={`queue-status ${row.status === 'Новая' ? 'new' : row.status === 'В работе' ? 'working' : row.status === 'Эскалация' ? 'escalated' : 'changes'}`}>{row.status}</Badge></TableCell><TableCell><button type="button"><MoreHorizontal /></button></TableCell></TableRow>)}</TableBody></Table>
            </section>

            <aside className="admin-side-stack">
              <section className="admin-panel attention-panel"><div className="admin-panel-heading"><div><h2>Требует внимания</h2><p>По уровню риска и SLA</p></div></div><article><span className="danger"><AlertTriangle /></span><div><strong>3 спора по бронированию</strong><small>2 требуют решения Finance Operator</small></div><ChevronDown /></article><article><span className="warning"><FileCheck2 /></span><div><strong>5 нарушений SLA проверки</strong><small>Старше 24 часов</small></div><ChevronDown /></article><article><span className="info"><WalletCards /></span><div><strong>2 ошибки сверки платежей</strong><small>Провайдер и резерв не совпали</small></div><ChevronDown /></article></section>
              <section className="admin-panel finance-summary"><div className="admin-panel-heading"><div><h2>Финансовый контур</h2><p>Сегодня</p></div></div><div><span><small>Платежи броней</small><strong>87,5 млн сум</strong></span><span><small>К возврату</small><strong>5 млн сум</strong></span><span><small>На сверке</small><strong>2 операции</strong></span></div><a href="#finance">Открыть операции</a></section>
            </aside>
          </div>

          <div className="admin-lower-grid">
            <section className="admin-panel admin-activity"><div className="admin-panel-heading"><div><h2>Последние критические действия</h2><p>Неизменяемый журнал аудита</p></div><a href="#audit">Весь аудит</a></div><div><article><span><Check /></span><p><strong>Одобрен застройщик Imorat Invest</strong><small>Verification Specialist · request 9f32…c181</small></p><time>02:18</time></article><article><span><ShieldCheck /></span><p><strong>Изменена цена квартиры A-142</strong><small>Samarkand Development · 680 → 685 млн сум</small></p><time>01:54</time></article><article><span><WalletCards /></span><p><strong>Инициирован возврат по резерву R-2814</strong><small>Finance Operator · причина: отказ застройщика</small></p><time>00:41</time></article></div></section>
            <section className="admin-panel system-health"><div className="admin-panel-heading"><div><h2>Состояние системы</h2><p>Ключевые сервисы</p></div></div><div><p><span><i/> API</span><strong>99,99%</strong></p><p><span><i/> Поиск</span><strong>182 ms</strong></p><p><span><i/> Платежи</span><strong>Работает</strong></p><p><span><i/> Очереди</span><strong>24 задачи</strong></p></div></section>
          </div>
        </div>
      </section>
    </main>
  );
}
