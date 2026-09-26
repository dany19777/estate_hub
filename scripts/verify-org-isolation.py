#!/usr/bin/env python3
"""Local two-organization access check; temporary account is always removed."""

from __future__ import annotations

import hashlib
import http.cookiejar
import json
import os
import secrets
import sqlite3
import urllib.error
import urllib.request
import uuid
from contextlib import closing
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("ROLE_SMOKE_BASE_URL", "http://localhost:3000").rstrip("/")
ACCOUNTS = json.loads((ROOT / "work/test-accounts.json").read_text())
DEVELOPER = next(account for account in ACCOUNTS if account["role"] == "developer")


def local_database() -> Path:
    for path in ROOT.glob(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite"):
        try:
            with closing(sqlite3.connect(f"file:{path}?mode=rw", uri=True)) as database:
                if database.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").fetchone():
                    return path
        except sqlite3.DatabaseError:
            continue
    raise SystemExit("Local EstateHub D1 database not found")


def call(opener: urllib.request.OpenerDirector, method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    request = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Origin": BASE, "Content-Type": "application/json"},
        method=method,
    )
    try:
        response = opener.open(request)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.load(response)


def login(email: str, password: str) -> urllib.request.OpenerDirector:
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    status, payload = call(opener, "POST", "/api/auth/login", {"login": email, "password": password})
    if status != 200 or payload.get("redirectTo") != "/developer":
        raise RuntimeError("Developer login failed")
    return opener


def main() -> None:
    database = sqlite3.connect(local_database())
    user_id = "org-isolation-test-" + uuid.uuid4().hex
    email = user_id + "@estatehub.test"
    password = secrets.token_urlsafe(24)
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    encoded = f"pbkdf2-sha256$100000${salt}${password_hash}"
    try:
        primary = database.execute(
            "SELECT organization_id FROM organization_memberships WHERE user_id = ? AND status = 'active' LIMIT 1",
            (DEVELOPER["id"],),
        ).fetchone()
        if not primary:
            raise RuntimeError("Test developer has no organization")
        own_complex = database.execute(
            "SELECT id FROM complexes WHERE developer_org_id = ? LIMIT 1", primary
        ).fetchone()
        secondary = database.execute(
            "SELECT organization.id, organization.name FROM organizations organization "
            "JOIN complexes complex ON complex.developer_org_id = organization.id "
            "WHERE organization.id <> ? AND organization.verification_status = 'verified' LIMIT 1",
            primary,
        ).fetchone()
        if not own_complex or not secondary:
            raise RuntimeError("Two organizations with complexes are required")
        own_complex_ids = {row[0] for row in database.execute("SELECT id FROM complexes WHERE developer_org_id = ?", primary)}
        secondary_complex_ids = {row[0] for row in database.execute("SELECT id FROM complexes WHERE developer_org_id = ?", (secondary[0],))}
        secondary_listing_ids = {row[0] for row in database.execute("SELECT id FROM listings WHERE seller_org_id = ?", (secondary[0],))}

        database.execute("INSERT INTO users (id, external_user_id, email, full_name) VALUES (?, ?, ?, ?)", (user_id, "password:" + user_id, email, "Organization Isolation Test"))
        database.execute("INSERT INTO auth_credentials (user_id, login, password_hash) VALUES (?, ?, ?)", (user_id, email, encoded))
        database.execute("INSERT INTO organization_memberships (organization_id, user_id, role, status) VALUES (?, ?, 'OWNER', 'active')", (secondary[0], user_id))
        database.commit()

        primary_session = login(DEVELOPER["login"], DEVELOPER["password"])
        secondary_session = login(email, password)
        status, primary_projects = call(primary_session, "GET", "/api/developer/complexes")
        if status != 200 or {row["id"] for row in primary_projects["projects"]} != own_complex_ids:
            raise RuntimeError("Primary developer project scope is incorrect")
        status, other_projects = call(secondary_session, "GET", "/api/developer/complexes")
        if status != 200 or {row["id"] for row in other_projects["projects"]} != secondary_complex_ids:
            raise RuntimeError("Second developer project scope is incorrect")
        status, workspace = call(secondary_session, "GET", "/api/developer/workspace")
        if status != 200 or workspace["organization"]["name"] != secondary[1]:
            raise RuntimeError("Second developer workspace scope is incorrect")
        if not {row["listing_id"] for row in workspace["units"]}.issubset(secondary_listing_ids):
            raise RuntimeError("Second developer can see another company's units")
        before = database.execute("SELECT COUNT(*) FROM units").fetchone()[0]
        status, payload = call(secondary_session, "POST", "/api/developer/units", {
            "complexId": own_complex[0], "buildingName": "Isolation test", "unitNumber": "X-999",
            "totalFloors": 10, "floorNumber": 2, "rooms": 2, "areaSqm": 70,
            "priceUzs": 500_000_000, "finish": "Чистовая",
        })
        after = database.execute("SELECT COUNT(*) FROM units").fetchone()[0]
        if status != 404 or payload.get("error") != "not_found" or before != after:
            raise RuntimeError("Cross-organization unit creation was not blocked")
        primary_lead = database.execute("SELECT id FROM leads WHERE organization_id = ? LIMIT 1", primary).fetchone()
        if primary_lead:
            status, payload = call(secondary_session, "PATCH", "/api/developer/leads", {
                "leadId": primary_lead[0], "action": "assign", "userId": user_id,
            })
            if status != 404 or payload.get("error") != "not_found":
                raise RuntimeError("Cross-organization lead assignment was not blocked")
        print("Organization isolation: project lists, workspace, units and lead assignment passed")
    finally:
        for table in ["auth_sessions", "organization_memberships", "auth_credentials"]:
            database.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
        database.execute("DELETE FROM audit_events WHERE actor_id = ? OR entity_id = ?", (user_id, user_id))
        database.execute("DELETE FROM users WHERE id = ?", (user_id,))
        database.commit()
        database.close()


if __name__ == "__main__":
    main()
