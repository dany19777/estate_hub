'use client';

import { type SyntheticEvent, useCallback, useEffect, useState } from 'react';
import { Building2, MessageCircle, Send, UserRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DeveloperConversation } from '@/hooks/use-developer-messages';

type ChatMessage = { id: string; author_type: 'buyer' | 'seller' | 'system'; body: string; created_at: string };

export function DeveloperMessagesPanel({ conversations, loading, error, reload }: { conversations: DeveloperConversation[]; loading: boolean; error: string | null; reload: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [threadError, setThreadError] = useState('');
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];

  useEffect(() => { if (!selectedId && conversations[0]) setSelectedId(conversations[0].id); }, [conversations, selectedId]);

  const loadThread = useCallback(async (conversationId: string) => {
    setThreadLoading(true);
    setThreadError('');
    try {
      const response = await fetch(`/api/developer/messages?conversationId=${encodeURIComponent(conversationId)}`, { cache: 'no-store' });
      const payload = await response.json() as { messages?: ChatMessage[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить диалог.');
      setMessages(payload.messages ?? []);
      await reload();
    } catch (caught) {
      setThreadError(caught instanceof Error ? caught.message : 'Не удалось загрузить диалог.');
    } finally {
      setThreadLoading(false);
    }
  }, [reload]);

  useEffect(() => { if (selected?.id) void loadThread(selected.id); else setMessages([]); }, [loadThread, selected?.id]);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = body.trim();
    if (!selected || !message) return;
    setSubmitting(true);
    setThreadError('');
    try {
      const response = await fetch('/api/developer/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: selected.id, body: message }) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось отправить ответ.');
      setBody('');
      await loadThread(selected.id);
    } catch (caught) {
      setThreadError(caught instanceof Error ? caught.message : 'Не удалось отправить ответ.');
    } finally {
      setSubmitting(false);
    }
  }

  const unread = conversations.reduce((total, conversation) => total + Number(conversation.unread_count), 0);

  return (
    <section className="dashboard-panel developer-messages-panel" id="developer-messages">
      <div className="panel-heading"><div><h2>Сообщения покупателей</h2><p>Переписка сохраняет квартиру и контакт клиента</p></div><Badge className={`project-status ${unread ? 'pending' : 'published'}`}>{unread ? `${unread} новых` : 'Все прочитано'}</Badge></div>
      {error ? <div className="developer-message-empty"><MessageCircle /><p>{error}</p><Button variant="outline" onClick={() => void reload()}>Повторить</Button></div> : loading ? <div className="developer-message-empty"><p>Загружаем диалоги…</p></div> : conversations.length === 0 ? <div className="developer-message-empty"><MessageCircle /><div><strong>Диалогов пока нет</strong><p>Когда покупатель напишет со страницы квартиры, обращение появится здесь.</p></div></div> : <div className="developer-message-layout">
        <div className="developer-conversation-list">{conversations.map((conversation) => <button type="button" className={selected?.id === conversation.id ? 'active' : ''} onClick={() => setSelectedId(conversation.id)} key={conversation.id}><span><UserRound /></span><div><strong>{conversation.buyer_name}</strong><small>{conversation.complex_name} · № {conversation.unit_number}</small><p>{conversation.last_message ?? 'Диалог открыт'}</p></div>{Number(conversation.unread_count) > 0 && <em>{conversation.unread_count}</em>}</button>)}</div>
        <div className="developer-thread">
          {selected && <div className="developer-thread-context"><span><Building2 /></span><div><strong>{selected.complex_name} · № {selected.unit_number}</strong><small>{selected.rooms} комнаты · {selected.area_sqm} м² · {selected.buyer_email}</small></div></div>}
          <div className="developer-thread-messages">{threadLoading ? <p className="developer-thread-state">Загружаем переписку…</p> : messages.length ? messages.map((message) => <article className={message.author_type} key={message.id}><small>{message.author_type === 'seller' ? 'Вы' : selected?.buyer_name ?? 'Покупатель'}</small><p>{message.body}</p><time>{new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(`${message.created_at.replace(' ', 'T')}Z`))}</time></article>) : <p className="developer-thread-state">В диалоге пока нет сообщений.</p>}</div>
          <form className="developer-thread-compose" onSubmit={submit}><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Ответить покупателю…" maxLength={1000} required/><Button type="submit" disabled={submitting || !body.trim()}><Send /> {submitting ? 'Отправляем…' : 'Ответить'}</Button></form>
          {threadError && <p className="developer-thread-error">{threadError}</p>}
        </div>
      </div>}
    </section>
  );
}
