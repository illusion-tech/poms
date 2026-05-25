# POMS Deployment Layout

POMS runtime files are grouped under `/srv/poms/<env>` so test, production, and
future environments share one predictable structure.

## Directory Layout

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

## Directory Responsibilities

- `releases/<timestamp>/`: immutable release payload for one deployment.
- `current`: symlink to the active release.
- `shared/poms-api.env`: server-only API environment file.
- `shared/logs/`: PM2 log output for the environment.
- `shared/uploads/`: local shared storage if a deployment mode needs it.

Nginx and PM2 point at `current`, not a timestamped release. A release switch is
therefore an atomic symlink update plus a PM2 reload for the API process.

## Frontend Root

The frontend root for the test environment is:

```text
/srv/poms/test/current/admin/browser
```

`admin/browser` mirrors the Angular production build output under
`dist/apps/poms-admin/browser`. Nginx must serve the `browser` directory because
that directory contains `index.html` and the hashed static assets.

## API Cwd

The API cwd for the test environment is:

```text
/srv/poms/test/current/api
```

The built API entry file is `main.js`, matching the current
`dist/apps/poms-api/main.js` webpack output.

## Environment Parity

Production should use the same shape:

```text
/srv/poms/prod/current/admin/browser
/srv/poms/prod/current/api
/srv/poms/prod/shared/poms-api.env
```

Only environment-specific values should differ: domain, certificate path,
database URL, attachment storage provider configuration, secrets, and PM2
process name.

## Rollback Model

Rollback should not move files inside a release directory. Point `current` back
to the previous release, reload PM2, and leave Nginx unchanged.

Example:

```bash
ln -sfn /srv/poms/test/releases/<previous-timestamp> /srv/poms/test/current
pm2 reload poms-api-test --update-env
```
