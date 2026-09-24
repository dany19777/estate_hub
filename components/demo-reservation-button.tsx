'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarClock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { InternalLink as Link } from '@/components/internal-link';
import { useBuyerPreferences } from '@/components/buyer-preferences';

export function DemoReservationButton({ listingId }: { listingId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reserved, setReserved] = useState(false);
  const key = useRef('');
  const { t } = useBuyerPreferences();

  useEffect(() => {
    let active = true;
    void fetch('/api/reservations/demo', { cache: 'no-store' }).then(async (response) => await response.json() as { enabled?: boolean }).then((data) => {
      if (active) setEnabled(Boolean(data.enabled));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  if (!enabled) return null;
  async function reserve() {
    if (!window.confirm(t('Создать тестовую бронь на 72 часа без оплаты? Квартира станет недоступной для других покупателей.'))) return;
    setBusy(true);
    setMessage('');
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const response = await fetch('/api/reservations/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key.current },
        body: JSON.stringify({ listingId }),
      });
      const payload = await response.json() as { message?: string; reservationId?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось создать бронь.');
      setReserved(true);
      setMessage(payload.message ?? 'Тестовая бронь создана.');
    } catch (error) {
      key.current = '';
      setMessage(error instanceof Error ? error.message : 'Не удалось создать бронь.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="demo-reservation-action">
    {reserved ? <Button nativeButton={false} render={<Link href="/profile#reservation" />}>Открыть мою бронь</Button> : <Button type="button" variant="outline" onClick={() => void reserve()} disabled={busy}><CalendarClock /> {busy ? 'Бронируем…' : 'Тест: забронировать без оплаты'}</Button>}
    <small>Только на localhost · срок 72 часа · деньги не списываются</small>
    {message && <p role="alert">{message}</p>}
  </div>;
}
