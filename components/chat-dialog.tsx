'use client';

import { type ReactElement, type SyntheticEvent, useCallback, useEffect, useState } from 'react';
import { Building2, MessageCircle, Send, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type ChatMessage = { id: string; author_type: 'buyer' | 'seller' | 'system'; body: string; created_at: string };
type ChatDialogProps = {
  listingId: string;
  complexName: string;
  unitNumber: string;
  seller: string;
  trigger: ReactElement;
  onMessageSent?: () => void;
};

export function ChatDialog({ listingId, complexName, unitNumber, seller, trigger, onMessageSent }: ChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/buyer/messages?listingId=${encodeURIComponent(listingId)}`);
      const payload = await response.json() as { messages?: ChatMessage[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить переписку.');
      setMessages(payload.messages ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить переписку.');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { if (open) void load(); }, [load, open]);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = body.trim();
    if (!message) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/buyer/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId, body: message }) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось отправить сообщение.');
      setBody('');
      await load();
      onMessageSent?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось отправить сообщение.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="chat-dialog">
        <DialogHeader>
          <Badge><MessageCircle /> Чат по объявлению</Badge>
          <DialogTitle>{seller}</DialogTitle>
          <DialogDescription>{complexName} · квартира № {unitNumber}. Продавец сразу видит, по какому объекту вы пишете.</DialogDescription>
        </DialogHeader>
        <div className="chat-context"><span><Building2 /></span><div><strong>{complexName}</strong><small>Квартира № {unitNumber} · {seller}</small></div><ShieldCheck /></div>
        <div className="chat-thread" aria-live="polite">
          {loading ? <p className="chat-empty">Загружаем переписку…</p> : messages.length ? messages.map((message) => <article className={message.author_type} key={message.id}><small>{message.author_type === 'buyer' ? 'Вы' : message.author_type === 'seller' ? seller : 'EstateHub'}</small><p>{message.body}</p><time>{new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(`${message.created_at.replace(' ', 'T')}Z`))}</time></article>) : <p className="chat-empty">Начните диалог: уточните условия сделки, документы или удобное время просмотра.</p>}
        </div>
        <form className="chat-compose" onSubmit={submit}><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Напишите продавцу…" maxLength={1000} required /><Button type="submit" disabled={submitting || !body.trim()} aria-label="Отправить сообщение"><Send />{submitting ? 'Отправляем…' : 'Отправить'}</Button></form>
        {error && <p className="lead-request-error">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
