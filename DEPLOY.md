# Production deployment and rollback

Updated September 6, 2026. This replaces the former Railway instructions.

## Actual environment

- App: https://fantasy.lifequestai.com
- SSH: `root@187.77.199.41`
- Source directory: `/opt/fantasy-football` is a copied source tree, not a Git checkout. Do not use `git pull` there.
- Docker Compose services: `app`, `database`. Preserve the existing proxy setup.
- App binds `127.0.0.1:3000`; MySQL uses its existing persistent volume.
- Local Git source: `/Users/lifequestaimac/fantasy-football-tracker`.
- The current Clerk instance is retained. The public key is required at build time; runtime secrets stay in the existing server `.env`. Never print or copy secrets into release logs.

## Before deployment

1. Confirm approval and exact release scope; inspect `git status` and the full diff, including new files. Preserve `.claude/` and other unrelated work.
2. Use the packageManager version from package.json (pnpm 10.4.1). Run `pnpm check`, `pnpm test`, and `pnpm build`. If a mismatched global pnpm attempts to reinstall dependencies, stop and use the installed tool entry points or the pinned package manager; do not purge dependencies as a workaround.
3. Tests with live ESPN calls can emit expected errors; inspect final results. A successful suite does not establish authenticated browser behavior.
4. Record the Git revision/release file hashes and inspect production Compose status. Compare production source with the expected base before overwriting any file.
5. Preserve the running image using a unique rollback tag. Back up the files being replaced outside the build context. Check the latest database backup checksum and gzip integrity. A checksum is not a restore rehearsal; keep database restoration testing as a separate operational task.

## Apply an approved code-only release

Transfer an explicit allowlist of approved files. Do not copy `.env`, `.claude/`, node_modules, local build output, database dumps, or unrelated files. Build with the existing Compose configuration and environment:

```sh
cd /opt/fantasy-football
docker compose build app
docker compose up -d --no-deps --no-build app
```

A build failure leaves the existing running app in place. Do not restart until the build succeeds. The Dockerfile runs TypeScript and production builds; run tests before this step. Do not run migrations or history imports for a code-only patch. Never use `docker compose down -v`.

## Verify the release

- Wait for app health; check `/api/health` reports `status: ok` and `db: connected`.
- Verify deployed assets contain the intended change and inspect startup/application errors.
- Check sign-in → dashboard → league → selected team → My Week → standings → matchups → available players → Historical Highlights, on desktop and phone where possible. State explicitly when no authenticated session is available.
- Before the draft, absent roster/projection content can be expected. Do not fabricate data to fill it.
- Confirm the next scheduled sync updates supported categories without the missing-activity-method error. Do not trigger production-data writes solely to test a UI release without authorization.
- Record the deployed source revision/file hashes, image ID, rollback tag, and verification limits.

## Roll back

Use the retained image, without rebuilding. Retag it to the app image name reported by the existing Compose configuration (currently `fantasy-football-app:latest`), then recreate only `app` with `docker compose up -d --no-deps --no-build app`. Restore the backed-up release source files as well, so the next build does not reintroduce the failed patch; remove only files introduced by that release, using its manifest. Verify health and member access again.

A code-only rollback does not roll back database data. Preserve the current `.env`, database, volumes, and proxy. Confirm rollback authorization is included in the release or obtain it before performing a rollback.
