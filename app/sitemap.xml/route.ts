import { readMarketplaceData } from '@/lib/database';
import { escapeXml, publicIndexingOrigin } from '@/lib/public-indexing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = publicIndexingOrigin(request);
  if (!origin) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  try {
    const { complexes, listings } = await readMarketplaceData();
    const paths = ['/', '/catalog', ...complexes.map((complex) => `/complex/${encodeURIComponent(complex.slug)}`),
      ...listings.map((listing) => `/listing/${encodeURIComponent(listing.id)}`)];
    const entries = paths.map((path) => `<url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`).join('');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=900' },
    });
  } catch (error) {
    console.error('Failed to build sitemap', error);
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
