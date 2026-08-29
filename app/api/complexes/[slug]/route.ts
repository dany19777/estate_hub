import { readComplexDetail } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const detail = await readComplexDetail(slug);
    if (!detail) return Response.json({ error: 'not_found', message: 'Жилой комплекс не найден.' }, { status: 404 });
    return Response.json(detail, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } });
  } catch (error) {
    console.error('Failed to load complex detail', error);
    return Response.json({ error: 'complex_unavailable', message: 'Не удалось загрузить жилой комплекс.' }, { status: 500 });
  }
}
