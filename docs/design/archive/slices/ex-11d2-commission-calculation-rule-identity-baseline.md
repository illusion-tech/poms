# EX-11D2 CommissionCalculation Rule Identity 收口 实施基线包

- Gate Status: `Pass`
- Parent: `EX-11`
- Owner: `Codex`
- Slice Type: `api / command`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-11D2`

---

## 1. 范围

- 本次目标:
  1. 为 `CreateCommissionCalculationRequest` 建立显式规则 identity，消除当前“从全部 active rule 里取第一个”的隐式实现。
  2. 同步收口 controller / service / shared contract / OpenAPI / generated client / admin consumer 的 calculation create 输入。
  3. 保持现有 canonical route `POST /projects/{projectId}/commission-calculations` 不变，只修正 request contract 语义。
- 本次明确不做:
  1. 不改 `recalculateCommission` request 的 route 或 command 名称。
  2. 不扩展新的 commission rule 查询页或 selector UI 工作区。
  3. 不在本切片补 DB 级 current 唯一约束，该项继续留给 `EX-11D3`。
- 下游可依赖的交付边界:
  1. calculation create 请求必须显式携带 `ruleVersionId`。
  2. service 必须按请求指定的 `ruleVersionId` 读取规则，并校验其存在且 `status = active`。
  3. shared contract、OpenAPI、generated client 与 admin consumer 的 request shape 保持一致。
- 不允许下游依赖的留白:
  1. 不允许继续依赖“系统自己挑一个 active rule”的隐式行为。
  2. 不接受“先沿用旧 contract，等以后统一改”的过渡方案。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor          | Status   | Notes                                                                |
| ------------------------- | ----------------------------------------------------------------- | ------------------------- | -------- | -------------------------------------------------------------------- |
| Business design           | `commission-settlement-design.md`                                 | `6.3`, `12.5`, `12.6`     | Accepted | 设计已把 `CommissionCalculation` 输入包明确为包含 `ruleVersionId`    |
| Business design           | `ex-10-ex-12-review-corrective-checkpoint.md`                     | `3`, `4`, `7`             | Accepted | 当前隐式 active-rule 选择已归类为 `design-change-required`           |
| Command design            | `interface-command-design.md`                                     | `commission`              | Accepted | calculation create 命令边界保持不变，仅补 request identity           |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | `commission-calculations` | Accepted | route 不变；request contract 需与设计口径对齐                        |
| Query boundary            | `query-view-boundary-design.md`                                   | `commission`              | Accepted | 本切片不改 list/detail query 形状                                    |
| Data model / table freeze | `table-structure-freeze-design.md`                                | `commission`              | Accepted | 持久化已有 `commission_calculation.rule_version_id` 字段，可直接消费 |
| Schema / DDL              | `schema-ddl-design.md`                                            | `commission_calculation`  | Accepted | 无新增表结构，只修 command contract 与现有列的消费方式               |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | `gates`                   | Accepted | 当前按 `G1` 冻结 corrective 子切片输入                               |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                                              | Implementation Rule                                                                      |
| ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Business semantics        | 提成计算必须显式绑定某一条规则版本，不能依赖隐式 active rule 选择 | create calculation 时读取请求中的 `ruleVersionId`，并验证该规则版本当前为 `active`       |
| Route / command naming    | `POST /projects/{projectId}/commission-calculations`              | route 不变，只调整 request body                                                          |
| DTO / contract naming     | `CreateCommissionCalculationRequest.ruleVersionId: uuid`          | shared contract、api-contracts DTO、OpenAPI、generated client 与 admin consumer 同步收口 |
| Table / column naming     | 持久化继续使用现有 `commission_calculation.rule_version_id`       | 不新增列，不改 migration                                                                 |
| Date / time semantics     | 无新增时间字段                                                    | 维持现有 `datetime` 语义                                                                 |
| Identifier semantics      | 显式规则 identity 采用内部 `CommissionRuleVersion.id`             | 不接受 `ruleCode` + latest active version 的间接推断                                     |
| Money / decimal semantics | 本切片不改金额字段                                                | N/A                                                                                      |
| Status machine            | 仅允许 `status = active` 的规则版本进入 calculation create        | draft / stopped 规则版本必须被拒绝                                                       |

---

## 4. 命令与接口边界

| Route / Controller                                   | Command / Service        | Request DTO / Contract                                    | Response DTO / Contract        | Guard / Permission                        | Design Source                     | Result |
| ---------------------------------------------------- | ------------------------ | --------------------------------------------------------- | ------------------------------ | ----------------------------------------- | --------------------------------- | ------ |
| `POST /projects/{projectId}/commission-calculations` | `createCalculation`      | `CreateCommissionCalculationRequest` 新增 `ruleVersionId` | `CommissionCalculationSummary` | 继续要求 `commission:calculations:manage` | `commission-settlement-design.md` | Done   |
| `POST /commission-calculations/{id}:recalculate`     | `recalculateCalculation` | `RecalculateCommissionRequest` 不变                       | `CommissionCalculationSummary` | 继续要求当前 effective calculation        | `interface-openapi-dto-design.md` | N/A    |

---

## 5. 读侧边界

| Query / View       | Consumer                   | Fields                             | Filter / Sort | Permission Boundary | Design Source                   | Result |
| ------------------ | -------------------------- | ---------------------------------- | ------------- | ------------------- | ------------------------------- | ------ |
| `listCalculations` | admin commission workspace | `ruleVersionId` 已存在，无新增字段 | 不变          | 不变                | `query-view-boundary-design.md` | N/A    |

---

## 6. 持久化边界

| Table                     | Migration                                             | Entity / Repository                              | DDL / Freeze Source    | Check Result                                          |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------ | ---------------------- | ----------------------------------------------------- |
| `commission_calculation`  | 复用 `Migration20260325200000_init_commission_s11.ts` | `CommissionCalculation` / `CommissionRepository` | `schema-ddl-design.md` | 复用现有 `rule_version_id`，无新增 migration          |
| `commission_rule_version` | 复用 `Migration20260325190000_init_commission_s10.ts` | `CommissionRuleVersion` / `CommissionRepository` | `schema-ddl-design.md` | create calculation 需要按 `id + status = active` 读取 |

| Field           | Design Type / Meaning                             | Migration / DDL                                 | Entity                                       | Shared Contract / OpenAPI                                                                                   | Result |
| --------------- | ------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| `ruleVersionId` | `uuid`，显式选择本次 calculation 所消费的规则版本 | 已存在 `commission_calculation.rule_version_id` | `CommissionCalculation.ruleVersionId` 已存在 | `CreateCommissionCalculationRequest` 已补齐同名字段，并已同步到 OpenAPI / generated client / admin consumer | Done   |

---

## 7. 一致性结论

- Document -> code: 设计已经要求 calculation 输入包包含 `ruleVersionId`，当前实现已回正。
- Migration -> entity: 持久化与实体已有 `rule_version_id / ruleVersionId`，不需要新列。
- Entity -> contract: contract 已补齐 `ruleVersionId`，并与 entity / OpenAPI / generated client 对齐。
- Route -> command: route 不变，command 语义改为“显式指定规则版本”。
- Query -> view: list/detail view 不变，仅 create request 改动。
- Guard / permission: 在原有 calculations manage 权限之外，新增“规则版本必须 active”的明确 guard。
- OpenAPI / generated client: 已同步回写，admin consumer 已改为显式选择 active rule version。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                         | Result  | Gap / Reason                                                    |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`；`corepack pnpm nx lint poms-admin`                                                                       | Pass    | 2026-04-18 已执行                                               |
| Build                            | Yes      | `corepack pnpm nx build poms-api`；`corepack pnpm nx build poms-admin`                                                                     | Pass    | 2026-04-18 已执行                                               |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=commission`                                                                 | Pass    | 2026-04-18 已执行，5 suites / 73 tests 通过                     |
| API / integration tests          | Yes      | `commission.service.spec.ts` / controller specs                                                                                            | Pass    | 已覆盖 requested rule version missing / inactive / success path |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPattern=commission-workflow.e2e-spec.ts`                                      | Pass    | 2026-04-18 已执行，10 suites / 61 tests 通过                    |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check` | Pass    | 2026-04-18 已执行                                               |
| Migration / schema check         | No       | N/A                                                                                                                                        | N/A     | 本切片不新增 migration                                          |
| Diff / whitespace check          | Yes      | `git diff --check`                                                                                                                         | Pending | 实现后执行                                                      |

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                              |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------------------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 当前不存在 E2E 环境例外；`EX-11D2` 实现后应直接复跑 build / openapi / client / e2e |

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. calculation create request 统一采用 `ruleVersionId`，不接受 `ruleCode` 或隐式 active selection 作为过渡方案。
  2. implementation 必须同步回写 shared contract、OpenAPI、generated client 和 admin consumer。
  3. 本切片不新增 migration；若实现中发现需要 persistence 变更，应停止并重新冻结输入。
