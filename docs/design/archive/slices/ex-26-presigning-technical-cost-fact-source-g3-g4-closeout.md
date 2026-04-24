# EX-26 签约前技术与成本事实源 G3/G4 Close-out

* Close-out Status: `Pass`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `api / command + query + persistence`
* G4 Reviewer: `Codex`
* Close-out Date: `2026-04-25`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-26`
* Runtime Commit: `a0e9de1 feat(project): 接入签约前项目三类工作区与事实源能力`

## 1. Delivered Scope

已交付：

1. `ProjectTechnicalCostPackage` 及 scope / risk / cost 子表。
2. `POST /projects/{projectId}/technical-cost-packages`、`GET /projects/{projectId}/technical-cost-packages`、`GET /projects/{projectId}/technical-cost-workspace`。
3. shared contract、API DTO、OpenAPI、generated client、entity、migration、service、repository、query projection、controller wiring。
4. 当前技术与成本 workspace query 显式返回范围边界、风险、成本、税务口径、阻断原因、下一步、责任归口和 allowed actions。
5. 缺少当前版本包时返回业务 gap，不让前端伪造技术结论或成本事实。

明确未交付：

1. 多币种 / 汇率换算，继续由 `EX26-E1-SINGLE-CURRENCY-FIRST-SLICE` 记录首版边界。
2. 正式 rollback request / reopen record，继续由 `EX26-E2-ROLLBACK-REQUEST-OUT-OF-SCOPE` 记录后续边界。
3. 前端读取页，已由 `FE-10` 交付。

## 2. Alignment

| Concern                   | Conclusion                                                                               | Result |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------ |
| Route inventory -> route  | 三个 technical-cost public routes 均与 authoritative inventory 对齐                      | Pass   |
| Migration -> entity       | 主表、scope、risk、cost 子表与 entity 对齐，`migration-check` 已在 G3 通过               | Pass   |
| Entity -> shared contract | `ProjectTechnicalCostWorkspaceView` 等类型已进入 shared contract 与 generated client     | Pass   |
| Query -> frontend         | `FE-10` 已真实消费 technical-cost workspace，不从 readiness 或执行期实际成本反推估算事实 | Pass   |
| Guard / permission        | read 使用 `project:read`，create 使用 `project:write`                                    | Pass   |

## 3. Validation Evidence

`EX-26` 的 G3 checkpoint 已记录并通过：

1. `git diff --check`
2. `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project.service.spec.ts`
3. `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`
4. `corepack pnpm nx lint poms-api`
5. `corepack pnpm nx build poms-api`
6. `corepack pnpm nx run shared-api-client:generate`
7. `corepack pnpm nx run shared-api-client:check`
8. `corepack pnpm nx build poms-admin`
9. `corepack pnpm nx run poms-api:migration-up`
10. `corepack pnpm nx run poms-api:migration-check`

提交后复核：

1. `git show --name-only --oneline --no-renames a0e9de1` 确认运行提交包含 `ProjectTechnicalCostPackage`、technical-cost generated client、migration、`EX-26` / `FE-10` baseline 与 checkpoint。
2. `git status --short` 在本 G4 文档变更前为空。

## 4. Drift And Exceptions

| Item                    | Status            | Close-out                                                                               |
| ----------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `EX26-D1-COMMENT-DRIFT` | Closed            | child table column comment drift 已按 `new-real-drift` 修复，`migration-check` 通过。   |
| `EX26-E1`               | Closed as blocker | 首版单币种边界已冻结；`FE-10` 只展示后端返回金额，不做汇率换算或前端重算。              |
| `EX26-E2`               | Closed as blocker | rollback request / reopen record 明确不在本片；不影响 technical-cost 读取投影可依赖性。 |
| Frontend dependency     | Closed            | `FE-10` 已完成 technical-cost 读取页与 E2E 入口链验证。                                 |

## 5. G4 Decision

* Can mark tracker `Done`: `yes`
* Can downstream depend on this slice: `yes`
* Next dependency status: `FE-10` 已完成本片前端消费，`FE-12` 可把 technical-cost route 纳入跨工作区 E2E baseline。
