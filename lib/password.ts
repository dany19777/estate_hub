// Workers Web Crypto supports at most 100,000 PBKDF2 iterations per call.
// Versioned encoding allows rehashing when the deployment's KDF changes.
const ITERATIONS = 100_000;
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}
export async function tokenHash(value: string) {
  return hex(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  );
}
export async function hashPassword(
  password: string,
  salt = hex(crypto.getRandomValues(new Uint8Array(16))),
) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(salt),
      iterations: ITERATIONS,
    },
    key,
    256,
  );
  return `pbkdf2-sha256$${ITERATIONS}$${salt}$${hex(new Uint8Array(bits))}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, rounds, salt, digest] = encoded.split('$');
  if (
    algorithm !== 'pbkdf2-sha256' ||
    rounds !== String(ITERATIONS) ||
    !/^[a-f0-9]{32}$/.test(salt ?? '') ||
    !/^[a-f0-9]{64}$/.test(digest ?? '')
  )
    return false;
  const computed = await hashPassword(password, salt);
  let difference = computed.length ^ encoded.length;
  for (let i = 0; i < computed.length; i++)
    difference |= computed.charCodeAt(i) ^ encoded.charCodeAt(i);
  return difference === 0;
}
