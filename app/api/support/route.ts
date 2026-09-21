import { env } from 'cloudflare:workers';

import { ensureMarketplaceDatabase } from '@/lib/database';
import { sameOrigin } from '@/lib/password-auth';

export const dynamic = 'force-dynamic';

type SupportEnv = Cloudflare.Env & {
  RESEND_API_KEY?: string;
  SUPPORT_EMAIL?: string;
  SUPPORT_FROM_EMAIL?: string;
};

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character]!,
  );
}

async function sourceHash(request: Request) {
  const source =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'local';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(source),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json(
      { message: 'Недопустимый источник запроса.' },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = clean(body.fullName, 100);
    const email = clean(body.email, 200).toLowerCase();
    const subject = clean(body.subject, 140) || 'Вопрос с сайта EstateHub';
    const message = clean(body.message, 3000);
    const locale = ['ru', 'uz', 'en'].includes(String(body.locale))
      ? String(body.locale)
      : 'ru';

    if (fullName.length < 2 || !validEmail(email) || message.length < 10) {
      return Response.json(
        {
          error: 'validation_failed',
          message: 'Проверьте имя, email и текст вопроса.',
        },
        { status: 400 },
      );
    }

    const database = await ensureMarketplaceDatabase();
    const hash = await sourceHash(request);
    const recent = await database
      .prepare(
        `SELECT COUNT(*) AS count FROM support_requests
         WHERE source_hash = ? AND created_at >= datetime('now', '-1 hour')`,
      )
      .bind(hash)
      .first<{ count: number }>();
    if ((recent?.count ?? 0) >= 5) {
      return Response.json(
        {
          error: 'rate_limited',
          message: 'Слишком много обращений. Попробуйте через час.',
        },
        { status: 429 },
      );
    }

    const id = crypto.randomUUID();
    await database
      .prepare(
        `INSERT INTO support_requests
         (id, full_name, email, subject, message, locale, source_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, fullName, email, subject, message, locale, hash)
      .run();

    const runtime = env as SupportEnv;
    if (!runtime.RESEND_API_KEY || !runtime.SUPPORT_EMAIL) {
      return Response.json(
        {
          requestId: id,
          deliveryStatus: 'queued',
          message: 'Вопрос принят службой поддержки.',
        },
        { status: 202 },
      );
    }

    const delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${runtime.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:
          runtime.SUPPORT_FROM_EMAIL ||
          'EstateHub Support <support@estatehub.uz>',
        to: [runtime.SUPPORT_EMAIL],
        reply_to: email,
        subject: `[EstateHub] ${subject}`,
        html: `<h2>Новый вопрос с EstateHub</h2><p><strong>Имя:</strong> ${escapeHtml(fullName)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Язык:</strong> ${escapeHtml(locale)}</p><p><strong>Тема:</strong> ${escapeHtml(subject)}</p><hr><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      }),
    });
    const deliveryPayload = (await delivery.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };

    if (!delivery.ok) {
      await database
        .prepare(
          `UPDATE support_requests SET delivery_status = 'failed', delivery_provider = 'resend', delivery_error = ? WHERE id = ?`,
        )
        .bind(
          clean(deliveryPayload.message, 500) || 'Email delivery failed',
          id,
        )
        .run();
      return Response.json(
        {
          requestId: id,
          deliveryStatus: 'failed',
          message: 'Вопрос сохранён, но письмо временно не отправлено.',
        },
        { status: 502 },
      );
    }

    await database
      .prepare(
        `UPDATE support_requests SET delivery_status = 'sent', delivery_provider = 'resend', delivery_reference = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .bind(deliveryPayload.id ?? null, id)
      .run();
    return Response.json(
      {
        requestId: id,
        deliveryStatus: 'sent',
        message: 'Вопрос отправлен в службу поддержки.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to submit support request', error);
    return Response.json(
      {
        error: 'support_request_failed',
        message: 'Не удалось отправить вопрос. Попробуйте ещё раз.',
      },
      { status: 500 },
    );
  }
}
