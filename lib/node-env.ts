import { postgresDatabase } from './postgres-d1';

export const env = new Proxy(process.env, {
  get(target, property) {
    if (property === 'DB') return postgresDatabase();
    return Reflect.get(target, property);
  },
}) as unknown as Cloudflare.Env;
