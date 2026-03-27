# poms-api-e2e

`poms-api-e2e` uses a domain-oriented layout:

- `src/poms-api/*.e2e-spec.ts`: end-to-end specs grouped by business domain.
- `src/support/*.ts`: shared API clients, test data builders, assertions, and workflow helpers.

Conventions:

- Reuse shared-contract types instead of redefining DTO shapes locally.
- Keep happy-path workflows and guard/negative-path tests in the same domain spec.
- Prefix runtime-created records with `E2E-` so `seeder-run` can clean them before each test run.
- Put repeated request choreography in support helpers; keep spec files focused on intent and assertions.
