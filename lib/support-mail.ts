import { env } from 'cloudflare:workers';

type SupportMailEnv = Cloudflare.Env & {
  RESEND_API_KEY?: string;
  SUPPORT_EMAIL?: string;
  SUPPORT_FROM_EMAIL?: string;
};

export type SupportMailRequest = {
  id: string;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  locale: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]!);
}

export function supportMailConfigured() {
  const runtime = env as SupportMailEnv;
  return Boolean(runtime.RESEND_API_KEY && runtime.SUPPORT_EMAIL && runtime.SUPPORT_FROM_EMAIL);
}

export async function deliverSupportMail(item: SupportMailRequest) {
  const runtime = env as SupportMailEnv;
  if (!runtime.RESEND_API_KEY || !runtime.SUPPORT_EMAIL || !runtime.SUPPORT_FROM_EMAIL) {
    return { ok: false, error: 'Почтовый сервис ещё не настроен.', reference: null };
  }
  try {
    const delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${runtime.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `support-${item.id}`,
      },
      body: JSON.stringify({
        from: runtime.SUPPORT_FROM_EMAIL,
        to: [runtime.SUPPORT_EMAIL],
        reply_to: item.email,
        subject: `[EstateHub] ${item.subject}`,
        html: `<h2>Новый вопрос с EstateHub</h2><p><strong>Имя:</strong> ${escapeHtml(item.full_name)}</p><p><strong>Email:</strong> ${escapeHtml(item.email)}</p><p><strong>Язык:</strong> ${escapeHtml(item.locale)}</p><p><strong>Тема:</strong> ${escapeHtml(item.subject)}</p><hr><p>${escapeHtml(item.message).replace(/\n/g, '<br>')}</p>`,
      }),
    });
    const payload = await delivery.json().catch(() => ({})) as { id?: string; message?: string };
    return { ok: delivery.ok, error: delivery.ok ? null : (payload.message ?? 'Почтовый сервис отклонил письмо.').slice(0, 500), reference: delivery.ok ? payload.id ?? null : null };
  } catch {
    return { ok: false, error: 'Не удалось связаться с почтовым сервисом.', reference: null };
  }
}
