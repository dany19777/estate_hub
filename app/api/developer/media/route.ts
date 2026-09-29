import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { putImage } from '@/lib/s3-media';

export const dynamic = 'force-dynamic';

const imageTypes: Record<string, { ext: string; valid: (bytes: Uint8Array) => boolean }> = {
  'image/jpeg': { ext: 'jpg', valid: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/png': { ext: 'png', valid: (bytes) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  'image/webp': { ext: 'webp', valid: (bytes) => String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP' },
};

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_COMPLEXES');
    if (!session.organization) return Response.json({ error: 'organization_required' }, { status: 409 });
    const form = await request.formData();
    const complexId = form.get('complexId');
    const image = form.get('image');
    if (typeof complexId !== 'string' || !(image instanceof File) || image.size < 1 || image.size > 8 * 1024 * 1024 || !imageTypes[image.type]) {
      return Response.json({ error: 'invalid_image', message: 'Выберите JPG, PNG или WebP до 8 МБ.' }, { status: 400 });
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    const type = imageTypes[image.type];
    if (!type.valid(bytes)) return Response.json({ error: 'invalid_image', message: 'Формат файла не соответствует изображению.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const complex = await database.prepare(`SELECT id, name FROM complexes WHERE id = ? AND developer_org_id = ? LIMIT 1`).bind(complexId, session.organization.id).first<{ id: string; name: string }>();
    if (!complex) return Response.json({ error: 'not_found' }, { status: 404 });
    const key = `complexes/${complex.id}/${crypto.randomUUID()}.${type.ext}`;
    await putImage(key, bytes, image.type);
    const url = `/api/media/${key}`;
    const mediaId = crypto.randomUUID();
    const existing = await database.prepare(`SELECT COUNT(*) AS count FROM media_assets WHERE entity_type = 'complex' AND entity_id = ? AND media_type = 'image'`).bind(complex.id).first<{ count: number }>();
    await database.batch([
      database.prepare(`INSERT INTO media_assets (id, entity_type, entity_id, media_type, url, alt_text, sort_order) VALUES (?, 'complex', ?, 'image', ?, ?, ?)`).bind(mediaId, complex.id, url, complex.name, existing?.count ?? 0),
      database.prepare(`UPDATE complexes SET hero_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(url, complex.id),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'complex.image_uploaded', 'complex', ?, ?)`).bind(crypto.randomUUID(), session.user.id, complex.id, JSON.stringify({ mediaId })),
    ]);
    return Response.json({ id: mediaId, url }, { status: 201 });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Image upload failed', error);
    return Response.json({ error: 'upload_failed', message: 'Не удалось загрузить фото.' }, { status: 500 });
  }
}
