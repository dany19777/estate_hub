'use client';

import { ReactElement, SyntheticEvent, useState } from 'react';
import { BellRing, Check, HeartPulse, Sparkles, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { WatchSettings, WatchSubscription } from '@/hooks/use-watchlist';

const defaults: WatchSettings = { notifyPriceReduction: true, notifyAvailability: true, notifySpecialOffer: true, notifyNewInventory: true };

export function WatchlistDialog({ trigger, name, subscription, processing, onSave, onRemove }: { trigger: ReactElement; name: string; subscription: WatchSubscription | null; processing: boolean; onSave: (settings: WatchSettings) => Promise<string>; onRemove: () => Promise<string> }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<WatchSettings>(defaults);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  function changeOpen(nextOpen: boolean) {
    if (nextOpen) {
      setSettings(subscription ? { notifyPriceReduction: Boolean(subscription.notify_price_reduction), notifyAvailability: Boolean(subscription.notify_availability), notifySpecialOffer: Boolean(subscription.notify_special_offer), notifyNewInventory: Boolean(subscription.notify_new_inventory) } : defaults);
      setError(''); setSuccess('');
    }
    setOpen(nextOpen);
  }
  async function submit(event: SyntheticEvent) { event.preventDefault(); setError(''); try { setSuccess(await onSave(settings)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить подписку.'); } }
  async function remove() { setError(''); try { setSuccess(await onRemove()); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось отключить подписку.'); } }
  const rows = [
    ['notifyPriceReduction', Tag, 'Снижение цены', 'Сообщить, когда цена квартиры станет ниже.'],
    ['notifyAvailability', HeartPulse, 'Снова в продаже', 'Сообщить, когда удержание или бронь освободятся.'],
    ['notifySpecialOffer', Sparkles, 'Специальное предложение', 'Новые предложения и ограниченные условия продавца.'],
    ['notifyNewInventory', BellRing, 'Новые квартиры', 'Новый инвентарь в этом жилом комплексе.'],
  ] as const;
  return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger render={trigger}/><DialogContent className="watchlist-dialog">{success ? <div className="watchlist-success"><span><Check/></span><DialogTitle>Готово</DialogTitle><DialogDescription>{success}</DialogDescription><DialogFooter><DialogClose render={<Button/>}>Закрыть</DialogClose></DialogFooter></div> : <><DialogHeader><span><BellRing/> Персональная подписка</span><DialogTitle>Следить за {name}</DialogTitle><DialogDescription>Выберите события. Повторные уведомления автоматически исключаются.</DialogDescription></DialogHeader><form id="watchlist-form" className="watchlist-form" onSubmit={submit}>{rows.map(([key,Icon,title,description])=><div key={key}><span><i><Icon/></i><span><strong>{title}</strong><small>{description}</small></span></span><Switch aria-label={title} checked={settings[key]} onCheckedChange={(checked)=>setSettings((current)=>({...current,[key]:checked}))} /></div>)}{error && <p>{error}</p>}</form><DialogFooter>{subscription && <Button type="button" variant="ghost" disabled={processing} onClick={()=>void remove()}>Отключить подписку</Button>}<DialogClose render={<Button variant="outline" disabled={processing}/>}>Отмена</DialogClose><Button type="submit" form="watchlist-form" disabled={processing}>{processing ? 'Сохраняем…' : 'Сохранить'}</Button></DialogFooter></>}</DialogContent></Dialog>;
}
