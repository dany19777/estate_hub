# EstateHub: VPS deployment

The production stack uses Docker Compose on the project VPS. PostgreSQL 16 is the **only application database**. Redis 7 caches public catalog responses for 15 seconds and can be safely flushed. SeaweedFS 4.47 provides a private S3-compatible API for uploaded complex images. Caddy is the TLS reverse proxy to `127.0.0.1:3008`. PostgreSQL, Redis, and the object store publish no host ports. The app alone has a loopback-bound port.

The temporary address `https://estatehub.161.97.107.6.sslip.io` is live behind HTTP Basic authentication while production accounts and catalog content are being decided. The access credentials are stored only in `/opt/estatehub/staging-access.txt` (root-only). Do not remove this gate until the release prerequisites below are complete. Search indexing remains disabled.

`/opt/estatehub/.env` is root-readable (0600) and is never committed. It holds database, S3, and MFA secrets plus optional email settings. `ESTATEHUB_SEED_DEMO` and `ESTATEHUB_TEST_ACCOUNTS` must **never** be configured on this deployment. Keep `LEGAL_DOCUMENTS_PUBLISHED=no` and `ESTATEHUB_SELF_REGISTRATION=disabled` until approved legal texts replace the current placeholders and the registration/payment flows are reviewed. The migration job applies versioned schema changes and seeds only geography, tariff reference data, and platform billing defaults. It creates no users, listings, or demo data.

Deploy from a reviewed revision, preserving `/opt/estatehub/.env` and named Docker volumes:

```sh
cd /opt/estatehub
docker compose --env-file .env -f compose.production.yaml up -d --build
docker compose --env-file .env -f compose.production.yaml ps
curl --fail http://127.0.0.1:3008/api/complexes
```

The buyer, developer, and administrator flows must be tested against the PostgreSQL deployment before Caddy makes it public. The local `work/` data and demo accounts are not production fixtures. An administrator must be provisioned from a real owner email, with a separate password and authenticator setup. Email sending needs a verified sending domain and provider key; SMS remains disabled until a provider is connected. Manual employee identity checks require approved document types, access rules, and retention periods.

Back up the live database and S3 objects with `bash scripts/backup-production.sh` on the host. A root cron job runs it daily at 03:17 server time. Backups stay under `/opt/estatehub/backups` with root-only permissions, and the script keeps seven days. A PostgreSQL dump has been restored successfully into a separate database and discarded after verification. The S3 backup path has been tested with an empty bucket; object recovery still needs a drill once real images exist. This is a **local recovery copy only**: an off-server encrypted copy remains required before declaring the system production-ready. Restore PostgreSQL from `postgres.dump` with `pg_restore` to a fresh database; restore S3 objects through the S3 API, not by replacing live volume files. Keep `.env` and MFA encryption key in a separate encrypted recovery copy.

Before opening the hostname: provision the owner's account, decide which existing local listings may be migrated and clear demo identities, verify the support email sender, publish approved legal/payment information, test manual verification and payment review, perform role-based staging checks, and run a restore drill. A hostname alone is not a completed launch.
