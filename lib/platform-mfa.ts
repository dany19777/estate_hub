import { env } from 'cloudflare:workers';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function newTotpSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = 0;
  let value = 0;
  let result = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}

function decodeBase32(secret: string) {
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const character of secret.toUpperCase().replace(/=+$/, '')) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error('Invalid MFA secret');
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export async function totpCode(secret: string, step: number, digits = 6) {
  const key = await crypto.subtle.importKey('raw', decodeBase32(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const counter = new ArrayBuffer(8);
  new DataView(counter).setBigUint64(0, BigInt(step), false);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter));
  const offset = digest[digest.length - 1] & 15;
  const value = (((digest[offset] & 127) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3]) >>> 0;
  return String(value % (10 ** digits)).padStart(digits, '0');
}

export async function matchingTotpStep(secret: string, candidate: string, lastUsedStep: number, now = Date.now()) {
  if (!/^\d{6}$/.test(candidate)) return null;
  const current = Math.floor(now / 30_000);
  for (const step of [current - 1, current, current + 1]) {
    if (step <= lastUsedStep || step < 0) continue;
    const expected = await totpCode(secret, step);
    let difference = 0;
    for (let index = 0; index < 6; index += 1) difference |= candidate.charCodeAt(index) ^ expected.charCodeAt(index);
    if (difference === 0) return step;
  }
  return null;
}

function encryptionKeyBytes() {
  const encoded = (env as Cloudflare.Env & { ESTATEHUB_MFA_ENCRYPTION_KEY?: string }).ESTATEHUB_MFA_ENCRYPTION_KEY;
  if (!encoded) throw new Error('MFA encryption key is not configured');
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  if (raw.length !== 32) throw new Error('Invalid MFA encryption key');
  return raw;
}

async function encryptionKey() {
  return crypto.subtle.importKey('raw', encryptionKeyBytes(), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
}

export async function encryptTotpSecret(secret: string, userId: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) }, await encryptionKey(), new TextEncoder().encode(secret));
  return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}

export async function decryptTotpSecret(value: string, userId: string) {
  const [iv, ciphertext] = value.split('.');
  if (!iv || !ciphertext) throw new Error('Invalid MFA credential');
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64url(iv), additionalData: new TextEncoder().encode(userId) }, await encryptionKey(), fromBase64url(ciphertext));
  return new TextDecoder().decode(plaintext);
}
