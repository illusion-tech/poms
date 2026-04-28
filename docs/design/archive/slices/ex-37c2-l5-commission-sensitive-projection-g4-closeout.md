# EX-37C2 L5 提成敏感金额后端投影切换 G4 Close-out

- Task ID: `EX-37C2`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend consumption
- Baseline: `docs/design/archive/slices/ex-37c2-l5-commission-sensitive-projection-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-37c2-l5-commission-sensitive-projection-g3-checkpoint.md`
- Implementation Commit: `927f37c feat(commission): 完成 EX-37C2 提成敏感字段投影闭环`

---

## 1. G4 结论

`EX-37C2` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. `CommissionCalculationSummary` 已将收入、成本、毛利、毛利率和提成池 response 字段切为 `SensitiveStringFieldProjection`。
2. `CommissionPayoutSummary` 已将理论上限、批准金额和实发金额 response 字段切为 `SensitiveStringFieldProjection`。
3. `CommissionAdjustmentSummary` 已将调整金额和调整原因 response 字段切为 `SensitiveStringFieldProjection`。
4. `CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` 已将税务影响、待明确金额和下一步说明切为 projection。
5. 本片按开发期 direct cutover 一次性切换，不设置兼容策略、不保留 legacy scalar、不做双字段过渡。
6. `CommissionController` 已为受影响 endpoints 传递 request user 与 request context。
7. `CommissionService` 已在 response mapper 阶段调用 `SensitiveFieldProjectionService.projectStringField`。
8. L5 提成操作页、最终结算页和规则解释页已直接消费 generated projection 字段。
9. shared contracts、OpenAPI、generated client、后端 tests、前端 tests 和治理文档已同步。

---

## 2. 提交证据

| Evidence              | Result                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Implementation commit | `927f37c feat(commission): 完成 EX-37C2 提成敏感字段投影闭环`                                               |
| Shared contracts      | `libs/shared/contracts/src/lib/shared-contracts.ts`                                                         |
| API runtime           | `apps/poms-api/src/app/features/commission/commission.controller.ts`、`commission.service.ts`               |
| API tests             | `apps/poms-api/src/app/features/commission/commission.controller.spec.ts`、`commission.service.spec.ts`     |
| Frontend consumers    | `project-commission.ts`、`project-commission-final-settlement.ts`、`project-commission-rule-explanation.ts` |
| Generated files       | `libs/shared/api-spec/openapi.json`、`libs/shared/api-client/model/commission-*`                            |
| Governance files      | EX-37C2 baseline、EX-37C2 G3 checkpoint、tracker、progress                                                  |

---

## 3. G3 验证回放

| Check                                                                                                                           | Result |
| ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `corepack pnpm nx build shared-contracts`                                                                                       | Pass   |
| `corepack pnpm nx lint poms-api`                                                                                                | Pass   |
| `corepack pnpm nx build poms-api`                                                                                               | Pass   |
| `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/commission/commission.service.spec.ts --runInBand`    | Pass   |
| `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/commission/commission.controller.spec.ts --runInBand` | Pass   |
| `corepack pnpm nx run poms-api:openapi`                                                                                         | Pass   |
| `corepack pnpm nx run shared-api-client:check`                                                                                  | Pass   |
| `corepack pnpm nx lint poms-admin`                                                                                              | Pass   |
| `corepack pnpm nx build poms-admin`                                                                                             | Pass   |
| `corepack pnpm nx test poms-admin --runInBand`                                                                                  | Pass   |
| `corepack pnpm run format:md:check`                                                                                             | Pass   |
| `git diff --check`                                                                                                              | Pass   |

`poms-api` focused command 实际运行全量 API Jest，最终结果为 `40` suites / `504` tests passed。`poms-admin` 全量 Jest 结果为 `25` suites / `137` tests passed。

---

## 4. Drift 与例外

| Item                                       | Status            | Decision                                                                      |
| ------------------------------------------ | ----------------- | ----------------------------------------------------------------------------- |
| `EX-37C2` projection-only direct cutover   | Closed at G3      | 开发期直接一步到位；不保留 legacy scalar，不做双字段过渡。                    |
| L5 前端基础消费并入 `EX-37C2`              | Closed at G3      | 前后端同片一次性切换 generated projection 字段，避免中间态断裂。              |
| `EX37C2-R1-NON-AMOUNT-NARRATIVE-SCOPE`     | Open downstream   | 非本片冻结的结算叙述字段不在本片扩大处理；由 `FE-44` / 后续字段分级复审决定。 |
| `EX37C2-R2-EVENT-VOLUME`                   | Open downstream   | 列表 projection 仍按逐字段审计记录 masked event；批量降噪另开审计优化。       |
| OpenAPI generator `propertyNames` warnings | Existing baseline | `shared-api-client:check` 通过，warning 非本片新增，不阻塞 G4。               |
| Public route surface                       | No change         | 本片未新增、删除或改名 public route，不需要更新 authoritative API inventory。 |
| Persistence                                | No change         | 本片未改 DDL、entity、repository 或 migration。                               |
| Browser E2E                                | Deferred boundary | 本片不新增导航入口；残余敏感字段复审和浏览器权限矩阵由 `FE-44` 收口。         |

---

## 5. 下游承接

`EX-37C2` 关闭后，下游顺序为：

1. `FE-44`：残余敏感字段投影复审和 L4 / L5 浏览器权限矩阵验证。
2. 后续审计增强：如需减少列表 projection 的逐字段 masked event 量，另开安全事件批量降噪切片。

`EX-37C` 父任务保持 `Doing`，直到 `FE-44` 完成 G4。
