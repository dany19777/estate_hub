import { env } from 'cloudflare:workers';

export function publicIndexingOrigin(request: Request) {
  const settings = env as Cloudflare.Env & { PUBLIC_INDEXING_ENABLED?: string; PUBLIC_SITE_URL?: string };
  const configured = settings.PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (settings.PUBLIC_INDEXING_ENABLED !== 'true' || !configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname) || new URL(request.url).hostname !== url.hostname) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
}
