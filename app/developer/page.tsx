'use client';

import { useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  FileText,
  Gauge,
  Handshake,
  Home,
  Image,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InternalLink as Link } from '@/components/internal-link';

const navGroups: Array<{ label: string; items: Array<{ icon: LucideIcon; label: string; active?: boolean; count?: number }> }> = [
  { label: 'Главное', items: [{ icon: LayoutDashboard, label: 'Дашборд', active: true }] },
  { label: 'Управление', items: [{ icon: Building2, label: 'Жилые комплексы' }, { icon: Home, label: 'Квартиры' }, { icon: CalendarDays, label: 'Бронирования', count: 8 }, { icon: Users, label: 'Клиенты и лиды', count: 24 }, { icon: ListChecks, label: 'Просмотры' }, { icon: MessageCircle, label: 'Сообщения', count: 12 }, { icon: Handshake, label: 'Сделки' }, { icon: FileText, label: 'Документы' }] },
  { label: 'Рост', items: [{ icon: Sparkles, label: 'Продвижение' }, { icon: Image, label: 'Медиа' }, { icon: BarChart3, label: 'Аналитика' }] },
  { label: 'Организация', items: [{ icon: Users, label: 'Команда' }, { icon: CreditCard, label: 'Тариф и оплата' }, { icon: Settings, label: 'Настройки' }] },
];

const projects = [
  { name: 'Bog‘ishamol Residence', location: 'Самарканд, Боғишамол', units: 84, available: 28, views: '4 820', leads: 126, status: 'Опубликован', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=250&q=80' },
  { name: 'Registan Gardens', location: 'Самарканд, Регистан', units: 62, available: 16, views: '3 440', leads: 89, status: 'Опубликован', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=250&q=80' },
  { name: 'Silk Road Avenue', location: 'Самарканд, Сиёб', units: 102, available: 41, views: '2 910', leads: 74, status: 'На модерации', image: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=250&q=80' },
  { name: 'Afrasiyob Park', location: 'Самарканд, Саттепо', units: 48, available: 12, views: '1 860', leads: 38, status: 'Черновик', image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=250&q=80' },
];

const kpis = [
  { label: 'Активные проекты', value: '12', change: '+2', icon: Building2, tone: 'blue' },
  { label: 'Доступно квартир', value: '156', change: '+8,4%', icon: Home, tone: 'violet' },
  { label: 'Просмотры', value: '12 540', change: '+18%', icon: Gauge, tone: 'green' },
  { label: 'Новые лиды', value: '356', change: '+22%', icon: MessageCircle, tone: 'orange' },
  { label: 'Бронирования', value: '57', change: '+15%', icon: CalendarDays, tone: 'pink' },
  { label: 'Сумма резервов', value: '142,5 млн', change: '+10%', icon: CircleDollarSign, tone: 'yellow' },
];

export default function DeveloperDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState('Последние 7 дней');

  return (
    <main className="developer-page dark">
      <aside className={`developer-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="developer-logo"><span><Building2 /></span><strong>Estate<em>Hub</em></strong><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Закрыть меню"><X /></button></div>
        <div className="company-mini-card"><span>SD</span><div><strong>Samarkand Dev.</strong><small><ShieldCheck /> Проверено</small></div><ChevronDown /></div>
        <nav>
          {navGroups.map((group) => <div className="developer-nav-group" key={group.label}><span>{group.label}</span>{group.items.map((item) => <button className={item.active ? 'active' : ''} type="button" key={item.label}><item.icon /> <strong>{item.label}</strong>{item.count && <em>{item.count}</em>}</button>)}</div>)}
        </nav>
        <Link className="public-site-link" href="/"><span><ArrowUpRight /></span><div><strong>Публичный сайт</strong><small>Открыть маркетплейс</small></div></Link>
      </aside>
      {sidebarOpen && <button type="button" className="developer-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Закрыть меню" />}

      <section className="developer-workspace">
        <header className="developer-topbar">
          <div><button type="button" onClick={() => setSidebarOpen(true)} aria-label="Открыть меню"><Menu /></button><span>Дашборд</span></div>
          <div><Link href="/">Посмотреть профиль <ArrowUpRight /></Link><button type="button" className="topbar-notification"><Bell /><span>3</span></button><div className="topbar-company"><span>SD</span><div><strong>Samarkand Development</strong><small>Застройщик</small></div><ChevronDown /></div></div>
        </header>

        <div className="developer-content">
          <div className="dashboard-heading"><div><h1>Добро пожаловать, Samarkand Development 👋</h1><p>Вот что происходит с вашими объектами сегодня.</p></div><div className="dashboard-heading-actions"><button type="button" onClick={() => setPeriod(period === 'Последние 7 дней' ? 'Этот месяц' : 'Последние 7 дней')}><CalendarDays /> {period} <ChevronDown /></button><Button><Plus /> Добавить объект</Button></div></div>

          <div className="dashboard-layout">
            <div className="dashboard-main">
              <div className="kpi-grid">{kpis.map((kpi) => <article className="kpi-card" key={kpi.label}><div><span>{kpi.label}</span><strong>{kpi.value}</strong><small><TrendingUp /> {kpi.change} <em>за период</em></small></div><i className={kpi.tone}><kpi.icon /></i></article>)}</div>

              <section className="dashboard-panel projects-panel">
                <div className="panel-heading"><div><h2>Мои жилые комплексы</h2><p>Инвентарь, спрос и статус публикации</p></div><div className="panel-search"><Search /><Input aria-label="Поиск по проектам" placeholder="Найти проект" /></div></div>
                <div className="project-tabs"><button className="active" type="button">Все 12</button><button type="button">Опубликованы 8</button><button type="button">Черновики 2</button><button type="button">Модерация 2</button></div>
                <Table className="developer-table">
                  <TableHeader><TableRow><TableHead>Проект</TableHead><TableHead>Квартиры</TableHead><TableHead>Доступно</TableHead><TableHead>Просмотры</TableHead><TableHead>Лиды</TableHead><TableHead>Статус</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>{projects.map((project) => <TableRow key={project.name}><TableCell><div className="project-cell"><img src={project.image} alt="" /><div><strong>{project.name}</strong><small>{project.location}</small></div></div></TableCell><TableCell>{project.units}</TableCell><TableCell>{project.available}</TableCell><TableCell>{project.views}</TableCell><TableCell>{project.leads}</TableCell><TableCell><Badge className={`project-status ${project.status === 'Опубликован' ? 'published' : project.status === 'На модерации' ? 'pending' : 'draft'}`}>{project.status}</Badge></TableCell><TableCell><button type="button" aria-label="Действия"><MoreHorizontal /></button></TableCell></TableRow>)}</TableBody>
                </Table>
                <div className="table-footer"><span>Показано 4 из 12 проектов</span><div><button type="button">‹</button><button type="button" className="active">1</button><button type="button">2</button><button type="button">3</button><button type="button">›</button></div></div>
              </section>

              <div className="analytics-grid">
                <section className="dashboard-panel chart-panel"><div className="panel-heading"><div><h2>Просмотры</h2><p>12 540 · <span>+18%</span></p></div><button type="button">Неделя <ChevronDown /></button></div><div className="dashboard-line-chart"><span className="chart-value">2 450<small>16 авг</small></span><svg viewBox="0 0 600 220" role="img" aria-label="График просмотров за неделю"><defs><linearGradient id="devLine" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#4d7cff" stopOpacity=".3"/><stop offset="1" stopColor="#4d7cff" stopOpacity="0"/></linearGradient></defs><path d="M5 190 C55 160 73 119 119 148 S176 103 224 123 S290 62 337 96 S403 49 449 62 S526 89 595 25 L595 218 L5 218 Z" fill="url(#devLine)"/><path d="M5 190 C55 160 73 119 119 148 S176 103 224 123 S290 62 337 96 S403 49 449 62 S526 89 595 25" fill="none" stroke="#4d7cff" strokeWidth="4" strokeLinecap="round"/></svg><div><span>12 авг</span><span>13 авг</span><span>14 авг</span><span>15 авг</span><span>16 авг</span><span>17 авг</span><span>18 авг</span></div></div></section>
                <section className="dashboard-panel chart-panel"><div className="panel-heading"><div><h2>Лиды</h2><p>356 · <span>+22%</span></p></div><button type="button">Неделя <ChevronDown /></button></div><div className="bar-chart" aria-label="Лиды за неделю">{[44, 59, 49, 73, 68, 91, 61].map((value, index) => <div key={index}><i style={{ height: `${value}%` }} /><span>{12 + index} авг</span></div>)}</div></section>
              </div>
            </div>

            <aside className="dashboard-rail">
              <section className="company-profile-card"><div className="company-cover"><span>SD</span></div><h2>Samarkand Development <ShieldCheck /></h2><p>Застройщик · Самарканд</p><div><span><strong>12</strong>проектов</span><span><strong>296</strong>квартир</span><span><strong>4.8</strong>рейтинг</span></div><div className="profile-progress"><span>Профиль заполнен <strong>86%</strong></span><Progress value={86} /></div><button type="button">Редактировать профиль</button></section>
              <section className="quick-actions"><h2>Быстрые действия</h2><div><button type="button"><Plus /><span>Новый комплекс</span></button><button type="button"><Home /><span>Добавить квартиры</span></button><button type="button"><Sparkles /><span>Создать акцию</span></button><button type="button"><CalendarDays /><span>Бронирования</span></button><button type="button"><FileText /><span>Сформировать отчёт</span></button><button type="button"><Image /><span>Медиа</span></button></div></section>
              <section className="attention-card"><div><h2>Требует внимания</h2><a href="#attention">Смотреть все</a></div><article><span className="urgent"><AlertCircle /></span><div><strong>3 нарушения SLA</strong><small>Лиды ожидают ответа более 30 минут</small></div><ArrowUpRight /></article><article><span className="warning"><Clock3Icon /></span><div><strong>5 броней истекают</strong><small>В течение ближайших 24 часов</small></div><ArrowUpRight /></article><article><span className="info"><MessageCircle /></span><div><strong>8 сообщений без ответа</strong><small>Самое раннее — 42 минуты назад</small></div><ArrowUpRight /></article></section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function Clock3Icon() {
  return <CalendarDays />;
}
