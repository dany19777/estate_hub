'use client';

import { useCallback, useEffect, useState } from 'react';

export type BuyerNotification = {
  id: string;
  event_type: string;
  title: string;
  body: string;
  href: string | null;
  entity_type: string | null;
  entity_id: string | null;
  priority: 'normal' | 'high' | 'critical';
  read_at: string | null;
  created_at: string;
  delivery_summary: string | null;
};

export type BuyerNotificationPreferences = { emailEnabled: boolean; smsCriticalEnabled: boolean; marketingConsent: boolean };

export function useNotifications() {
  const [notifications, setNotifications] = useState<BuyerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<BuyerNotificationPreferences>({ emailEnabled: true, smsCriticalEnabled: true, marketingConsent: false });
  const [channelStatus, setChannelStatus] = useState({ inApp: 'active', email: 'sandbox_queue', sms: 'sandbox_queue', push: 'not_connected' });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const apply = useCallback((payload: { notifications?: BuyerNotification[]; unreadCount?: number; preferences?: BuyerNotificationPreferences; channelStatus?: typeof channelStatus }) => {
    setNotifications(payload.notifications ?? []);
    setUnreadCount(Number(payload.unreadCount ?? 0));
    if (payload.preferences) setPreferences(payload.preferences);
    if (payload.channelStatus) setChannelStatus(payload.channelStatus);
  }, []);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/buyer/notifications', { cache: 'no-store' });
      const payload = await response.json() as Parameters<typeof apply>[0] & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить уведомления.');
      apply(payload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить уведомления.'); }
    finally { setLoading(false); }
  }, [apply]);

  useEffect(() => { const task = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(task); }, [refresh]);

  const update = useCallback(async (body: Record<string, unknown>) => {
    setProcessing(true); setError(''); setFeedback('');
    try {
      const response = await fetch('/api/buyer/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json() as Parameters<typeof apply>[0] & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось обновить уведомления.');
      apply(payload); setFeedback(payload.message ?? 'Сохранено.'); return payload.message ?? 'Сохранено.';
    } catch (reason) { const message = reason instanceof Error ? reason.message : 'Не удалось обновить уведомления.'; setError(message); throw new Error(message); }
    finally { setProcessing(false); }
  }, [apply]);

  const markRead = useCallback((notificationId: string) => update({ action: 'read', notificationId }), [update]);
  const markAllRead = useCallback(() => update({ action: 'read_all' }), [update]);
  const savePreferences = useCallback((next: BuyerNotificationPreferences) => update({ action: 'preferences', ...next }), [update]);
  return { notifications, unreadCount, preferences, channelStatus, loading, processing, error, feedback, refresh, markRead, markAllRead, savePreferences };
}
