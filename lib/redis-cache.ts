import type { RedisClientType } from 'redis';

let client: RedisClientType | undefined;
let connecting: Promise<RedisClientType> | undefined;

async function redis() {
  if (!process.env.REDIS_URL) return null;
  if (client?.isReady) return client;
  if (!connecting) {
    const { createClient } = await import('redis');
    const next = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 1500, reconnectStrategy: () => false } });
    next.on('error', (error) => console.error('Redis cache unavailable', error));
    connecting = next.connect().then(() => {
      client = next as RedisClientType;
      return client;
    }).catch((error) => {
      connecting = undefined;
      next.destroy();
      throw error;
    });
  }
  return connecting;
}

export async function cacheJson<T>(key: string, seconds: number, load: () => Promise<T>): Promise<T> {
  let cache: RedisClientType | null = null;
  try {
    cache = await redis();
    const stored = await cache?.get(key);
    if (stored) return JSON.parse(stored) as T;
  } catch (error) {
    console.error('Redis cache read failed', error);
  }
  const value = await load();
  try {
    await cache?.set(key, JSON.stringify(value), { expiration: { type: 'EX', value: seconds } });
  } catch (error) {
    console.error('Redis cache write failed', error);
  }
  return value;
}
