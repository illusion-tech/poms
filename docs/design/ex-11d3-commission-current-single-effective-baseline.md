# EX-11D3 Commission Current Single-Effective 实施基线包

- Gate Status: `Pass`
- Parent: `EX-11`
- Owner: `Codex`
- Slice Type: `persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-11D3`

---

## 1. 范围

- 本次目标:
  1. 为 `commission_role_assignment` 与 `commission_calculation` 补齐 `project_id where is_current = true` 条件唯一索引。
  2. 在写侧保留最小并发 guard，把 DB `single-current` 约束冲突转为可解释业务错误。
  3. 完成 migration、service、自动化测试与治理文档回写。
- 本次明确不做:
  1. 不改变 `project_id + version` 版本唯一约束。
  2. 不改变 route、DTO、OpenAPI 或 generated client。
  3. 不处理 `clawback / supplement` 下游语义，该项继续留给 `EX-12D1`。
- 下游可依赖的交付边界:
  1. 同一 `project_id` 同时只能有一条当前有效 `CommissionRoleAssignment`。
  2. 同一 `project_id` 同时只能有一条当前有效 `CommissionCalculation`。
  3. 并发冲突不再裸露数据库唯一键异常，而是转为业务可解释错误。
- 不允许下游依赖的留白:
  1. 不允许继续只依赖应用层“先查再写”来假定 single-current。
  2. 不接受“先上 migration，service 再以后补冲突转义”的过渡方案。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor                                         | Status   | Notes                                              |
| ------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- | -------- | -------------------------------------------------- |
| Business design           | `ex-10-ex-12-review-corrective-checkpoint.md`                     | `3`, `4`, `7`                                            | Accepted | 明确把 DB 级 current 单有效约束列为剩余阻断        |
| Command design            | `interface-command-design.md`                                     | `commission`                                             | Accepted | 本切片不改 command grammar，只补 persistence guard |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | `commission`                                             | Accepted | 本切片无 DTO 形状变更                              |
| Query boundary            | `query-view-boundary-design.md`                                   | `commission`                                             | Accepted | 读侧无新增字段或过滤变化                           |
| Data model / table freeze | `table-structure-freeze-design.md`                                | `commission_role_assignment`, `commission_calculation`   | Accepted | 两表都固定为版本链表，含 `is_current`              |
| Schema / DDL              | `schema-ddl-design.md`                                            | `224-225`, `231-233`, `266-268`, `291-292`, `770`, `966` | Accepted | `PostgreSQL` partial unique index 是 SSOT          |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | `gates`                                                  | Accepted | 作为 corrective 子切片进入 `G1`                    |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                                                                                                        | Implementation Rule                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Business semantics        | `CommissionRoleAssignment` / `CommissionCalculation` 都属于单主体单 current 版本链                                          | 单 project 同时最多一条 `is_current = true`            |
| Route / command naming    | public route / command grammar 不变                                                                                         | 本切片只改 migration 与 service 并发 guard             |
| DTO / contract naming     | 无 request / response 形状变更                                                                                              | OpenAPI / generated client 不需要回写                  |
| Table / column naming     | `commission_role_assignment.project_id + is_current(true)`、`commission_calculation.project_id + is_current(true)` 条件唯一 | 用 PostgreSQL partial unique index 落地                |
| Date / time semantics     | 无新增时间字段                                                                                                              | N/A                                                    |
| Identifier semantics      | 冲突主体 identity 统一为 `project_id`                                                                                       | unique violation message 必须指向 project current 冲突 |
| Money / decimal semantics | 无金额字段调整                                                                                                              | N/A                                                    |
| Status machine            | `is_current` 单有效由 DB 约束为主，service 预检查 / 异常转义为辅                                                            | 并发写入不得产生双 current                             |

---

## 4. 命令与接口边界

| Route / Controller                                       | Command / Service        | Request DTO / Contract                  | Response DTO / Contract           | Guard / Permission                                                               | Design Source                 | Result |
| -------------------------------------------------------- | ------------------------ | --------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- | ----------------------------- | ------ |
| `POST /projects/{projectId}/commission-role-assignments` | `createRoleAssignment`   | `CreateCommissionRoleAssignmentRequest` | `CommissionRoleAssignmentSummary` | 维持原权限；新增 DB current unique 冲突转义，并在事务内先降旧 current 再写新版本 | `interface-command-design.md` | Done   |
| `POST /projects/{projectId}/commission-calculations`     | `createCalculation`      | `CreateCommissionCalculationRequest`    | `CommissionCalculationSummary`    | 维持原权限；新增 DB current unique 冲突转义，并在事务内先降旧 current 再写新版本 | `interface-command-design.md` | Done   |
| `POST /commission-calculations/{id}:recalculate`         | `recalculateCalculation` | `RecalculateCommissionRequest`          | `CommissionCalculationSummary`    | 维持原权限；新增 DB current unique 冲突转义，并在事务内先降旧 current 再写新版本 | `interface-command-design.md` | Done   |

---

## 5. 读侧边界

| Query / View                                    | Consumer             | Fields     | Filter / Sort | Permission Boundary | Design Source                   | Result |
| ----------------------------------------------- | -------------------- | ---------- | ------------- | ------------------- | ------------------------------- | ------ |
| `getCurrentRoleAssignment` / `listCalculations` | admin + API consumer | 无新增字段 | 不变          | 不变                | `query-view-boundary-design.md` | N/A    |

---

## 6. 持久化边界

| Table                        | Migration                                                                                                              | Entity / Repository                                                       | DDL / Freeze Source          | Check Result |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------- | ------------ |
| `commission_role_assignment` | 已新增 `Migration20260418110000_ex11d3_commission_current_unique.ts`，补 `project_id where is_current = true` 条件唯一 | `CommissionRoleAssignment` / `CommissionRepository` / `CommissionService` | `schema-ddl-design.md` §7.4H | Pass         |
| `commission_calculation`     | 已新增 `Migration20260418110000_ex11d3_commission_current_unique.ts`，补 `project_id where is_current = true` 条件唯一 | `CommissionCalculation` / `CommissionRepository` / `CommissionService`    | `schema-ddl-design.md` §7.4  | Pass         |

| Field       | Design Type / Meaning   | Migration / DDL                                   | Entity                                                   | Shared Contract / OpenAPI | Result |
| ----------- | ----------------------- | ------------------------------------------------- | -------------------------------------------------------- | ------------------------- | ------ |
| `isCurrent` | 当前有效版本标记        | `create unique index ... where is_current = true` | 两个 entity 已补 `uniques.expression` 与迁移同构声明     | 无变更                    | Pass   |
| `projectId` | single-current 约束主体 | partial unique index key                          | 两个 entity 已存在 `projectId` 并作为 partial unique key | 无变更                    | Pass   |

---

## 7. 一致性结论

- Document -> code: 设计已要求 current 单有效，本切片已把该要求落实为强制 partial unique + 写侧冲突转义。
- Migration -> entity: migration 与 entity `uniques.expression` 已对齐，`migration-check` 通过。
- Entity -> contract: contract 不变；本切片不引入 DTO drift。
- Route -> command: route / command 不变，只增强并发一致性。
- Query -> view: 读侧不变，但将依赖更强的 DB single-current 保证。
- Guard / permission: service 继续做预检查，并在 create / recalculate / arbitration replacement 触发 unique violation 时给出业务错误。
- OpenAPI / generated client: 不涉及 request / response 形状变更，不需要生成回写。

---

## 8. 测试与校验

| Check                            | Required    | Command / Evidence                                                                                    | Result | Gap / Reason                                                                      |
| -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Lint                             | Yes         | `corepack pnpm nx lint poms-api`                                                                      | Pass   | 2026-04-18 已执行                                                                 |
| Build                            | Yes         | `corepack pnpm nx build poms-api`                                                                     | Pass   | 2026-04-18 已执行                                                                 |
| Unit tests                       | Yes         | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=commission`                            | Pass   | 2026-04-18 已执行，5 suites / 76 tests 通过                                       |
| API / integration tests          | Yes         | `commission.service.spec.ts` / controller specs                                                       | Pass   | 已覆盖 role assignment / calculation current 冲突转义与 recalculation guard       |
| E2E                              | Conditional | `corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPattern=commission-workflow.e2e-spec.ts` | Pass   | 2026-04-18 已执行，10 suites / 61 tests 通过；争议裁决替代 current 切换链路已验证 |
| OpenAPI generation / client diff | No          | N/A                                                                                                   | N/A    | 无 contract 变更                                                                  |
| Migration / schema check         | Yes         | `corepack pnpm nx run poms-api:migration-check`                                                       | Pass   | 2026-04-18 已执行，schema is up-to-date                                           |
| Diff / whitespace check          | Yes         | `git diff --check`                                                                                    | Pass   | 2026-04-18 已执行；仅有 Git CRLF 提示，无 whitespace error                        |

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                            |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------------------------------------ |
| 无           | -     | -     | -           | -             | -           | 本切片不接受例外，目标是直接闭环 DB current 约束 |

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. `commission_role_assignment` 与 `commission_calculation` 必须同时补齐 partial unique，不接受只修其中一张表。
  2. 若 migration 引入的 unique violation 在 service 侧未转义为业务错误，则本切片不得关闭。
  3. 本切片完成时必须补 `migration-check`、commission unit test、`poms-api` build 与 tracker / checkpoint 回写。
