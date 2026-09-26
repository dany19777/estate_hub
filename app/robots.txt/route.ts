import { publicIndexingOrigin } from '@/lib/public-indexing';

export function GET(request: Request) {
  const origin = publicIndexingOrigin(request);
  const body = origin
    ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /developer\nDisallow: /profile\nDisallow: /account\nDisallow: /seller\nDisallow: /login\nDisallow: /mfa\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
