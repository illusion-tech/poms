# EX-66 Auth Session 写入并发纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `EX-66`
- Owner: `Codex`
- Slice Type: `api / guard runtime hotfix`
- G3 Reviewer: `Codex local`
- Checkpoint Date: `2026-06-10`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-66`

## 1. 触发背景与范围

- 触发原因:
  - `poms-test.illusiontech.cn` 线索管理页面初始化会并发请求 `customers`、`dictionaries`、`owner-reference` 等受保护接口。
  - 线上测试 API 日志显示这些请求在认证阶段同时刷新同一条 `auth_session` 的 `lastSeenAt`，触发 MikroORM `OptimisticLockError`，被 Nest 默认转成 `500`。
- 本次目标:
  - 将 `AuthSessionService` 的 `lastSeen` 刷新改为并发容忍的 best-effort 心跳。
  - 使用 repository 级条件原子 update，避免多个并发读接口抢同一条 session row version。
  - 将过期、撤销、CSRF token 轮换收口到 `AuthSessionRepository` command-style 原子写入层，避免 touch 0-row 后继续保存 stale entity。
  - 补充 focused tests 覆盖 0-row touch 不影响认证通过，并覆盖并发 touch 后继续刷新 CSRF 的回归路径。
- 本次明确不做:
  - 不新增、删除或修改 public API route。
  - 不修改 DTO、OpenAPI、generated client、Cookie 名称、CSRF 契约或 Admin Web 调用方。
  - 不修改 `auth_session` 表结构、migration 或 session 生命周期配置项。
- 本次纠偏后可恢复的可信边界:
  - 受保护读接口并发进入 `SessionAuthGuard` 时，`lastSeen` 心跳不会再因乐观锁冲突导致业务接口 `500`。
  - session 过期、撤销、CSRF token 轮换继续保留严格写入语义，但不再依赖读出来的旧实体执行 flush。
- 仍不允许下游依赖的留白:
  - 本片不承诺完成浏览器端全量 smoke；测试环境部署验证另行按部署流程执行。

## 2. 正式输入

| Input Type                | Document / Source                                           | Section / Anchor           | Status | Notes                                                |
| ------------------------- | ----------------------------------------------------------- | -------------------------- | ------ | ---------------------------------------------------- |
| ADR                       | `docs/adr/017-admin-web-cookie-session-auth.md`             | Cookie session decision    | Reuse  | Admin Web 使用服务端 opaque session。                |
| Runtime baseline          | `docs/design/ex-66b-auth-session-store-runtime-baseline.md` | Session lifecycle / guard  | Reuse  | 已冻结 idle / absolute timeout、last seen throttle。 |
| Closeout                  | `docs/design/ex-66b-auth-session-store-runtime-closeout.md` | Session guard behavior     | Reuse  | `SessionAuthGuard` 已作为后续 direct cutover 基础。  |
| Production evidence       | `poms-test` API log                                         | `OptimisticLockError`      | Active | 并发刷新 `AuthSession` 导致 500。                    |
| Route inventory           | `docs/design/api-route-canonical-inventory.md`              | `B15` auth session routes  | Reuse  | 本次不改 route surface。                             |
| Data model / table freeze | `AuthSession` entity                                        | `auth_session.row_version` | Reuse  | 保留 row version；只改变心跳刷新写入方式。           |

## 3. Drift 清单与本次 SSOT

| Concern                | Drift / SSOT                                                                        | Corrective Rule                                                               |
| ---------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Runtime behavior       | `lastSeen` 是低优先级心跳，却通过实体 `saveAll` 参与乐观锁                          | 改为 repository 条件原子 update，0 row 视为其它并发请求已刷新                 |
| Session auth decision  | 认证通过与否仍由 `status`、`idleExpiresAt`、`absoluteExpiresAt` 和 active user 决定 | 不因 best-effort 心跳未命中而拒绝当前请求                                     |
| Strict security writes | 过期、撤销、CSRF token 刷新仍是安全相关写入                                         | 改为 command-style guarded update，并用 `RETURNING` 快照同步内存 session 版本 |
| Route / contract       | 用户可见 route 与 response 契约未漂移                                               | 不运行 OpenAPI / generated client，记录为 not required                        |
| Persistence            | `auth_session` 表结构未漂移                                                         | 不新增 migration；必要验证为 build / tests / diff check                       |

## 4. 当前阻断结论

- Current Gate: `G3 = Pass`
- Blocking Findings:
  1. `AuthSessionService.#touchSession` 使用实体 flush 更新 `lastSeenAt`，并发请求会抢同一条 `rowVersion`。
  2. 该异常发生在 guard 阶段，导致 unrelated 业务读接口返回 `500`。
  3. 若 touch command 因其它并发请求已刷新而返回 0 row，后续同一请求继续执行 `refreshCsrfToken()` 并 `saveAll([resolved.session])`，仍可能用 stale `rowVersion` 触发 `OptimisticLockError`。
- Why parent task cannot be closed:
  - `EX-66` 已是 `Done`，本次不重开父任务；但 cookie session runtime 的并发心跳漂移必须通过 corrective checkpoint 留痕后修复。

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. 新增 `AuthSessionRepository.touchLastSeenIfDue`，使用 `UPDATE ... WHERE ... RETURNING` 完成 guarded atomic touch。
  2. 新增 `AuthSessionRepository.rotateCsrfTokenForActiveSession`、`expireActiveSession`、`revokeActiveSession`，现有 session 写入统一通过 guarded atomic command 完成。
  3. `AuthSessionService` 只对新建 session 继续使用 `saveAll`；已存在 session 的 touch、CSRF 轮换、过期和撤销均通过 command 返回快照同步内存对象。
  4. `revokeActiveSessionsForUser` 改为单条用户级 guarded update，避免批量读取实体后逐条 flush。
  5. 补充 service 与 repository focused tests，覆盖并发 touch 已完成时仍认证通过、并发 touch 后刷新 CSRF 成功、以及 command SQL guard。
- 本批未修复范围:
  1. 不调整前端线索页并发加载策略。
  2. 不调整 session timeout 环境变量。

| Concern          | Before                                 | After                                                  | Result |
| ---------------- | -------------------------------------- | ------------------------------------------------------ | ------ |
| Last-seen touch  | Entity mutation + `saveAll([session])` | Conditional atomic update + 0-row tolerated            | Pass   |
| Concurrent reads | 多个读接口可触发 `OptimisticLockError` | 最多一个请求刷新 session，其余请求继续通过认证         | Pass   |
| Security writes  | 与 last-seen touch 共用实体保存模式    | 过期、撤销、CSRF token 路径改为 guarded atomic command | Pass   |

## 6. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                                                                                     | Result | Gap / Reason                            |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------- |
| API focused tests                | Yes      | `corepack pnpm nx test poms-api --runTestsByPath src/app/core/auth/auth-session.service.spec.ts src/app/core/auth/auth-session.repository.spec.ts src/app/core/auth/guards/session-auth.guard.spec.ts --skip-nx-cache` | Pass   | 3 suites / 21 tests passed.             |
| API lint                         | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                       | Pass   | All files pass linting.                 |
| API build                        | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                      | Pass   | `shared-contracts` + `poms-api` passed. |
| API full tests                   | Yes      | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                       | Pass   | 71 suites / 736 tests passed.           |
| E2E                              | No       | N/A                                                                                                                                                                                                                    | N/A    | 本片不改 route surface 或浏览器调用方。 |
| OpenAPI generation / client diff | No       | N/A                                                                                                                                                                                                                    | N/A    | 本片不改 DTO / public route surface。   |
| Migration / schema check         | No       | N/A                                                                                                                                                                                                                    | N/A    | 本片不改 entity mapping 或 DDL。        |
| Diff sanity                      | Yes      | `git diff --check`                                                                                                                                                                                                     | Pass   | No whitespace errors.                   |
| Markdown format                  | Yes      | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`                                                                                                                                                     | Pass   | Checkpoint tables formatted.            |

## 7. 残余阻断与后续切片

- 已解除的阻断:
  - `AuthSession.lastSeen` 并发刷新导致受保护读接口返回 `500` 的运行时阻断已解除。
  - touch 0-row 后继续刷新 CSRF 时，stale session entity 再次触发 `OptimisticLockError` 的回归风险已解除。
- 仍存在的阻断:
  1. N/A
- 后续子切片:
  1. 如需验证测试环境真实浏览器路径，应在部署 release 后按 `docs/operations/poms-test-deployment-runbook.md` 执行验证。

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes    |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | -------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 无例外。 |

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-06-10`
- Conditions:
  - API focused tests、API full tests、API lint、API build、Markdown format check 和 diff sanity 均通过。
