# POMS Deployment Templates

This directory contains versioned deployment templates for POMS environments.
Copy these files to the server paths documented here before enabling them.

Do not commit real certificates, private keys, database passwords, JWT secrets,
attachment storage credentials, or production environment files to this
directory.

## Files

- `nginx/sites-available/poms-test.conf`: Nginx site template for the test
  environment.
- `pm2/poms-api-test.ecosystem.config.cjs`: PM2 process template for
  `poms-api` in the test environment.
- `env/poms-api.env.example`: environment variable example for
  `/srv/poms/test/shared/poms-api.env`.

## Server Layout

POMS runtime files should live under `/srv/poms/<env>`:

```text
/srv/poms/
  test/
    releases/
      <timestamp>/
        admin/browser/
        api/
    current -> releases/<timestamp>
    shared/
      poms-api.env
      logs/
      uploads/
  prod/
    releases/
    current -> releases/<timestamp>
    shared/
      poms-api.env
      logs/
      uploads/
```

The test environment uses:

- frontend root: `/srv/poms/test/current/admin/browser`
- API cwd: `/srv/poms/test/current/api`
- API env file: `/srv/poms/test/shared/poms-api.env`

## Install Nginx Site

```bash
cp deploy/nginx/sites-available/poms-test.conf /etc/nginx/sites-available/poms-test.conf
ln -s /etc/nginx/sites-available/poms-test.conf /etc/nginx/sites-enabled/poms-test.conf
nginx -t
systemctl reload nginx
```

If the symlink already exists, verify the target before replacing it.

## Install API Environment

```bash
mkdir -p /srv/poms/test/shared/logs /srv/poms/test/shared/uploads
cp deploy/env/poms-api.env.example /srv/poms/test/shared/poms-api.env
chmod 600 /srv/poms/test/shared/poms-api.env
```

Then edit `/srv/poms/test/shared/poms-api.env` on the server and replace every
`<replace-me>` placeholder with the real value.

Attachment storage provider credentials are managed through POMS platform
configuration after the API is running. Do not add `HUAWEI_OBS_*` credentials to
the API environment file unless a future bootstrap tool explicitly consumes
them.

## Start Or Reload API

```bash
pm2 startOrReload deploy/pm2/poms-api-test.ecosystem.config.cjs --env production
pm2 save
```

Use the server-local copy of this repository or copy the PM2 template to a
server release tooling directory. The template reads secrets from
`/srv/poms/test/shared/poms-api.env`; it does not embed them.

## Validation

```bash
nginx -t
systemctl reload nginx
pm2 status poms-api-test
curl -k https://poms-test.illusiontech.cn/api/health
curl -k https://poms-test.illusiontech.cn/api/health/readiness
curl -k -I https://poms-test.illusiontech.cn/api-docs/
curl -k -I https://poms-test.illusiontech.cn/projects
```

See `docs/operations/poms-test-deployment-runbook.md` for the full release and
rollback procedure.
