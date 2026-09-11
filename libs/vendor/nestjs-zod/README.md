# @poms/vendor-nestjs-zod

Vendored copy of [BenLorantfy/nestjs-zod](https://github.com/BenLorantfy/nestjs-zod), tag `v5.5.0` (tarball commit `2149e22`), licensed under MIT (see `LICENSE`).

- Source files under `src/` are copied byte-for-byte from upstream `packages/nestjs-zod/src`, excluding test files and `testUtils.ts` (test-support only; depends on upstream monorepo test infrastructure).
- GOV-16 governance slice: `docs/design/gov-16-vendor-nestjs-zod-baseline.md` (issue #49). Behaviour-equivalence proven by zero-diff OpenAPI regeneration and the full test matrix.
- Local modifications are made only via follow-up governance slices; each divergence from upstream must be documented in the slice baseline.
