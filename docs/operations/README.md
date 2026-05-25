# POMS Operations

This directory contains deployment and operations runbooks for POMS runtime
environments.

## Contents

- `poms-deployment-layout.md`: server directory layout, release model, and
  environment naming rules.
- `poms-test-deployment-runbook.md`: test environment release, validation, and
  rollback procedure.

## Related Templates

- `deploy/README.md`
- `deploy/nginx/sites-available/poms-test.conf`
- `deploy/pm2/poms-api-test.ecosystem.config.cjs`
- `deploy/env/poms-api.env.example`

## Secret Handling

Operations documentation may describe secret paths and variable names, but real
secret values must remain on the server or in the chosen secret manager. Do not
commit certificates, private keys, database passwords, JWT secrets, attachment
storage credentials, or server-only `.env` files.
