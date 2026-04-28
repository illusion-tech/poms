# EX-37C2 L5 提成敏感金额后端投影切换 G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `EX-37C`
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend consumption
- Gate: `G3`
- Checkpoint Date: 2026-04-28
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-37C2`

---

## 1. 范围结论

本次实现按 `EX-37C2` G1 基线完成 `L5` 提成读取响应的 projection-only direct cutover。

完成内容：

1. `CommissionCalculationSummary` 已将收入、成本、毛利、毛利率和提成池 response 字段切为 `SensitiveStringFieldProjection`。
2. `CommissionPayoutSummary` 已将理论上限、批准金额和实发金额 response 字段切为 `SensitiveStringFieldProjection`。
3. `CommissionAdjustmentSummary` 已将调整金额和调整原因 response 字段切为 `SensitiveStringFieldProjection`。
4. `CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` 已将税务影响、待明确金额和下一步说明按字段语义切为 projection。
5. `CommissionController` 为受影响 endpoints 传递 request user 与 request context。
6. `CommissionService` 在 mapper 阶段调用 `SensitiveFieldProjectionService.projectStringField` 生成 projection。
7. OpenAPI 与 shared API client 已同步。
8. L5 提成 operations / final settlement / rule explanation 前端页面已直接消费 generated projection 字段。
9. 后端 controller / service specs 与前端测试已同步 projection-only DTO 形状。

本次明确不做：

1. 不改 create / approve / register command DTO 的金额输入字段。
2. 不改 DDL、entity、repository 或 migration。
3. 不新增字段包 key 或权限 key。
4. 不改 public route path / method。
5. 不处理导出、短时揭示、审批详情脱敏或安全事件批量降噪。
6. 不把非本片冻结的结算叙述字段临时扩大为敏感字段；后续由 residual sensitive review 决定。

---

## 2. 一致性检查

| Concern                             | G3 判断 | 证据                                                                                                                |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| Document -> code                    | Pass    | 实现范围与 `EX-37C2` G1 baseline 的 L5 calculation / payout / adjustment / settlement / rule 字段清单一致。         |
| ADR-015 / route inventory           | Pass    | 不新增、不删除、不改 public route path / method；本片只改既有 response contract。                                   |
| DTO / contract -> controller output | Pass    | shared contract、OpenAPI、generated client 均只暴露本片 projection 字段，不再保留对应 legacy scalar response 字段。 |
| Query / view                        | Pass    | `CommissionService` 在 response mapper 阶段生成 projection；service / controller specs 已同步新 DTO 形状。          |
| Guard / permission                  | Pass    | `commission-compensation` 使用 `commission:amount:sensitive:read`；`operating-finance` 使用既有经营敏感读权限。     |
| Migration / entity                  | N/A     | 本片不改 DDL / entity / repository；原始业务值仍只在持久化和 command 语义中存在。                                   |
| Frontend consumer                   | Pass    | L5 提成操作页、最终结算页和规则解释页已改为读取 generated projection 字段。                                         |

---

## 3. 测试与校验

| Check                    | Required | Command / Evidence                                                                                                              | Result | Notes                                                                                                          |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Shared contracts build   | Yes      | `corepack pnpm nx build shared-contracts`                                                                                       | Pass   | DTO schema 类型通过。                                                                                          |
| Backend lint             | Yes      | `corepack pnpm nx lint poms-api`                                                                                                | Pass   | 无新增 lint warning。                                                                                          |
| Backend build            | Yes      | `corepack pnpm nx build poms-api`                                                                                               | Pass   | API 编译通过。                                                                                                 |
| Backend tests            | Yes      | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/commission/commission.service.spec.ts --runInBand`    | Pass   | Jest 实际运行 `poms-api` 40 个 test suites / 504 tests。                                                       |
| Backend controller tests | Yes      | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/commission/commission.controller.spec.ts --runInBand` | Pass   | Jest 实际运行 `poms-api` 40 个 test suites / 503 tests；新增 service masked projection 后 rerun 为 504 tests。 |
| OpenAPI generation       | Yes      | `corepack pnpm nx run poms-api:openapi`                                                                                         | Pass   | 生成 `libs/shared/api-spec/openapi.json`。                                                                     |
| Generated client         | Yes      | `corepack pnpm nx run shared-api-client:check`                                                                                  | Pass   | 与 OpenAPI 完全同步。                                                                                          |
| Frontend lint            | Yes      | `corepack pnpm nx lint poms-admin`                                                                                              | Pass   | L5 frontend consumer 类型通过。                                                                                |
| Frontend tests           | Yes      | `corepack pnpm nx test poms-admin --runInBand`                                                                                  | Pass   | 25 个 test suites / 137 tests。                                                                                |
| Frontend build           | Yes      | `corepack pnpm nx build poms-admin`                                                                                             | Pass   | projection-only generated DTO 未打断前端构建。                                                                 |
| Markdown format          | Yes      | `corepack pnpm run format:md:check`                                                                                             | Pass   | 本轮文档格式检查通过。                                                                                         |
| Diff whitespace          | Yes      | `git diff --check`                                                                                                              | Pass   | 无 whitespace error。                                                                                          |
| Migration check          | No       | N/A                                                                                                                             | N/A    | 不改 DDL。                                                                                                     |
| Browser E2E              | No       | N/A                                                                                                                             | N/A    | 本片不新增导航入口；浏览器权限矩阵和残余敏感字段验证由 `FE-44` 收口。                                          |

---

## 4. Drift 判断

| Drift                                                                                                             | Classification          | Decision                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| OpenAPI generator 输出 `CreateCommissionRuleVersionRequest.propertyNames` / `AuditSnapshot.propertyNames` warning | existing-baseline-drift | 非本片新增；`shared-api-client:check` 最终通过，暂不阻断。                            |
| `EX-37C2` 采用 projection-only direct cutover                                                                     | accepted-direct-cutover | 当前仍处开发期、未上线；本片不设置兼容策略，不保留 legacy scalar，不做双字段过渡。    |
| L5 前端基础消费并入 `EX-37C2`                                                                                     | accepted-direct-cutover | 前后端同片一次性切换到 projection-only；`FE-44` 缩小为 residual review 与浏览器矩阵。 |

---

## 5. 例外与风险

| Exception ID                           | Status | Scope                    | Owner | Cleanup Due | Notes                                                                                  |
| -------------------------------------- | ------ | ------------------------ | ----- | ----------- | -------------------------------------------------------------------------------------- |
| `EX37C2-R1-NON-AMOUNT-NARRATIVE-SCOPE` | Open   | Sensitive classification | Codex | 后续治理    | 非本片冻结的结算叙述字段不在本片扩大处理；由 `FE-44` / 后续字段分级复审决定。          |
| `EX37C2-R2-EVENT-VOLUME`               | Open   | Security event volume    | Codex | 后续治理    | 列表 projection 仍按逐字段审计记录 masked event；批量降噪另开审计优化，不阻塞本片 G3。 |

---

## 6. G3 结论

`EX-37C2` 本地实现可进入提交前收口。

在当前变更提交前，tracker 保持 `Doing / G3`；提交落地后再执行 `G4` close-out，并将 `EX-37C` 父任务是否关闭与 `FE-44` 是否启动作为下一步决策。
