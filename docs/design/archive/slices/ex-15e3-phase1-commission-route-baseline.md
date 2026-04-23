# EX-15E3 phase1 commission canonical route 基线包

- Gate Status: `Pass`
- Parent: `EX-15E`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-17`
- G4 Closeout Date: `2026-04-17`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-15E3`

## 1. 范围

- 本次目标:
  - 冻结 phase1 `commission` 既有 public capability 的 canonical route。
  - 纠正当前 `/commission/...` 前缀、project-scoped item path 与 `slash-action` 风格。
  - 为 controller、OpenAPI、generated client、HTTP E2E 与 authoritative 文档提供单一实施输入。
- 本次覆盖:
  - `listRuleVersions`
  - `createRuleVersion`
  - `activateRuleVersion`
  - `stopRuleVersion`
  - `getCurrentRoleAssignment`
  - `createRoleAssignment`
  - `listCalculations`
  - `createCommissionCalculation`
  - `approveCommissionCalculation`
  - `recalculateCommission`
  - `listPayouts`
  - `createCommissionPayout`
  - `submitCommissionPayoutApproval`
  - `approveCommissionPayout`
  - `registerCommissionPayout`
  - `listAdjustments`
  - `createCommissionAdjustment`
  - `submitCommissionAdjustmentApproval`
  - `executeCommissionAdjustment`
- 本次明确不做:
  - 不新增长期兼容 alias。
  - 不扩大到 `phase2+` payout suspend / reverse 或更多 `commission` 规划能力。
  - 不引入 persistence schema 变更。

## 2. 正式输入

| Input Type           | Document / Source                             | Section / Anchor                                 | Status    | Notes                                                                |
| -------------------- | --------------------------------------------- | ------------------------------------------------ | --------- | -------------------------------------------------------------------- |
| ADR                  | `docs/adr/015-api-route-canonical-grammar.md` | §4.1 ~ §4.5                                      | Accepted  | phase1 `commission` route 统一遵循 resource-first + colon-action     |
| Domain design        | `docs/design/commission-settlement-design.md` | §14.1 第一阶段最小接口建议                       | Corrected | 现有接口清单仍保留旧 `/commission/...` 与 slash-action，需要本片纠正 |
| DTO / OpenAPI design | `docs/design/interface-openapi-dto-design.md` | §5.3 提成治理域首批命令、相关补充约束            | Corrected | 已冻结 rule / calculation / payout / adjustment 命令 DTO 草案        |
| Runtime fact         | `CommissionController`                        | `apps/poms-api/src/app/features/commission/*.ts` | Fact      | 当前 runtime 仍集中在 `@Controller('commission')` 下                 |
| Route inventory      | `api-route-canonical-inventory.md`            | `commission` section                             | Corrected | 需补录 phase1 commission 其余 capability                             |

## 3. 本次 SSOT

| Concern          | SSOT                                  | Implementation Rule                                                                                  |
| ---------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Rule version     | `CommissionRuleVersion`               | 顶层独立 collection / item-action；不再挂在 `/commission` 命名空间下                                 |
| Role assignment  | 项目下当前稳定单例 + 角色分配版本资源 | 当前单例查询保留为项目子资源；新建版本走项目子集合 create                                            |
| Calculation      | `CommissionCalculation`               | list/create 走项目子集合；approve / recalculate 走 item `colon-action`                               |
| Payout           | `CommissionPayout`                    | list/create 走项目子集合；submit approval / approve / register payout 走 item `colon-action`         |
| Adjustment       | `CommissionAdjustment`                | list/create 走项目子集合；submit approval / execute 走 item `colon-action`                           |
| Item identity    | 资源自身 `id`                         | 既有稳定全局主键时，不再把 `{projectId}` 作为 item-action canonical identity 的一部分                |
| No compatibility | `ADR-015` default direct cutover      | 仓库内 controller、OpenAPI、generated client、E2E、调用方同步修改，不保留旧 `/commission/...` legacy |

## 4. 裁决结论

| Capability                           | Canonical Route                                          | Key Decision                                                                 |
| ------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `listRuleVersions`                   | `GET /commission-rule-versions`                          | 顶层规则版本集合查询                                                         |
| `createRuleVersion`                  | `POST /commission-rule-versions`                         | 顶层规则版本集合创建                                                         |
| `activateRuleVersion`                | `POST /commission-rule-versions/{id}:activate`           | item `colon-action`                                                          |
| `stopRuleVersion`                    | `POST /commission-rule-versions/{id}:stop`               | item `colon-action`                                                          |
| `getCurrentRoleAssignment`           | `GET /projects/{projectId}/commission-role-assignment`   | 当前项目角色分配是稳定单例子资源                                             |
| `createRoleAssignment`               | `POST /projects/{projectId}/commission-role-assignments` | 新建版本是项目子集合 create，不继续复用单例路径                              |
| `listCalculations`                   | `GET /projects/{projectId}/commission-calculations`      | 项目子集合 list                                                              |
| `createCommissionCalculation`        | `POST /projects/{projectId}/commission-calculations`     | 旧 `trigger` 本质是 create，不再保留 action suffix                           |
| `approveCommissionCalculation`       | `POST /commission-calculations/{id}:approve`             | 生效动作收口为 item `colon-action`，path `{id}` 是 calculation identity SSOT |
| `recalculateCommission`              | `POST /commission-calculations/{id}:recalculate`         | item `colon-action`；移除 project-scoped item path                           |
| `listPayouts`                        | `GET /projects/{projectId}/commission-payouts`           | 项目子集合 list                                                              |
| `createCommissionPayout`             | `POST /projects/{projectId}/commission-payouts`          | 项目子集合 create                                                            |
| `submitCommissionPayoutApproval`     | `POST /commission-payouts/{id}:submitApproval`           | item `colon-action`；不再以 `{projectId}` 承载 item identity                 |
| `approveCommissionPayout`            | `POST /commission-payouts/{id}:approve`                  | item `colon-action`                                                          |
| `registerCommissionPayout`           | `POST /commission-payouts/{id}:registerPayout`           | item `colon-action`                                                          |
| `listAdjustments`                    | `GET /projects/{projectId}/commission-adjustments`       | 项目子集合 list                                                              |
| `createCommissionAdjustment`         | `POST /projects/{projectId}/commission-adjustments`      | 项目子集合 create                                                            |
| `submitCommissionAdjustmentApproval` | `POST /commission-adjustments/{id}:submitApproval`       | item `colon-action`                                                          |
| `executeCommissionAdjustment`        | `POST /commission-adjustments/{id}:execute`              | item `colon-action`                                                          |

## 5. 明确拒绝的方案

1. 继续使用 `/commission/...`
   - 原因: 这只是历史模块命名空间，不是正式资源边界。
2. 保留 `/projects/{projectId}/.../{id}/action` 作为 canonical item-action
   - 原因: `CommissionCalculation`、`CommissionPayout`、`CommissionAdjustment` 都已有稳定全局主键。
3. 保留 `/:id/action` slash-action
   - 原因: 已被 `ADR-015` 否决，正式 grammar 统一为 `colon-action`。
4. 让 `createRoleAssignment` 继续复用 `/projects/{projectId}/role-assignment`
   - 原因: 当前角色分配查询是稳定单例，创建新版本应进入项目子集合，不能把 list/create 与 singleton 混在同一路径。

## 6. 一致性结论

- Document -> code: 本片已完成 direct cutover，`CommissionController`、OpenAPI、generated client 与 HTTP E2E 已与 canonical baseline 对齐。
- Entity -> route: calculation / payout / adjustment 已具备稳定 `id`，现已统一按 item canonical route 落地。
- Query -> view: 当前项目级 list 与“当前角色分配”单例查询边界稳定，无需新增页面后缀 query。
- DTO / OpenAPI: 既有请求 DTO 已复用，本片重点修正 route grammar 与 item identity，未引入 contract drift。

## 7. 测试与校验

| Check                            | Required | Command / Evidence                                  | Result | Gap / Reason                                                                 |
| -------------------------------- | -------- | --------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                   | Pass   | `commission` runtime cutover 编译通过                                        |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`                 | Pass   | admin consumer 与 generated client 同步通过                                  |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`        | Pass   | 32 suites / 334 tests 通过                                                   |
| API / integration tests          | Yes      | `corepack pnpm nx run poms-api:openapi`             | Pass   | OpenAPI 已按 canonical route 回写                                            |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand` | Pass   | 全量 10 suites / 59 tests 通过；覆盖 commission workflow 与 authorization    |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:generate`   | Pass   | generated client 已按 canonical route 产出                                   |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:check`      | Pass   | generated client 与 spec fully synced；仅保留 generator 自身 schema warnings |
| Migration / schema check         | No       | `N/A`                                               | N/A    | 本片不含 persistence 变更                                                    |
| Diff hygiene                     | Yes      | `git diff --check`                                  | Pass   | authoritative 文档、实现与 generated artifacts 已完成干净回写                |

## 8. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-17`
- Conditions:
  - 进入实现时，必须同步回写 controller、OpenAPI、generated client、HTTP E2E、inventory、tracker 与 `commission-settlement-design.md`。
  - 不接受仓库内可控调用方继续保留旧 `/commission/...` legacy route。

## 9. G4 Closeout

- Gate Status: `Pass`
- Closed By: `Codex`
- Closed At: `2026-04-17`
- Delivered Boundary:
  - `CommissionController` 已切到 phase1 `commission` canonical route，覆盖 rule version、当前角色分配 / 创建、calculation、payout、adjustment 的 collection create / parent-subcollection / item colon-action 收口。
  - `commission-settlement-design.md`、`api-route-canonical-inventory.md`、tracker 与 progress 已回写 authoritative 结果。
  - OpenAPI、shared generated client、admin consumer、unit test、HTTP E2E 已同步完成 direct cutover。
- Validation Notes:
  - 早期定向 Jest 命令曾因 CLI 选项从 `--testPathPattern` 变更为 `--testPathPatterns` 失败；随后已以全量 `poms-api` test 与全量 `poms-api-e2e` 完整验证通过，不构成本片逻辑风险。
