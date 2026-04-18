# EX-14A Final Settlement / Rule Explanation Model 实施基线包

- Gate Status: `Pass`
- Parent: `EX-14`
- Owner: `Codex`
- Slice Type: `persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-14A`

---

## 1. 范围

- 本次目标:
  1. 为 `EX-14` 补齐 `CommissionDepartureExceptionDecision`、`CommissionFinalSettlementSnapshot` 与 `CommissionRuleExplanationSnapshot` 三张正式模型表，承接离职 / 特例结论、最终结算 / 质保金结算收口状态与统一规则解释结果。
  2. 在 `commission` 模块中补齐对应 entity、repository 与 module 注册，使后续 `EX-14B` 可直接在正式模型上实现最终结算 / 规则解释 query / command。
  3. 回写 `data-model-prerequisites.md`、`table-structure-freeze-design.md` 与 `schema-ddl-design.md`，把此前遗漏的 `departureExceptionDecisionId` 对象链和 `EX-14` 两张 project-scoped snapshot 正式冻结成 authoritative input。
- 本次明确不做:
  1. 不新增或修改 public route、controller、DTO / OpenAPI、generated client。
  2. 不在本片扩展 `CommissionPayoutStage` 为 `retention`，避免把当前变更面提前扩大到 `EX-14B` 的命令 / query 实现。
  3. 不要求写表结构与页面视图一一同形；`allowedActions` 与其余页面裁剪型 `Summary` 字段仍允许保留在读侧聚合。
- 下游可依赖的交付边界:
  1. `stage=retention` 所需的 `departureExceptionDecisionId` 不再是悬空设计引用，而是回到正式对象链。
  2. `CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` 所需的稳定事实源有正式 project-scoped current snapshot 承接。
  3. `EX-14B` 可以在不新增 route governance 猜测的前提下，直接消费 `EX-14A` 的模型与 `EX-14G1` 的 route baseline 进入 `G1 / G2`。
- 不允许下游依赖的留白:
  1. 不接受只落两张 snapshot、继续缺失 `CommissionDepartureExceptionDecision` 的半完成状态。
  2. 不接受只写 migration、不补 entity / repository 注册。
  3. 不接受把 `CommissionRuleExplanationSnapshot` 做成脱离 `CommissionFinalSettlementSnapshot` 的独立“页面缓存表”。

---

## 2. 正式输入

| Input Type                | Document / Source                                                   | Section / Anchor     | Status   | Notes                                                                                                       |
| ------------------------- | ------------------------------------------------------------------- | -------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| Business design           | `docs/design/phase2-commission-retention-final-settlement.md`       | `3` ~ `12`           | Review   | 固定最终结算 / 质保金收口问题、离职特例、异常阻断与统一依据链                                               |
| Business design           | `docs/design/phase2-commission-rule-explanation-language.md`        | `4` ~ `12`           | Review   | 固定阶段表达、gate 结论、阻断原因分类与依据引用表达                                                         |
| Command design            | `docs/design/interface-command-design.md`                           | `220` ~ `229`        | Active   | `stage=retention` 明确要求到账状态、重大争议与离职 / 特例结论走正式守卫                                     |
| DTO / OpenAPI design      | `docs/design/interface-openapi-dto-design.md`                       | `281` ~ `291`        | Active   | `submitCommissionPayoutApproval(stage=retention)` 已显式要求 `departureExceptionDecisionId`                 |
| Route inventory / ADR-015 | `docs/design/ex-14g1-ex14-route-governance-baseline.md`             | `全文`               | Active   | `EX-14A` 不触达 public route，但必须继承已冻结的 `EX-14G1` 边界                                             |
| Query boundary            | `docs/design/query-view-boundary-design.md`                         | `150` ~ `156`, `307` | Active   | 冻结 `CommissionFinalSettlementView` / `CommissionRuleExplanationView` 的读侧字段与“Summary 可读侧聚合”规则 |
| Data model / table freeze | `docs/design/data-model-prerequisites.md`                           | `7.8`, `8.2`         | Active   | 本片回写 `CommissionDepartureExceptionDecision` 与 `EX-14` snapshot 对象链                                  |
| Data model / table freeze | `docs/design/table-structure-freeze-design.md`                      | `7.8`                | Active   | 本片回写三张逻辑表及其最小字段组                                                                            |
| Schema / DDL              | `docs/design/schema-ddl-design.md`                                  | `8.10.4`, `8.11`     | Active   | 本片回写三张表的外键、当前有效约束与一致性强约束                                                            |
| ADR                       | `docs/adr/014-design-execution-state-model-and-governance-gates.md` | `gates`              | Accepted | 新切片进入 `G1` 必须先冻结实施基线                                                                          |

---

## 3. 本次 SSOT

| Concern                     | SSOT                                                                                                               | Implementation Rule                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Business semantics          | `EX-14` 只承接 `EX-13` 已冻结的 `L4 -> L5` 稳定依据链，不重复发明新的经营事实来源                                  | `CommissionFinalSettlementSnapshot` 只能消费既有 `gate review + summary anchor + L4 input package`                                               |
| Public route canonical path | `EX-14G1`                                                                                                          | 本片不触达 route / controller，route inventory 状态保持 `planned`                                                                                |
| Route / command naming      | `submitCommissionPayoutApproval(stage=retention)` 已冻结 `departureExceptionDecisionId`                            | 必须补齐 `CommissionDepartureExceptionDecision`，不能用备注文本替代正式对象                                                                      |
| DTO / contract naming       | `query-view-boundary` 与 `interface-openapi-dto-design`                                                            | 本片只冻结 persistence 命名，不提前改 public contract                                                                                            |
| Table / column naming       | `CommissionDepartureExceptionDecision`、`CommissionFinalSettlementSnapshot`、`CommissionRuleExplanationSnapshot`   | 表名分别固定为 `commission_departure_exception_decision`、`commission_final_settlement_snapshot`、`commission_rule_explanation_snapshot`         |
| Date / time semantics       | `handledAt` / `generatedAt` 代表结论处理或快照生成时点                                                             | 使用 `timestamptz`；不退回 `date`                                                                                                                |
| Identifier semantics        | `departureExceptionDecisionId`、`gateReviewRecordId`、`summarySnapshotId`、`freezeVersionId` 都必须是系统内正式 FK | `EX-14B` 只能消费这些正式引用，不得回挂页面临时对象或备注                                                                                        |
| Money / decimal semantics   | `taxImpactPendingAmount`、相关保留金额类字段继续统一使用 `decimal(18,2)`；本片不新增新的金额精度语义               | 最终结算收口链继续沿用 `EX-13` / `L4` 金额口径                                                                                                   |
| Status machine              | 三张新表统一保留 `version + is_current + status + supersedes_id` current 版本链                                    | 不接受覆盖式更新当前收口状态或解释结果                                                                                                           |
| Summary semantics           | 页面裁剪型 `Summary` 可读侧聚合，但稳定场景级结论摘要允许落到结果快照                                              | `CommissionFinalSettlementSnapshot` / `CommissionRuleExplanationSnapshot` 只落对后续审批、通知、打印、导出具有稳定意义的结论摘要，不追求 UI 同形 |

---

## 4. 命令与接口边界

| Route / Controller | Command / Service                                                       | Request DTO / Contract                                     | Response DTO / Contract                | Guard / Permission                                                      | Design Source                                                    | Result |
| ------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| N/A                | `submitCommissionPayoutApproval` at `stage=retention` (future `EX-14B`) | `departureExceptionDecisionId`、`retentionReceiptRecordId` | `retentionSettlementStatus` 等后续输出 | 本片只补正式模型；命令守卫与控制器留给 `EX-14B`，但不再允许悬空对象引用 | `interface-command-design.md`、`interface-openapi-dto-design.md` | N/A    |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/ex-14g1-ex14-route-governance-baseline.md`
- Canonical route(s): `GET /projects/{projectId}/commission-final-settlement`、`GET /projects/{projectId}/commission-rule-explanation`
- Current implemented route(s): `Not touched by EX-14A`
- Inventory status: `planned`
- Route governance source: `EX-14G1`
- Blocker / exception: `N/A`，本片不触达 public route surface

---

## 5. 读侧边界

| Query / View                    | Consumer          | Fields                                                                                                                       | Filter / Sort | Permission Boundary                                                 | Design Source                   | Result |
| ------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------- | ------------------------------- | ------ |
| `CommissionFinalSettlementView` | `L5-T03` consumer | 直接消费三类稳定事实：结算状态、统一经营依据包、到账 / 离职特例正式引用；其余展示摘要允许在 `EX-14B` 聚合                    | N/A           | 本片不实现 query，只保证 project-scoped current snapshot 有正式落点 | `query-view-boundary-design.md` | N/A    |
| `CommissionRuleExplanationView` | `L5-T04` consumer | 直接消费当前阶段状态、gate 决策码、阻断原因分类 / 编码与下一步动作摘要；共同依据包可回到 `CommissionFinalSettlementSnapshot` | N/A           | 本片不实现 query，只保证统一解释结果有正式落点                      | `query-view-boundary-design.md` | N/A    |

---

## 6. 持久化边界

| Table                                     | Migration                                                                                                                                            | Entity / Repository                                             | DDL / Freeze Source                                                                       | Check Result |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------ |
| `commission_departure_exception_decision` | `Migration20260418193000_ex14a_settlement_and_rule_explanation_model.ts`                                                                             | `CommissionDepartureExceptionDecision` / `CommissionRepository` | `data-model-prerequisites.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md` | Pass         |
| `commission_final_settlement_snapshot`    | `Migration20260418193000_ex14a_settlement_and_rule_explanation_model.ts` + `Migration20260418194500_ex14a_nullable_reference_fk_rules.ts`            | `CommissionFinalSettlementSnapshot` / `CommissionRepository`    | 同上                                                                                      | Pass         |
| `commission_rule_explanation_snapshot`    | `Migration20260418193000_ex14a_settlement_and_rule_explanation_model.ts` + `Migration20260418195000_ex14a_rule_explanation_parent_fk_delete_rule.ts` | `CommissionRuleExplanationSnapshot` / `CommissionRepository`    | 同上                                                                                      | Pass         |

| Field                          | Design Type / Meaning                       | Migration / DDL                                               | Entity                              | Shared Contract / OpenAPI                     | Result |
| ------------------------------ | ------------------------------------------- | ------------------------------------------------------------- | ----------------------------------- | --------------------------------------------- | ------ |
| `departureExceptionDecisionId` | `stage=retention` 的正式离职 / 特例结论引用 | FK -> `commission_departure_exception_decision.id`            | `CommissionFinalSettlementSnapshot` | 后续 `EX-14B` 命令请求将直接消费              | Pass   |
| `retentionReceiptRecordId`     | 质保金到账事实引用                          | FK -> `receipt_record.id` + nullable `on delete set null`     | `CommissionFinalSettlementSnapshot` | 后续 `EX-14B` 命令请求将直接消费              | Pass   |
| `summarySnapshotId`            | 场景摘要快照稳定锚点                        | FK -> `approval_summary_snapshot.id`                          | 决策表 + 最终结算快照               | 后续 query / command 继续消费                 | Pass   |
| `finalSettlementSnapshotId`    | 规则解释结果所绑定的最终结算收口事实        | FK -> `commission_final_settlement_snapshot.id`               | `CommissionRuleExplanationSnapshot` | 仅 persistence SSOT，本片不改 public contract | Pass   |
| `blockingReasonCode`           | 统一规则解释页的稳定阻断原因码              | `varchar(64)`                                                 | `CommissionRuleExplanationSnapshot` | 后续 `EX-14B` query 映射中文解释              | Pass   |
| `version / isCurrent / status` | 三张表统一 current 版本链                   | `version int` + partial unique current + `status varchar(32)` | 三张新表                            | `N/A`                                         | Pass   |

---

## 7. 一致性结论

- Document -> code: 本片先回写 `data-model-prerequisites` / `table-structure-freeze-design` / `schema-ddl-design`，再落 migration 与 entity。
- ADR-015 inventory -> route: `EX-14A` 不触达 public route，继续沿用 `EX-14G1` 结果。
- Migration -> entity: migration、entity metadata、repository / module 注册必须同一轮完成。
- Entity -> contract: 本片不改 public contract，但 `departureExceptionDecisionId` 对应的 persistence SSOT 不能继续缺失。
- Route -> command: route 仍留给 `EX-14B`，当前不提前创造 controller / DTO drift。
- Query -> view: `CommissionRuleExplanationSnapshot` 允许通过 `finalSettlementSnapshotId` 共享共同依据包，不要求与 view 字段一一同形。
- Guard / permission: retention 守卫逻辑留给 `EX-14B`，但当前 guard 所需的 receipt / departure decision / gate review 引用必须先落正式对象链。
- OpenAPI / generated client: 当前不涉及。

---

## 8. 测试与校验

| Check                            | Required    | Command / Evidence                                                                            | Result  | Gap / Reason                                                                               |
| -------------------------------- | ----------- | --------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| Lint                             | Yes         | `corepack pnpm nx lint poms-api`                                                              | Pass    | `poms-api` lint 全绿                                                                       |
| Build                            | Yes         | `corepack pnpm nx build poms-api`                                                             | Pass    | 新实体 / repository / migration 编译通过                                                   |
| Unit tests                       | Conditional | `N/A`                                                                                         | `N/A`   | 本片只改 entity / repository / migration，无新增独立 service 行为分支                      |
| API / integration tests          | No          | `N/A`                                                                                         | `N/A`   | 本片不新增 controller / command                                                            |
| E2E                              | No          | `N/A`                                                                                         | `N/A`   | 本片不新增 public route                                                                    |
| OpenAPI generation / client diff | No          | `N/A`                                                                                         | `N/A`   | 本片不改 public contract                                                                   |
| Migration / schema check         | Yes         | `corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check` | Pass    | 初次 `migration-check` 暴露 nullable FK delete rule drift，已通过 follow-up migration 收口 |
| Diff / whitespace check          | Yes         | `git diff --check`                                                                            | Pass    | 仅有 worktree 既有 CRLF warning，无 whitespace error                                       |
| Copilot blocking gate            | Yes         | `copilot-skill-plan.cmd --model claude-sonnet-4.6 --context-mode repo-read`                   | Blocked | Copilot CLI 连续两次在 180s 超时，未返回可用二次意见；本片按本地正式输入继续               |

---

## 9. 例外与风险

| Exception ID | Level  | Scope                                                        | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                                                 |
| ------------ | ------ | ------------------------------------------------------------ | ----------- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `EX-14A-E1`  | Medium | Copilot blocking gate 工具超时，未能在 `G1` 获得二次校验输出 | Codex       | Codex         | 2026-04-18  | 已执行强制门禁，但工具连续超时；本片仍以本地 authoritative docs + baseline 推进，且所有本地校验已通过 |

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. 必须把 `CommissionDepartureExceptionDecision` 与两张 `EX-14` snapshot 一次性补齐。
  2. `CommissionRuleExplanationSnapshot` 必须通过 `finalSettlementSnapshotId` 锚到当前收口链，不接受独立“页面缓存”模型。
  3. 本片 close-out 前必须完成 `poms-api` lint / build、migration 校验、tracker 回写与基线状态更新。

## 11. Close-out

- Status: `Done`
- Closed At: `2026-04-18`
- Evidence:
  1. 已新增 `CommissionDepartureExceptionDecision`、`CommissionFinalSettlementSnapshot` 与 `CommissionRuleExplanationSnapshot` 三个正式 entity，并完成 `CommissionRepository` / `CommissionModule` 注册。
  2. 已新增 `Migration20260418193000_ex14a_settlement_and_rule_explanation_model.ts`，并补 `Migration20260418194500_ex14a_nullable_reference_fk_rules.ts` 与 `Migration20260418195000_ex14a_rule_explanation_parent_fk_delete_rule.ts` 收口 FK delete rule drift。
  3. 已回写 `data-model-prerequisites.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md` 与本基线包，补齐 `departureExceptionDecisionId` 的上游对象链缺口。
  4. 已通过 `corepack pnpm nx lint poms-api`、`corepack pnpm nx build poms-api`、`corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check` 与 `git diff --check`。
