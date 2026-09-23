import { env } from 'cloudflare:workers';

// Demo grants are usable only on the local test site with test accounts enabled.
// A copied database cannot turn these grants into production payment evidence.
export function localSandboxEnabled(request: Request) {
  const hostname = new URL(request.url).hostname;
  return (hostname === 'localhost' || hostname === '127.0.0.1') &&
    Boolean((env as Cloudflare.Env & { ESTATEHUB_TEST_ACCOUNTS?: string }).ESTATEHUB_TEST_ACCOUNTS);
}
