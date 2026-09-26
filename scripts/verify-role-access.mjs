import { readFile } from 'node:fs/promises';

const baseUrl = process.env.ROLE_SMOKE_BASE_URL ?? 'http://localhost:3000';
const accountsPath = process.env.ROLE_SMOKE_ACCOUNTS_FILE ?? 'work/test-accounts.json';
const accounts = JSON.parse(await readFile(accountsPath, 'utf8'));
const byRole = Object.fromEntries(accounts.map((account) => [account.role, account]));
const checks = [
  { path: '/api/session', expected: { anonymous: 401, buyer: 200, developer: 200, superadmin: 403 } },
  { path: '/api/buyer/favorites', expected: { anonymous: 401, buyer: 200, developer: 200, superadmin: 403 } },
  { path: '/api/developer/workspace', expected: { anonymous: 401, buyer: 403, developer: 200, superadmin: 403 } },
  { path: '/api/admin/users', expected: { anonymous: 401, buyer: 403, developer: 403, superadmin: 403 } },
  { path: '/api/admin/billing/export', expected: { anonymous: 401, buyer: 403, developer: 403, superadmin: 403 } },
  { path: '/api/admin/finance/export', expected: { anonymous: 401, buyer: 403, developer: 403, superadmin: 403 } },
  ...['complexes', 'billing', 'leads', 'messages', 'promotions', 'reservations', 'reviews', 'workspace'].map((section) => ({
    path: `/api/developer/${section}`,
    expected: { anonymous: 401, buyer: 403, developer: 200, superadmin: 403 },
  })),
  ...['audit', 'billing', 'directory', 'disputes', 'finance', 'moderation', 'promotions', 'reviews', 'support', 'verifications'].map((section) => ({
    path: `/api/admin/${section}`,
    expected: { anonymous: 401, buyer: 403, developer: 403, superadmin: 403 },
  })),
];
const mutationChecks = [
  { method: 'POST', path: '/api/developer/complexes', expected: { anonymous: 401, buyer: 403, developer: 400, superadmin: 403 } },
  { method: 'PATCH', path: '/api/admin/moderation', expected: { anonymous: 401, buyer: 403, developer: 403, superadmin: 403 } },
  { method: 'PATCH', path: '/api/admin/users', expected: { anonymous: 401, buyer: 403, developer: 403, superadmin: 403 } },
  ...['billing', 'directory', 'disputes', 'finance', 'promotions', 'reviews', 'support', 'verifications'].map((section) => ({
    method: 'PATCH', path: `/api/admin/${section}`,
    expected: { anonymous: 401, buyer: 403, developer: 403, superadmin: 403 },
  })),
  ...['complexes', 'units', 'workspace', 'messages', 'promotions', 'billing'].map((section) => ({
    method: 'POST', path: `/api/developer/${section}`,
    expected: { anonymous: 401, buyer: 403, superadmin: 403 },
  })),
  ...['workspace', 'reservations', 'reviews', 'billing', 'leads'].map((section) => ({
    method: 'PATCH', path: `/api/developer/${section}`,
    expected: { anonymous: 401, buyer: 403, superadmin: 403 },
  })),
];

if (!['buyer', 'developer', 'superadmin'].every((role) => byRole[role]?.login && byRole[role]?.password)) {
  throw new Error('Нужны тестовые аккаунты buyer, developer и superadmin.');
}

const cookies = { anonymous: '' };
for (const role of ['buyer', 'developer', 'superadmin']) {
  const response = await fetch(new URL('/api/auth/login', baseUrl), {
    method: 'POST',
    headers: { Origin: baseUrl, 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: byRole[role].login, password: byRole[role].password }),
  });
  if (response.status !== 200) throw new Error(`${role}: вход вернул HTTP ${response.status}`);
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error(`${role}: сервер не выдал cookie`);
  cookies[role] = cookie;
  const { redirectTo } = await response.json();
  const expected = role === 'superadmin' ? '/mfa' : role === 'developer' ? '/developer' : '/profile';
  if (redirectTo !== expected) throw new Error(`${role}: перенаправление ${redirectTo}, ожидалось ${expected}`);
}

let passed = 0;
for (const { path, expected } of checks) {
  for (const [role, status] of Object.entries(expected)) {
    const response = await fetch(new URL(path, baseUrl), {
      headers: cookies[role] ? { Cookie: cookies[role] } : {},
      cache: 'no-store',
    });
    const payload = await response.json();
    if (response.status !== status) throw new Error(`${role} ${path}: HTTP ${response.status}, ожидалось ${status}`);
    if (role === 'superadmin' && payload.error !== 'mfa_required') {
      throw new Error(`${role} ${path}: до MFA сервер должен отвечать mfa_required`);
    }
    passed += 1;
  }
}
for (const { method, path, expected } of mutationChecks) {
  for (const [role, status] of Object.entries(expected)) {
    const response = await fetch(new URL(path, baseUrl), {
      method,
      headers: { Origin: baseUrl, 'Content-Type': 'application/json', ...(cookies[role] ? { Cookie: cookies[role] } : {}) },
      body: '{}',
    });
    const payload = await response.json();
    if (response.status !== status) throw new Error(`${role} ${method} ${path}: HTTP ${response.status}, ожидалось ${status}`);
    if (role === 'superadmin' && payload.error !== 'mfa_required') {
      throw new Error(`${role} ${method} ${path}: до MFA сервер должен отвечать mfa_required`);
    }
    passed += 1;
  }
}
console.log(`Проверка прав доступа: ${passed} из ${passed} пройдено.`);
