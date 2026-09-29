import { getImage } from '@/lib/s3-media';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  try {
    const { key } = await context.params;
    const objectKey = key.join('/');
    if (!/^complexes\/[a-zA-Z0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(objectKey)) return new Response(null, { status: 404 });
    const object = await getImage(objectKey);
    if (!object.Body) return new Response(null, { status: 404 });
    return new Response(Buffer.from(await object.Body.transformToByteArray()), {
      headers: {
        'Content-Type': object.ContentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Image retrieval failed', error);
    return new Response(null, { status: 404 });
  }
}
