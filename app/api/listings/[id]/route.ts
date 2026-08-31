import { readListingDetail } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const detail = await readListingDetail(id);
    if (!detail) return Response.json({ error: 'not_found', message: 'Объявление не найдено или уже снято с публикации.' }, { status: 404 });
    return Response.json(detail, { headers: { 'Cache-Control': 'public, max-age=20, stale-while-revalidate=60' } });
  } catch (error) {
    console.error('Failed to load listing detail', error);
    return Response.json({ error: 'listing_unavailable', message: 'Не удалось загрузить объявление.' }, { status: 500 });
  }
}
