# POMS Test Deployment Runbook

This runbook describes the test environment deployment flow for
`poms-test.illusiontech.cn`.

## Preconditions

- DNS points `poms-test.illusiontech.cn` to the ECS public IP.
- System Nginx is the only active Nginx instance and listens on `80` and `443`.
- TLS certificate files exist on the server:
  - `/etc/nginx/ssl/poms-test/fullchain.pem`
  - `/etc/nginx/ssl/poms-test/privkey.pem`
- Node.js, Corepack, pnpm, and PM2 are installed on the server.
- PostgreSQL/RDS is reachable from the server.
- If Huawei OBS is used, endpoint, region, bucket, AK, and SK are available to
  the operator who configures POMS platform attachment storage providers.
- Health check endpoints exist:
  - `/api/health`
  - `/api/health/readiness`

## Build Locally

From the repository root:

```bash
corepack pnpm nx build poms-admin
corepack pnpm nx build poms-api
```

Expected build outputs:

- frontend: `dist/apps/poms-admin/browser`
- API: `dist/apps/poms-api/main.js`

## Create Server Directories

```bash
stamp=$(date +%Y%m%d-%H%M%S)
release=/srv/poms/test/releases/$stamp

mkdir -p "$release/admin" "$release/api"
mkdir -p /srv/poms/test/shared/logs /srv/poms/test/shared/uploads
```

Upload or copy the build payloads:

```text
dist/apps/poms-admin/browser -> $release/admin/browser
dist/apps/poms-api/*         -> $release/api/
```

Install production API dependencies inside `$release/api` using the generated
`package.json` and `pnpm-lock.yaml`:

```bash
cd "$release/api"
corepack pnpm install --prod --frozen-lockfile
```

## Configure API Environment

Create the server-only environment file:

```bash
cp deploy/env/poms-api.env.example /srv/poms/test/shared/poms-api.env
chmod 600 /srv/poms/test/shared/poms-api.env
```

Edit `/srv/poms/test/shared/poms-api.env` and replace all placeholders. Required
test defaults:

```text
NODE_ENV=production
HOST=127.0.0.1
PORT=3333
CORS_ORIGIN=https://poms-test.illusiontech.cn
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_PATH=/api
DB_CONNECT=true
DB_SCHEMA=poms
POMS_ATTACHMENT_MAX_SIZE_MB=50
POMS_ATTACHMENT_LOCAL_ROOT=/srv/poms/test/shared/uploads
```

Do not commit the filled env file.

The API does not read Huawei OBS credentials from `HUAWEI_OBS_*` environment
variables. Keep OBS endpoint, bucket, AK, and SK in POMS platform attachment
storage provider configuration, where credentials are encrypted and not returned
as plaintext by the API.

## Configure Attachment Storage Provider

After the API is running and an operator can sign in:

1. Open POMS platform attachment storage provider management.
2. Create or update a `huawei-obs-s3` provider when OBS is required.
3. Enter endpoint, region, bucket, optional key prefix, AK, and SK in the
   platform form.
4. Run the provider connection test.
5. Enable the provider and set it as default.

If no provider is configured, the API falls back to local attachment storage.
For the test environment that local root should be
`/srv/poms/test/shared/uploads`, as set by `POMS_ATTACHMENT_LOCAL_ROOT`.

## Database Migrations

Run migrations from a local checkout or CI job that has full source and
TypeScript tooling. Do not rely on the pure `dist/apps/poms-api` runtime payload
to execute migrations on the server.

Use the production database environment for the test RDS target, then run:

```bash
corepack pnpm nx run poms-api:migration-up
```

Record the migration result before switching `current`.

## Switch Release

```bash
ln -sfn "$release" /srv/poms/test/current
```

Confirm:

```bash
readlink -f /srv/poms/test/current
test -f /srv/poms/test/current/admin/browser/index.html
test -f /srv/poms/test/current/api/main.js
```

## Start Or Reload API

```bash
pm2 startOrReload deploy/pm2/poms-api-test.ecosystem.config.cjs --env production
pm2 status poms-api-test
```

Persist PM2 state after the process is healthy:

```bash
pm2 save
```

## Install Or Reload Nginx

```bash
cp deploy/nginx/sites-available/poms-test.conf /etc/nginx/sites-available/poms-test.conf
ln -s /etc/nginx/sites-available/poms-test.conf /etc/nginx/sites-enabled/poms-test.conf
nginx -t
systemctl reload nginx
```

If the symlink already exists, verify it points to
`/etc/nginx/sites-available/poms-test.conf`.

## Health And Route Validation

```bash
curl -k https://poms-test.illusiontech.cn/api/health
curl -k https://poms-test.illusiontech.cn/api/health/readiness
curl -k -I https://poms-test.illusiontech.cn/api-docs/
curl -k -I https://poms-test.illusiontech.cn/projects
```

Expected results:

- `/api/health` returns liveness JSON.
- `/api/health/readiness` returns ready JSON, or `503` with dependency detail
  if a dependency is unavailable.
- `/api-docs/` returns Swagger UI.
- `/projects` returns the SPA `index.html`.

## Cache Validation

```bash
curl -k -I https://poms-test.illusiontech.cn/index.html
curl -k -I https://poms-test.illusiontech.cn/api/health
```

Expected headers:

- `index.html`: `Cache-Control: no-store, no-cache, must-revalidate`
- `/api/health`: `Cache-Control: no-store`
- hashed JavaScript and CSS assets: `Cache-Control` includes `immutable`

## Rollback

List releases:

```bash
ls -1 /srv/poms/test/releases
```

Switch `current` back to the previous release:

```bash
ln -sfn /srv/poms/test/releases/<previous-timestamp> /srv/poms/test/current
pm2 reload poms-api-test --update-env
```

Nginx does not need a config change for normal release rollback because it serves
`/srv/poms/test/current/admin/browser`.

## Troubleshooting

- `502 Bad Gateway`: verify `pm2 status poms-api-test` and
  `ss -lntup | grep 3333`.
- Login cookie missing: verify `CORS_ORIGIN`, `AUTH_COOKIE_SECURE`, and
  `AUTH_COOKIE_PATH`.
- SPA deep link returns 404: verify the Nginx `location /` fallback to
  `/index.html`.
- Upload rejected by Nginx: increase `client_max_body_size` and keep it aligned
  with `POMS_ATTACHMENT_MAX_SIZE_MB`.
- Swagger unavailable: verify `/api-docs/`, `/api-docs-json`, and
  `/api-docs-yaml` are proxied outside `/api/`.
