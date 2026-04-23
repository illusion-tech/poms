# EX-12D1 Commission Adjustment Downstream Results 实施基线包

- Gate Status: `Pass`
- Parent: `EX-12`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-12D1`

---

## 1. 范围

- 本次目标:
  1. 收紧 `clawback / supplement` 的执行语义，禁止“只把 adjustment 标为 executed”而不形成 downstream 结果。
  2. 为 `supplement` 落地补偿性 `CommissionPayout` 记录链，保留原发放记录不被覆盖。
  3. 为 `clawback` 落地受控负向结果语义，并补齐 unit / HTTP E2E 覆盖。
- 本次明确不做:
  1. 不扩展真实财务付款、银行流水或薪资系统联动。
  2. 不新建独立 `CommissionAdjustmentResult` 聚合对象；优先在现有 `CommissionPayout` / `CommissionAdjustment` 链内闭环。
  3. 不改 canonical route grammar；仅在必要时补 shared contract / OpenAPI 字段。
- 下游可依赖的交付边界:
  1. `supplement` 执行后必须形成新的补偿性 payout 记录，且原 payout 保留原动作事实。
  2. `clawback` 执行后必须形成明确的 source payout 结果状态，不再停留在 adjustment 单点留痕。
  3. payout list / admin consumer / E2E 能识别补偿性 payout 与 source payout 关系。
- 不允许下游依赖的留白:
  1. 不接受继续保留“`supplement` 只有 adjustment，没有补偿性 payout”的半闭环实现。
  2. 不接受通过直接覆盖原 payout 金额来表达补发或扣回结果。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor                                              | Status   | Notes                                                                       |
| ------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| Business design           | `commission-settlement-design.md`                                 | `8.3`, `8.4`, `11.2`, `11.3`, `14`                            | Accepted | 已发放记录不可直接删除；异常通过 adjustment 进入暂停 / 扣回 / 补发 / 冲销链 |
| Business design           | `phase2-commission-staged-payout-adjustment-paths.md`             | `6`, `7`, `8.2`, `11`                                         | Accepted | 明确补发=新增发放记录；扣回 / 补发 / 冲销 / 重算必须区分                    |
| Query boundary            | `query-view-boundary-design.md`                                   | `CommissionPayoutListView`, `CommissionAdjustmentHistoryView` | Accepted | 读侧必须保留原发放引用与异常结果状态                                        |
| Data model / table freeze | `table-structure-freeze-design.md`                                | `commission_payout`, `commission_adjustment`                  | Accepted | 允许在既有对象边界内补链，不改域主对象划分                                  |
| Schema / DDL              | `schema-ddl-design.md`                                            | `commission_payout`, `commission_adjustment`                  | Accepted | 需补 migration 使 payout 能承载补偿性记录                                   |
| Corrective checkpoint     | `ex-10-ex-12-review-corrective-checkpoint.md`                     | `3`, `4`, `7`, `9`                                            | Accepted | 本切片是 `EX-10 ~ EX-12` 剩余唯一阻断                                       |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | `gates`                                                       | Accepted | corrective 子切片进入 `G1`                                                  |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                                                                                                                       | Implementation Rule                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Business semantics        | `supplement` = 新增补偿性业务发放记录；`clawback` = 对既有已发结果形成负向调整结果                                                         | 两者都必须落到可解释 downstream 结果，不再只停留在 adjustment 自身状态      |
| Route / command naming    | canonical route 不变                                                                                                                       | 继续复用 `POST /commission-adjustments/{id}:execute`                        |
| DTO / contract naming     | payout summary 需显式区分 primary payout 与 supplement payout，并保留 source payout 关系                                                   | shared contract / OpenAPI / generated client 需同步回写                     |
| Table / column naming     | `commission_payout` 继续承载业务发放结果；补偿性 payout 通过新增 kind / source relation 承载                                               | 不直接改原 payout 金额；通过新增记录表达补发结果                            |
| Date / time semantics     | compensating payout 的 `handledAt` / `createdAt` 代表执行落账时点                                                                          | 与 adjustment `executedAt` 同步产生                                         |
| Identifier semantics      | `sourcePayoutId` 指向被补偿的原 payout；`relatedPayoutId` 仍指 adjustment 直接关联的目标 payout                                            | 不混用 `reversedFromId` 语义                                                |
| Money / decimal semantics | `clawback amount` 必须不超过 source payout 已登记金额；`supplement amount` 作为 compensating payout 的 `approvedAmount = paidRecordAmount` | 不允许负数；不允许 silent rounding drift                                    |
| Status machine            | `supplement` 生成 `paid` 的 compensating payout；`clawback` 依据扣回金额把 source payout 收口为 `suspended` 或 `reversed`                  | `clawback` / `supplement` 的 allowed source payout 状态必须收紧到已发结果链 |

---

## 4. 命令与接口边界

| Route / Controller                                 | Command / Service   | Request DTO / Contract               | Response DTO / Contract         | Guard / Permission                                                                               | Design Source                     | Result |
| -------------------------------------------------- | ------------------- | ------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------- | ------ |
| `POST /commission-adjustments/{id}:execute`        | `executeAdjustment` | `ExecuteCommissionAdjustmentRequest` | `CommissionAdjustmentSummary`   | 权限不变；已补 `clawback / supplement` 结果 guard，并阻断对 supplement payout 的二次生命周期动作 | `commission-settlement-design.md` | Pass   |
| `GET /projects/{projectId}/commission-payouts`     | `listPayouts`       | N/A                                  | `CommissionPayoutSummary[]`     | 权限不变；已回传 compensating payout，并暴露 `payoutKind` / `sourcePayoutId`                     | `query-view-boundary-design.md`   | Pass   |
| `GET /projects/{projectId}/commission-adjustments` | `listAdjustments`   | N/A                                  | `CommissionAdjustmentSummary[]` | 权限不变；调整记录继续保留 source payout 引用，downstream 结果通过 payout 链解释                 | `query-view-boundary-design.md`   | Pass   |

---

## 5. 读侧边界

| Query / View                      | Consumer             | Fields                                                             | Filter / Sort             | Permission Boundary                  | Design Source                   | Result |
| --------------------------------- | -------------------- | ------------------------------------------------------------------ | ------------------------- | ------------------------------------ | ------------------------------- | ------ |
| `CommissionPayoutListView`        | admin + API consumer | 已新增 `payoutKind`、`sourcePayoutId`                              | 继续按时间倒序 / 项目维度 | 不新增敏感金额字段类型，只补结果关系 | `query-view-boundary-design.md` | Pass   |
| `CommissionAdjustmentHistoryView` | admin + API consumer | 继续展示 `adjustmentType`、target；补偿链通过 payout relation 解释 | 不变                      | 不扩权限                             | `query-view-boundary-design.md` | Pass   |

---

## 6. 持久化边界

| Table                   | Migration                                                                                                                                                                                      | Entity / Repository                                                   | DDL / Freeze Source                                                                      | Check Result |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------ |
| `commission_payout`     | 新增 `Migration20260418143000_ex12d1_commission_payout_compensating_chain.ts`：补 `payout_kind`、`source_payout_id`，并把“每 calculation/stage 只允许一个 primary payout”收紧为 partial unique | `CommissionPayout` / `CommissionRepository` / `CommissionService`     | `commission-settlement-design.md`、`phase2-commission-staged-payout-adjustment-paths.md` | Pass         |
| `commission_adjustment` | 保持现有表结构；downstream 结果通过 source payout 状态与 supplement payout 链表达                                                                                                              | `CommissionAdjustment` / `CommissionRepository` / `CommissionService` | `commission-settlement-design.md`                                                        | Pass         |

| Field             | Design Type / Meaning                      | Migration / DDL                                                   | Entity                 | Shared Contract / OpenAPI                      | Result |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------- | ---------------------- | ---------------------------------------------- | ------ |
| `payoutKind`      | `primary` / `supplement`，标识发放记录类型 | `commission_payout.payout_kind`，默认 `primary`                   | `CommissionPayout`     | `CommissionPayoutSummary` 已新增枚举字段       | Pass   |
| `sourcePayoutId`  | supplement payout 指向被补偿的原 payout    | `commission_payout.source_payout_id` FK -> `commission_payout.id` | `CommissionPayout`     | `CommissionPayoutSummary` 已新增 nullable 引用 | Pass   |
| `relatedPayoutId` | adjustment 直接关联的 source payout        | 不变                                                              | `CommissionAdjustment` | 不变                                           | Pass   |
| `amount`          | `clawback / supplement` 执行金额           | 不变                                                              | `CommissionAdjustment` | 不变                                           | Pass   |

---

## 7. 一致性结论

- Document -> code: 设计要求的“补发新增发放记录、扣回形成明确结果状态”已落地到 service、entity、admin consumer 与 E2E。
- Migration -> entity: `commission_payout` 新结构已由 migration、entity metadata 与 `migration-check` 三方对齐。
- Entity -> contract: `CommissionPayoutSummary` 已显式暴露 `payoutKind`、`sourcePayoutId`，admin / API consumer 可稳定识别补偿链。
- Route -> command: route 保持不变，语义在 execute/list query 内收口完成。
- Query -> view: payout list 已能解释 primary vs supplement payout；adjustment history 继续保留原 adjustment 事实。
- Guard / permission: `clawback` / `supplement` 现在仅允许作用于已发结果链，supplement payout 本身不再暴露审批 / 登记生命周期动作。
- OpenAPI / generated client: payout summary shape 变更已同步生成与校验。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                         | Result | Gap / Reason                                                                      |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`、`corepack pnpm nx lint poms-admin`                                                                       | Pass   | 2026-04-18 已执行                                                                 |
| Build                            | Yes      | `corepack pnpm nx build poms-api`、`corepack pnpm nx build poms-admin`                                                                     | Pass   | 2026-04-18 已执行                                                                 |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=commission`                                                                 | Pass   | 2026-04-18 已执行，5 suites / 80 tests 通过                                       |
| API / integration tests          | Yes      | `commission.service.spec.ts` / controller specs                                                                                            | Pass   | 已覆盖 compensating payout 创建、supplement payout guard 与 clawback result state |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPattern=commission-workflow.e2e-spec.ts`                                      | Pass   | 2026-04-18 已执行，10 suites / 63 tests 通过                                      |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check` | Pass   | payout summary shape 变化已同步生成                                               |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check`                                              | Pass   | 2026-04-18 已执行，schema is up-to-date                                           |
| Diff / whitespace check          | Yes      | `git diff --check`                                                                                                                         | Pass   | 2026-04-18 close-out 已执行；无 whitespace error                                  |

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                            |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 不接受“先只补 adjustment 结果文案，后续再补 payout 链”的过渡方案 |

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. `supplement` 必须形成真实 compensating payout 记录，不接受仅靠 adjustment `amount` 表达补发。
  2. `clawback` 必须形成 source payout 结果状态，不接受只把 adjustment 标记为 `executed`。
  3. 本切片完成时必须同步回写 shared contract、OpenAPI、generated client、admin consumer、tracker 与 corrective checkpoint。
