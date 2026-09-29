import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

let client: S3Client | undefined;

function storage() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || 'us-east-1';
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  const bucket = process.env.S3_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) throw new Error('S3 media storage is not configured');
  client ??= new S3Client({ endpoint, region, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
  return { client, bucket };
}

export async function putImage(key: string, body: Uint8Array, contentType: string) {
  const { client, bucket } = storage();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
}

export async function getImage(key: string) {
  const { client, bucket } = storage();
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}
