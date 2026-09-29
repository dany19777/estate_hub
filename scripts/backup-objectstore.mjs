import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination)) throw new Error('Absolute backup destination required');
const bucket = process.env.S3_BUCKET;
if (!bucket) throw new Error('S3_BUCKET is not configured');
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
});
let continuationToken;
let count = 0;
do {
  const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }));
  for (const object of page.Contents ?? []) {
    const key = object.Key;
    if (!key || key.startsWith('/') || key.split('/').includes('..')) throw new Error('Invalid S3 object key');
    const target = path.join(destination, key);
    await mkdir(path.dirname(target), { recursive: true });
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) throw new Error(`S3 object has no body: ${key}`);
    await writeFile(target, Buffer.from(await response.Body.transformToByteArray()));
    count += 1;
  }
  continuationToken = page.NextContinuationToken;
} while (continuationToken);
process.stdout.write(`Backed up ${count} S3 objects\n`);
