#!/usr/bin/env python3
"""Validate the complete migration chain and optionally local D1 tracking."""

import argparse
import sqlite3
from contextlib import closing
from pathlib import Path


def migration_names(root: Path) -> list[str]:
    names = [path.name for path in sorted((root / "drizzle").glob("*.sql"))]
    if not names or len(names) != len(set(names)):
        raise SystemExit("Migration files are missing or duplicated")
    return names


def check_fresh(root: Path, names: list[str]) -> None:
    with closing(sqlite3.connect(":memory:")) as database:
        for name in names:
            database.executescript((root / "drizzle" / name).read_text())
        if database.execute("PRAGMA integrity_check").fetchone() != ("ok",):
            raise SystemExit("Fresh migration chain failed integrity_check")
        columns = {row[1] for row in database.execute("PRAGMA table_info(auth_sessions)")}
        if "mfa_verified_at" not in columns:
            raise SystemExit("MFA session column is missing")
        for table in ["users", "listings", "platform_mfa_credentials", "platform_mfa_recovery_codes"]:
            if not database.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone():
                raise SystemExit(f"Required table is missing: {table}")
    print(f"Fresh migration chain: {len(names)} files passed")


def check_local(root: Path, names: list[str]) -> None:
    candidates = list(root.glob(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite"))
    for path in candidates:
        try:
            with closing(sqlite3.connect(f"file:{path}?mode=rw", uri=True)) as database:
                database.execute("PRAGMA query_only = ON")
                if not database.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='d1_migrations'").fetchone():
                    continue
                applied = {row[0] for row in database.execute("SELECT name FROM d1_migrations")}
                missing = set(names) - applied
                if missing:
                    raise SystemExit(f"Local D1 is missing migration records: {', '.join(sorted(missing))}")
                print(f"Local D1 migration records: {len(applied)} present")
                return
        except sqlite3.DatabaseError:
            continue
    raise SystemExit("Local EstateHub D1 database was not found")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local", action="store_true", help="also check local D1 migration records")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    names = migration_names(root)
    check_fresh(root, names)
    if args.local:
        check_local(root, names)


if __name__ == "__main__":
    main()
