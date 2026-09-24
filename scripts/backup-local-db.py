#!/usr/bin/env python3
"""Create and verify a private snapshot of the local EstateHub D1 database."""

import argparse
import hashlib
import os
import sqlite3
import tempfile
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path


def open_existing(path: Path) -> sqlite3.Connection:
    # Miniflare's WAL database cannot be opened with mode=ro on some hosts.
    # mode=rw refuses to create a missing file; query_only prevents SQL writes.
    connection = sqlite3.connect(f"file:{path}?mode=rw", uri=True)
    connection.execute("PRAGMA query_only = ON")
    return connection


def has_marketplace_tables(path: Path) -> bool:
    try:
        with closing(open_existing(path)) as connection:
            return connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'"
            ).fetchone() is not None
    except sqlite3.DatabaseError:
        return False


def select_database(root: Path) -> Path:
    candidates = [
        path
        for path in root.glob(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite")
        if has_marketplace_tables(path)
    ]
    if len(candidates) != 1:
        raise SystemExit(f"Expected one local EstateHub D1 database, found {len(candidates)}")
    return candidates[0]


def assert_integrity(connection: sqlite3.Connection) -> None:
    if connection.execute("PRAGMA integrity_check").fetchone() != ("ok",):
        raise RuntimeError("SQLite integrity_check failed")


def table_counts(connection: sqlite3.Connection) -> dict[str, int]:
    tables = ["users", "organizations", "complexes", "listings", "auth_sessions"]
    return {
        table: connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        for table in tables
    }


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=None)
    parser.add_argument("--output-dir", type=Path, default=root / "work" / "backups")
    args = parser.parse_args()
    source = args.database or select_database(root)
    if not has_marketplace_tables(source):
        raise SystemExit("Source is not an EstateHub database")

    os.umask(0o077)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    snapshot = args.output_dir / f"estatehub-local-{timestamp}.sqlite"
    if snapshot.exists():
        raise SystemExit("A snapshot with this timestamp already exists")

    with closing(open_existing(source)) as original:
        with closing(sqlite3.connect(snapshot)) as backup:
            original.backup(backup)
            assert_integrity(backup)
            expected_counts = table_counts(backup)

    try:
        with tempfile.TemporaryDirectory(prefix="estatehub-restore-") as directory:
            restored_path = Path(directory) / "restored.sqlite"
            with closing(open_existing(snapshot)) as backup:
                with closing(sqlite3.connect(restored_path)) as restored:
                    backup.backup(restored)
                    assert_integrity(restored)
                    if table_counts(restored) != expected_counts:
                        raise RuntimeError("Restored table counts do not match the snapshot")
    except Exception:
        snapshot.unlink(missing_ok=True)
        raise

    checksum = hashlib.sha256()
    with snapshot.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            checksum.update(chunk)
    print(f"Snapshot verified: {snapshot}")
    print(f"SHA-256: {checksum.hexdigest()}")
    print("Restore rehearsal: passed")


if __name__ == "__main__":
    main()
