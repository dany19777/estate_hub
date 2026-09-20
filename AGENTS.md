# EstateHub working agreement

- After every significant, tested change, commit and push it to the GitHub origin. User explicitly requested this on 2026-09-21.
- Never commit credentials, tokens, plaintext test passwords, local database state or environment files.
- Preserve the existing visual language: light buyer pages, dark developer/admin dashboards.
- Enforce roles and ownership on the server; hiding navigation is not authorization.
- Append migrations; do not rewrite published migrations.
- Run production build and relevant behavior checks before pushing functional changes.
- GitHub push and Sites deployment are separate operations. Preserve the private Sites audience.
