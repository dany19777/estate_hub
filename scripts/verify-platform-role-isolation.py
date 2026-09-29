"""Local integration check: organization rights must not become platform rights."""

import base64
import hashlib
import hmac
import json
import secrets
import sqlite3
import struct
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE = "http://localhost:3000"
USER_ID = "review-dual-role-isolation-" + secrets.token_hex(4)
LOGIN = USER_ID + "@example.test"


def local_database():
    for path in (ROOT / ".wrangler/state/v3/d1/miniflare-D1DatabaseObject").glob("*.sqlite"):
        connection = sqlite3.connect(path, timeout=30)
        if connection.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").fetchone():
            connection.execute("PRAGMA busy_timeout = 30000")
            return connection
        connection.close()
    raise RuntimeError("Local D1 database was not found")


def request(path, method="GET", body=None, cookie=""):
    headers = {"Origin": BASE, "Content-Type": "application/json"}
    if cookie:
        headers["Cookie"] = cookie
    payload = json.dumps(body).encode() if body is not None else None
    operation = urllib.request.Request(BASE + path, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(operation) as response:
            return response.status, dict(response.headers), json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), json.load(error)


def totp(secret):
    key = base64.b32decode(secret)
    step = int(time.time() // 30)
    digest = hmac.new(key, struct.pack(">Q", step), hashlib.sha1).digest()
    offset = digest[-1] & 15
    value = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 1_000_000:06d}"


database = local_database()
password = secrets.token_urlsafe(24)
salt = secrets.token_hex(16)
digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
password_hash = f"pbkdf2-sha256$100000${salt}${digest}"
try:
    with database:
        database.execute("INSERT INTO users (id, external_user_id, email, full_name) VALUES (?, ?, ?, ?)", (USER_ID, USER_ID, LOGIN, "Role isolation test"))
        database.execute("INSERT INTO auth_credentials (user_id, login, password_hash) VALUES (?, ?, ?)", (USER_ID, LOGIN, password_hash))
        database.execute("INSERT INTO platform_role_assignments (user_id, role) VALUES (?, 'SUPPORT')", (USER_ID,))
        database.execute("INSERT INTO organization_memberships (organization_id, user_id, role, status) VALUES ('org-samarkand-development', ?, 'OWNER', 'active')", (USER_ID,))

    status, headers, payload = request("/api/auth/login", "POST", {"login": LOGIN, "password": password})
    assert status == 200 and payload.get("redirectTo") == "/mfa", f"Login: {status}"
    cookie = next(value for key, value in headers.items() if key.lower() == "set-cookie").split(";", 1)[0]
    status, _, setup = request("/api/auth/mfa", "POST", {}, cookie)
    assert status == 200 and setup.get("secret"), f"MFA setup: {status}"
    status, _, _ = request("/api/auth/mfa", "PATCH", {"code": totp(setup["secret"])}, cookie)
    assert status == 200, f"MFA verify: {status}"

    for path, expected in (
        ("/api/admin/support", 200),
        ("/api/admin/billing", 403),
        ("/api/admin/promotions", 403),
        ("/api/admin/audit", 403),
        ("/api/developer/billing", 200),
    ):
        status, _, _ = request(path, cookie=cookie)
        assert status == expected, f"{path}: {status}, expected {expected}"
    print("Dual-role isolation: platform SUPPORT cannot inherit organization billing/promotions access")
finally:
    with database:
        database.execute("DELETE FROM auth_sessions WHERE user_id = ?", (USER_ID,))
        database.execute("DELETE FROM platform_mfa_recovery_codes WHERE user_id = ?", (USER_ID,))
        database.execute("DELETE FROM platform_mfa_credentials WHERE user_id = ?", (USER_ID,))
        database.execute("DELETE FROM platform_role_assignments WHERE user_id = ?", (USER_ID,))
        database.execute("DELETE FROM organization_memberships WHERE user_id = ?", (USER_ID,))
        database.execute("DELETE FROM auth_credentials WHERE user_id = ?", (USER_ID,))
        database.execute("DELETE FROM audit_events WHERE actor_id = ?", (USER_ID,))
        database.execute("DELETE FROM auth_rate_limits WHERE bucket IN (?, ?)", ("login:" + hashlib.sha256(LOGIN.encode()).hexdigest(), "mfa:" + USER_ID))
        database.execute("DELETE FROM users WHERE id = ?", (USER_ID,))
    database.close()
