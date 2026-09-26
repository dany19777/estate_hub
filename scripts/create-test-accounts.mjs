// Run locally once; output contains secrets and must remain ignored.
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
if (existsSync('work/test-accounts.json'))
  throw new Error('Credentials already exist; refusing to overwrite.');
const entries = [
  ['buyer', 'buyer@estatehub.test', 'Тестовый покупатель'],
  ['developer', 'developer@estatehub.test', 'Тестовый застройщик'],
  ['superadmin', 'admin@estatehub.test', 'Тестовый суперадмин'],
].map(([role, login, name]) => {
  const password = randomBytes(18).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return {
    id: `test-auth-${role}`,
    role,
    login,
    name,
    password,
    passwordHash: `pbkdf2-sha256$100000$${salt}$${hash}`,
  };
});
mkdirSync('work', { recursive: true });
writeFileSync('work/test-accounts.json', JSON.stringify(entries, null, 2), {
  mode: 0o600,
});
const config = JSON.stringify(entries.map(({ password: _password, ...entry }) => entry));
writeFileSync(
  '.dev.vars',
  `ESTATEHUB_TEST_ACCOUNTS=${Buffer.from(config).toString('base64')}\n`,
  { mode: 0o600 },
);
console.log(
  'Three random credentials generated in ignored work/test-accounts.json; .dev.vars contains hashes only.',
);
