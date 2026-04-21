---
name: poms-conventional-commits
description: Draft and review Conventional Commit messages for the POMS repository. Use when Codex is asked to write a commit message, choose a commit type or scope, normalize commit history style, or explain repository-specific commit rules for POMS changes across apps, libs, generated clients, OpenAPI, migrations, tests, and design tracker updates.
---

# POMS Conventional Commits

Use this skill to produce commit messages that match the current `POMS` repository architecture and history. Prefer the repository's business-domain scope over generic technical scopes.

## Workflow

1. Inspect the actual commit input first:
   - Run `git diff --cached --stat` and `git diff --cached --name-only`.
   - If the staged area is empty, say so. Do not draft from unstaged files unless the user explicitly asks to use the working tree.
   - Read recent history with `git log -n 12 --format=%B%n---END---` when choosing style.
2. Identify the main business slice:
   - Prefer the feature/domain that downstream users experience.
   - Treat docs, OpenAPI, generated client, DTO, migration, and tests as supporting evidence when they serve one business slice.
3. Choose `type(scope)` from the rules below.
4. Write a concise Chinese subject.
5. Add a body when the change is cross-layer, changes contracts, changes persistence, updates route surface, changes state/guard semantics, or includes governance close-out.

## Format

```text
<type>(<scope>): <中文动宾短语>

- 可选 body，说明关键交付边界
- 可选验证、OpenAPI/client、文档回写摘要
```

Use English `type` and `scope`, Chinese subject and body. Do not end the subject with punctuation.

## Type Rules

- `feat`: Adds or extends product behavior, API route/query, command, DTO, persisted field, generated client surface, or user-facing page.
- `fix`: Corrects runtime behavior, validation, permission, guard, status machine, date/money semantics, route mismatch, contract mismatch, or generated surface drift.
- `test`: Adds or changes tests/E2E/support fixtures without changing production behavior, or records a test close-out slice.
- `docs`: Only changes design docs, trackers, ADRs, governance docs, or baseline/checkpoint documents.
- `refactor`: Changes structure, naming, or implementation shape without changing external behavior.
- `chore`: Repository maintenance, dependency/config cleanup, lint-only cleanup, generated housekeeping that is not tied to a product slice.
- `build`: Build system, Nx targets, OpenAPI generator tooling, scripts used by generation/build.
- `ci`: CI workflow and automation config.

Use `!` only for a deliberate breaking change that downstream callers must adapt to:

```text
feat(project)!: 收紧项目创建契约并移除 legacy 字段
```

Add a `BREAKING CHANGE:` footer only when the repository needs explicit migration guidance.

## Scope Rules

Prefer business/domain scopes:

- `project`: Project list/detail/workspace guidance, project query views, project create/update commands, project admin pages, project store.
- `commission`: Commission rules, calculations, payout lifecycle, retention/final settlement, rule explanation, freeze/dispute/departure exception, commission admin pages.
- `contract`: Contract master data, contract activation, contract term snapshots, contract readiness.
- `contract-finance`: Receipts, payments, payables, invoices, procurement commitments, finance ledger facts.
- `project-cost`: Operating snapshots, actual/shared cost, tax/allocation, operating signal, commission gate review.
- `project-handover`: Handover, rebaseline, receipt judgment freeze, handover summary facts.
- `approval`: Approval records, todos, confirmations, approval service behavior.
- `approval-summary`: Approval summary snapshot projection and evidence packages.
- `platform`: Platform users, roles, org units, permissions, platform governance.
- `auth`: Login/session/current user auth surface.
- `profile`: Current user's self-service profile UI/API.
- `workspace`: Generic project workspace shell/navigation when not owned by a narrower business domain.
- `admin`: Admin shell, routing, layout, navigation, and frontend-only behavior not owned by a specific domain.
- `core`: Shared backend utilities or cross-domain infrastructure such as business date normalization.

Use technical scopes only when the change is truly about that layer:

- `api`: Cross-domain route grammar or controller convention work.
- `api-client`: Generated API client types/services when the client itself is the deliverable, not just supporting a business slice.
- `openapi`: OpenAPI generation/check tooling or OpenAPI-only fixes.
- `governance`: Implementation governance rules, skills, templates, or validation policy.
- `e2e`: Test harness behavior spanning domains.
- `poms-api`, `poms-admin`: App-wide maintenance that does not map cleanly to a business domain.

## Cross-Layer Ownership

When a commit touches API, admin, shared contracts, generated client, tests, and docs for one feature, use the business scope:

```text
feat(project): 新增项目工作区引导视图与详情页入口
```

Do not use `api-client`, `openapi`, `docs`, or `admin` just because those files changed as part of a business slice.

Use `docs` only when there are no production/test contract changes. Use `test(scope)` only when production behavior does not change.

## Subject Guidance

Use result-oriented Chinese:

- Good: `feat(commission): 为 retention 结算补齐质保期届满事实源`
- Good: `fix(commission): 收紧发放请求契约并修正 retention gate 判定`
- Good: `test(commission): 补齐 final/retention 结算 E2E 并完成 EX-14C close-out`
- Avoid vague subjects like `更新代码`, `修复问题`, `完善功能`.
- Avoid layer-only subjects like `更新 OpenAPI` when the real change is a business feature.

## Body Guidance

Use body bullets for substantial POMS changes. Keep bullets focused on boundaries:

- Public API route/query/command added or changed.
- Shared contract / DTO / OpenAPI / generated client changes.
- Persistence/migration/entity changes.
- Runtime guard, permission, state machine, date, money, or version-chain changes.
- Admin/data-access integration.
- Tests and E2E coverage.
- Design baseline, tracker, route inventory, or progress-board writeback.

Example:

```text
feat(project): 新增项目工作区引导视图与详情页入口

- 新增 `GET /projects/{projectId}/workspace-guidance`，返回当前阶段、缺口、下一步和推荐入口
- 扩展 `ProjectWorkspaceGuidanceView` 契约，并同步 API DTO、OpenAPI 与 generated client
- 在 admin 项目详情页接入工作区、提成和编辑入口的权限控制
- 补充前后端单测，并回写 EX-19、FE-16C 与 tracker 文档
```

## Decision Shortcuts

- Contract change plus OpenAPI/client update for a feature: use `feat(<business-scope>)` or `fix(<business-scope>)`.
- Migration/entity added for a feature: use `feat(<business-scope>)`.
- Guard tightened after drift found: use `fix(<business-scope>)`.
- Only generated client regenerated after previous source change: use `chore(api-client)` or `fix(api-client)` depending on whether behavior was broken.
- Only route inventory or baseline docs changed: use `docs` or `docs(governance)` if it changes the process.
- E2E close-out for an already implemented feature: use `test(<business-scope>)`.

## Empty Or Dirty State

If `git diff --cached` is empty, report that there is no staged commit message to write. If the working tree has unstaged files, mention that they are not staged. Only draft from unstaged files if explicitly asked.
