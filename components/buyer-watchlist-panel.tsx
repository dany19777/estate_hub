'use client';

import { BellOff, BellRing, ChevronRight, Sparkles, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { InternalLink as Link } from '@/components/internal-link';
import { WatchSubscription } from '@/hooks/use-watchlist';
import { SavedSearch } from '@/hooks/use-saved-searches';
import { Switch } from '@/components/ui/switch';

function plural(count: number, forms: [string, string, string]) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function BuyerWatchlistPanel({ subscriptions, savedSearches, loading, processing, error, feedback, onRemove, onToggleSearch }: { subscriptions: WatchSubscription[]; savedSearches: SavedSearch[]; loading: boolean; processing: boolean; error: string; feedback: string; onRemove: (type: WatchSubscription['target_type'], id: string) => Promise<unknown>; onToggleSearch: (id: string, enabled: boolean) => Promise<unknown> }) {
  const savedSearchCount = savedSearches.filter((search) => Boolean(search.notifications_enabled)).length;
  return <section className="profile-feature-panel buyer-watchlist-panel" id="watchlist"><div><span><BellRing/></span><div><small>Отслеживание изменений</small><h2>Подписки и watchlist</h2><p>{subscriptions.length || savedSearchCount ? `${subscriptions.length} ${plural(subscriptions.length, ['объект', 'объекта', 'объектов'])} и ${savedSearchCount} ${plural(savedSearchCount, ['сохранённый поиск', 'сохранённых поиска', 'сохранённых поисков'])} под наблюдением.` : 'Следите за ЖК, ценой, доступностью и новыми квартирами.'}</p></div></div>{error && <p className="profile-empty">{error}</p>}{feedback && <p className="watchlist-feedback">{feedback}</p>}<div className="buyer-watchlist-list">{loading ? <div className="profile-empty">Загружаем подписки…</div> : subscriptions.length ? subscriptions.map((item)=><article key={item.id}><span>{item.target_type === 'saved_search' ? <Sparkles/> : <BellRing/>}</span><div><strong>{item.target_name}{item.unit_number ? ` · № ${item.unit_number}` : ''}</strong><small>{[item.notify_price_reduction && 'цена', item.notify_availability && 'доступность', item.notify_special_offer && 'предложения', item.notify_new_inventory && 'новые квартиры'].filter(Boolean).join(' · ')}</small></div>{item.slug ? <Link href={item.listing_id ? `/listing/${item.listing_id}` : `/complex/${item.slug}`}><ChevronRight/></Link> : <Tag/>}<Button size="sm" variant="ghost" disabled={processing} onClick={()=>void onRemove(item.target_type,item.target_id)}><BellOff/> Отключить</Button></article>) : <div className="notification-empty"><BellRing/><strong>Подписок на объекты пока нет</strong><span>Откройте страницу ЖК и нажмите «Следить».</span></div>}</div>{savedSearches.length > 0 && <div className="watch-search-list"><h3>Сохранённые поиски</h3>{savedSearches.map((search)=><div key={search.id}><span><Sparkles/><span><strong>{search.name}</strong><small>Сообщать о новых совпадениях</small></span></span><Switch aria-label={`Уведомления для поиска ${search.name}`} checked={Boolean(search.notifications_enabled)} onCheckedChange={(checked)=>void onToggleSearch(search.id,checked)}/></div>)}</div>}</section>;
}
