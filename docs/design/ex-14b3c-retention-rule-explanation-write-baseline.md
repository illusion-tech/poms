# EX-14B3C Retention Payout / Rule Explanation Write-side 实施基线包

- Gate Status: `Pass`
- Parent: `EX-14B`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-19`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-14B3C`

---

## 1. 范围

- 本次目标:
  1. 解除 `stage=retention` 在 `create / submitApproval / approve / registerPayout` 现有链路上的 runtime safe blocking，并把该阶段收口为正式可执行命令链。
  2. 让 retention write-side 直接消费正式 `ReceiptRecord` 与 current `CommissionDepartureExceptionDecision` 输入链，回写 current `CommissionFinalSettlementSnapshot`。
  3. 为 `final / retention` 收口链补齐 current `CommissionRuleExplanationSnapshot` 写侧，使 `EX-14B1` query 不再只依赖预置数据或手工种子。
- 本次明确不做:
  1. 不新增任何 public route；继续沿用既有 canonical payout item-action / project-subcollection route。
  2. 不在本片实现 `suspendCommissionPayout`、`reverseCommissionPayout`、`executeCommissionAdjustment` 的 retention 异常链。
  3. 不新增 migration；完全消费 `EX-14A` 已存在的 snapshot / decision / receipt 模型。
  4. 不在本片补齐前端页面、Playwright 或 poms-admin 写侧对齐；前端仍留给后续独立切片 / `EX-14C` 收尾。
- 下游可依赖的交付边界:
  1. `stage=retention` 的 create / submit / approve / register 将不再退回“未启用”阻断，而会消费正式 receipt / departure decision / dispute / gate 输入链。
  2. current `CommissionFinalSettlementSnapshot` 将开始正式表达 `waiting-retention / ready-retention / settled-retention` 与 `pending-retention-settlement / settled-all`。
  3. current `CommissionRuleExplanationSnapshot` 将随 final / retention / departure-exception 写侧变化而 supersede，`EX-14B1` query 可直接读取运行期事实链。
- 不允许下游依赖的留白:
  1. 不接受把 retention 放行继续建立在备注文本、页面布尔勾选或临时拼装 receipt / departure 信息之上。
  2. 不接受在 `CommissionRuleExplanationView` 中重新根据 `allowedActions` 或前端文案推断阻断原因。
  3. 不接受把“质保期届满”伪装成已模型化事实；当前仓库没有正式 warranty-expiry fact，本片只记录例外，不虚构校验来源。

---

## 2. 正式输入

| Input Type                | Document / Source                                                            | Section / Anchor                | Status   | Notes                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Business design           | `docs/design/phase2-commission-retention-final-settlement.md`                | `4`, `5`, `6`, `7`, `8`, `9`    | Review   | 冻结 retention gate、离职特例与最终收口语义                                                   |
| Rule explanation design   | `docs/design/phase2-commission-rule-explanation-language.md`                 | `6`, `7`, `8`, `11.3`           | Review   | 冻结 blocked / ready / settled 的中文解释与下一步动作摘要                                      |
| Command design            | `docs/design/interface-command-design.md`                                    | `220` ~ `230`                  | Active   | retention submit/register 与统一依据链必须正式收口                                            |
| DTO / OpenAPI design      | `docs/design/interface-openapi-dto-design.md`                                | `281` ~ `290`                  | Active   | `submitCommissionPayoutApproval` / `registerCommissionPayout` 的 retention 输入语义已冻结      |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                               | `187` ~ `190`                  | Active   | payout create / submit / approve / register route 已为 aligned canonical surface              |
| Query boundary            | `docs/design/query-view-boundary-design.md`                                  | `150`, `151`, `155`, `156`     | Active   | final settlement / rule explanation query 只能消费同一条 current snapshot evidence chain       |
| Data model / table freeze | `docs/design/data-model-prerequisites.md`                                    | `315`, `316`, `325`, `327`, `359` | Active | `CommissionDepartureExceptionDecision`、`CommissionFinalSettlementSnapshot`、`CommissionRuleExplanationSnapshot` 已是正式模型 |
| Schema / DDL              | `docs/design/schema-ddl-design.md`                                           | `799`, `800`, `802`            | Active   | retention receipt 必须指向已确认 receipt；final snapshot / rule explanation 都走 current version chain |
| Persistence baseline      | `docs/design/ex-14a-final-settlement-and-rule-explanation-model-baseline.md` | `1`, `2`, `4`, `6`, `9`, `10`  | Active   | persistence 已具备 receipt / departure / final snapshot / rule explanation 三条正式引用链     |
| Previous slice baseline   | `docs/design/ex-14b2-final-settlement-write-side-baseline.md`                | `1`, `2`, `4`, `6`, `9`, `10`  | Active   | final 非质保写侧已收口；本片要在其 current snapshot 基础上继续推进 retention 与 explanation    |
| Previous slice baseline   | `docs/design/ex-14b3b-departure-exception-command-baseline.md`               | `1`, `2`, `5`, `6`, `9`, `10`  | Active   | current `CommissionDepartureExceptionDecision` 已成为正式 public 输入链                         |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                | `全文`                         | Accepted | 本片不能新增 route grammar 变体；只允许在既有 canonical payout routes 上补命令语义             |

---

## 3. 本次 SSOT

| Concern                     | SSOT                                                                                 | Implementation Rule                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Business semantics          | `phase2-commission-retention-final-settlement` + `phase2-commission-rule-explanation-language` | retention 必须区分待结算 / 可结算 / 已结清；解释页只做稳定原因码中文映射，不得重算业务语义                                              |
| Public route canonical path | `ADR-015` + authoritative inventory                                                  | 不新增 route；继续沿用 `POST /projects/{projectId}/commission-payouts` 与 `POST /commission-payouts/{id}:submitApproval/:approve/:registerPayout` |
| Route / command naming      | existing payout command names                                                        | 本片只补 retention stage 语义与 snapshot write-side，不改命令命名                                                                        |
| DTO / contract naming       | `SubmitCommissionPayoutApprovalRequest` / `RegisterCommissionPayoutRequest`         | request 可增补 retention 锚点与 summary assertion 字段，但不能回退为页面私有 DTO                                                        |
| Table / column naming       | `EX-14A` entity / DDL freeze                                                         | 只消费既有 `retention_receipt_record_id`、`departure_exception_decision_id`、`final_settlement_snapshot_id` 等列，不新增 schema         |
| Identifier semantics        | `ReceiptRecord.id`、current `CommissionDepartureExceptionDecision.id`、`ApprovalSummarySnapshot.id` | retention command 必须直接引用正式 FK；不得用 remark / free text 代替                                                                    |
| Date / time semantics       | `ReceiptRecord.confirmedAt`、`paidAt` / command registration time、snapshot `generatedAt` | `retentionReceiptRecordId` 只接受已确认 receipt；“质保期届满”当前没有正式 fact，不得伪造 datetime 校验                                  |
| Money / decimal semantics   | payout `approvedAmount` / `paidRecordAmount` 与 snapshot `taxImpactPendingAmount`   | 沿用 `decimal(18,2)` 字符串序列化；retention payout 不能突破当前剩余可发金额                                                             |
| Status machine              | `CommissionFinalSettlementSnapshot` + `CommissionRuleExplanationSnapshot`            | 本片固定 `retentionSettlementStatus = waiting-retention / ready-retention / settled-retention`；`finalSettlementStatus = pending-retention-settlement / settled-all`；解释快照固定 `blocked-retention / ready-retention / settled-retention / pending-final-settlement` |

---

## 4. 命令与接口边界

| Route / Controller                                    | Command / Service                                               | Request DTO / Contract                          | Response DTO / Contract     | Guard / Permission          | Design Source                                  | Result                                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- | --------------------------- | --------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `POST /projects/{projectId}/commission-payouts`       | `createCommissionPayout` at `stage=retention`                   | `CreateCommissionPayoutRequest`                 | `CommissionPayoutSummary`   | `commission:payouts:manage` | `EX-14B3A` + `phase2-retention-final-settlement` | 允许创建 retention 草稿，但必须建立在 current final-settlement snapshot 已进入 retention 收口阶段之上          |
| `POST /commission-payouts/{id}:submitApproval`        | `submitCommissionPayoutApproval` at `stage=retention`           | `SubmitCommissionPayoutApprovalRequest`         | existing payout summary     | `commission:payouts:manage` | `interface-command-design.md` + DTO design      | 强制校验 confirmed receipt、current departure decision、current final gate / summary assertion，再进入审批     |
| `POST /commission-payouts/{id}:approve`               | `approveCommissionPayout` / approval resolution at `retention`  | `ApproveCommissionPayoutRequest`                | existing payout summary     | `commission:payouts:manage` | `EX-14B3C` baseline + prior payout route freeze | 审批通过时 supersede current final-settlement snapshot，并刷新 current rule explanation snapshot                |
| `POST /commission-payouts/{id}:registerPayout`        | `registerCommissionPayout` at `stage=retention`                 | `RegisterCommissionPayoutRequest`               | existing payout summary     | `commission:payouts:manage` | `interface-command-design.md` + DTO design      | 登记成功时把 retention 收口到 `settled-retention / settled-all`，并同步 supersede current explanation snapshot |
| existing final payout write routes                    | `approveCommissionPayout` / `registerCommissionPayout` at `final` | existing request DTOs                           | existing payout summary     | existing permission         | `EX-14B2` + current slice                       | 补写 current `CommissionRuleExplanationSnapshot`，避免 final snapshot 已切换但 explanation 仍缺失              |
| `POST /projects/{projectId}/commission-departure-exception-decisions` | `createCommissionDepartureExceptionDecision` downstream sync | existing request DTO                            | existing decision summary   | `commission:payouts:manage` | `EX-14B3B` + current slice                      | 若项目已存在 current final-settlement snapshot，则同步 supersede current final / explanation snapshot 的 departure summary 部分 |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  1. `POST /projects/{projectId}/commission-payouts`
  2. `POST /commission-payouts/{id}:submitApproval`
  3. `POST /commission-payouts/{id}:approve`
  4. `POST /commission-payouts/{id}:registerPayout`
- Current implemented route(s): same as canonical
- Inventory status: `aligned`
- Route governance source: `docs/adr/015-api-route-canonical-grammar.md`
- Blocker / exception:
  1. 本片不新增任何 route surface；若后续要把 retention suspend / reverse / execute-adjustment 一并开放，必须另起子片。

---

## 5. 读侧边界

| Query / View                    | Consumer            | Fields                                                                                                                                                    | Filter / Sort          | Permission Boundary         | Design Source                         | Result                                                                                   |
| ------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `CommissionFinalSettlementView` | `EX-14B1` consumer  | `finalSettlementStatus`、`nonRetentionSettlementStatus`、`retentionSettlementStatus`、`retentionRequirementSummary`、`retentionReceiptSummary`、`departureExceptionSummary` 与共同依据包 | project current only   | `commission:payouts:manage` | `query-view-boundary-design.md`       | current final-settlement snapshot 必须随 final / retention / departure-exception 写侧持续 supersede |
| `CommissionRuleExplanationView` | `EX-14B1` consumer  | `currentStageStatus`、`gateDecisionCode`、`blockingReasonCategory`、`blockingReasonCode`、`blockingReasonSummary`、`gateDecisionSummary`、`nextActionSummary` 与共同依据包             | project current only   | `commission:payouts:manage` | `query-view-boundary-design.md` + explanation language | current rule explanation snapshot 不再依赖预置种子；必须直接来自运行期写链               |

补充规则:

1. `CommissionRuleExplanationView` 的共同依据包仍从关联 `CommissionFinalSettlementSnapshot` 读取，不单独复制另一套经营依据字段。
2. retention readiness / blocked reason 只能来自正式 receipt / departure decision / dispute / gate review 输入链，不得在 query 侧临时推断。

---

## 6. 持久化边界

| Table                                  | Migration | Entity / Repository                    | DDL / Freeze Source | Check Result                                               |
| -------------------------------------- | --------- | -------------------------------------- | ------------------- | ---------------------------------------------------------- |
| `commission_payout`                    | `N/A`     | `CommissionPayout`                     | existing            | 继续消费既有表；本片仅开放 `stage=retention` 生命周期      |
| `commission_final_settlement_snapshot` | `N/A`     | `CommissionFinalSettlementSnapshot`    | `EX-14A`            | 作为 current project settlement chain，被 final / retention / departure 写侧持续 supersede |
| `commission_rule_explanation_snapshot` | `N/A`     | `CommissionRuleExplanationSnapshot`    | `EX-14A`            | 作为 current explanation chain，被 final / retention / departure 写侧持续 supersede        |
| `commission_departure_exception_decision` | `N/A`   | `CommissionDepartureExceptionDecision` | `EX-14A` + `EX-14B3B` | 作为 retention special-case 正式输入链                     |
| `receipt_record`                       | `N/A`     | `ReceiptRecord`                        | existing            | retention receipt 只能引用 `status=confirmed` 记录         |
| `commission_freeze_dispute_record`     | `N/A`     | `CommissionFreezeDisputeRecord`        | existing            | open dispute 会继续阻断 retention                          |

| Field / Concern                                        | Design Type / Meaning                          | Migration / DDL | Entity / Contract                        | Result                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------- | --------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `retentionReceiptRecordId`                             | confirmed retention receipt FK                 | Existing        | submit request + final snapshot          | 仅允许引用同项目、`status=confirmed` 的 `ReceiptRecord`                                  |
| `departureExceptionDecisionId`                         | current departure / exception decision FK      | Existing        | submit request + final snapshot          | 仅允许引用同项目 current active decision；存在 `confirmationRequirementSummary` 时不得放行 |
| `summarySnapshotId`                                    | stable summary snapshot assertion              | Existing        | submit/register request + final snapshot | retention submit/register 必须与 current settlement evidence chain 对齐                  |
| `gateReviewRecordId`                                   | current final gate review FK                   | Existing        | submit request + final snapshot          | retention submit 只能引用当前有效 final gate review                                      |
| `finalSettlementStatus / retentionSettlementStatus`    | settlement state machine                       | Existing        | final snapshot                           | 本片新增 `ready-retention`、`settled-retention` 与 `settled-all` 的运行期写入            |
| `currentStageStatus / blockingReason* / nextAction*`   | rule explanation stable reason chain           | Existing        | rule explanation snapshot                | 由服务端基于正式输入链固化，query 只读映射                                               |
| `retentionRequirementSummary / retentionReceiptSummary / departureExceptionSummary` | settlement explanation summary fields | Existing        | final snapshot                           | 由 current receipt / departure / dispute / gate 事实链派生，不接受页面自由文本           |

---

## 7. 一致性结论

- Document -> code: retention 命令守卫、current final-settlement snapshot、current rule explanation snapshot 与 query consumer 必须同轮收口。
- ADR-015 inventory -> route: 本片不改变 canonical route，只在既有 aligned route 上补 stage=retention 语义与 DTO contract。
- Migration -> entity: 无 schema 变更；所有 retention / rule explanation 写链仅消费 `EX-14A` 既有列与唯一约束。
- Entity -> contract: `ReceiptRecord`、current `CommissionDepartureExceptionDecision` 与 current `CommissionFinalSettlementSnapshot` 必须作为正式 FK / version chain 进入 request validation 与 query output。
- Route -> command: retention submit/register 不得再只返回“未启用”；要么正式进入链路，要么给出基于正式 reason code 的阻断。
- Query -> view: `CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` 继续共享同一条 current settlement evidence chain。
- Guard / permission: 权限保持 `commission:payouts:manage`；retention guard 在现有 payout permission 下收紧，不新增 permission key。
- OpenAPI / generated client: request schema 若增补 retention anchor 字段，必须同轮进入 OpenAPI 与 generated client；不得让 runtime 先收紧再留旧 client 漂移。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                | Result  | Gap / Reason                                                                 |
| -------------------------------- | -------- | ------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                  | Pending | 本片会触达 `approval` / `commission` backend service / controller / DTO     |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                 | Pending | backend compile                                                              |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`      | Pending | 需覆盖 retention create / submit / approve / register 与 rule explanation write chain |
| API / integration tests          | No       | `N/A`                                             | `N/A`   | 本片先用 service / controller 单测收口                                      |
| E2E                              | No       | `N/A`                                             | `N/A`   | FE / browser 验证留给 `EX-14C`；当前工作树已有独立前端 WIP                  |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` + `corepack pnpm nx run shared-api-client:check` | Pending | request contract 可能变化，必须同步生成物                                   |
| Migration / schema check         | No       | `N/A`                                             | `N/A`   | 本片不改 schema                                                              |
| Diff / whitespace check          | Yes      | `git diff --check`                                | Pending | close-out 必跑                                                               |

---

## 9. 例外与风险

| Exception ID   | Level | Scope                                                        | Approved By                | Cleanup Owner | Cleanup Due        | Notes                                                                                                  |
| -------------- | ----- | ------------------------------------------------------------ | -------------------------- | ------------- | ------------------ | ------------------------------------------------------------------------------------------------------ |
| `EX-14B3C-E1`  | `E2`  | retention guard 暂无法机读校验“质保期届满”正式事实           | `Solo worktree checkpoint` | `Codex`       | `EX-14C close-out` | 当前仓库无 warranty-expiry / retention due fact；本片只能先收口已模型化的 receipt / dispute / decision / gate 链 |

风险提示:

1. 若 retention payout 只校验到账 / 争议 / 特例，但遗漏 `summarySnapshotId` / `gateReviewRecordId` 断言，会把 `EX-14B2` 固定的 evidence chain 再次打散。
2. 若 final snapshot 已 supersede 而 current rule explanation snapshot 未同步 supersede，`EX-14B1` query 会重新回到种子依赖或 stale state。
3. 由于当前没有正式“质保期届满”事实源，本片只能在 `retentionRequirementSummary` / explanation 中保留该条件为未消解风险，不能宣称已完全自动判定。

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-19`
- Conditions:
  1. 不新增 route surface；只在既有 aligned payout routes 上补 retention command / DTO / snapshot 语义。
  2. 必须同轮补 current `CommissionRuleExplanationSnapshot` 写侧，不能只放开 retention payout 而继续依赖种子 explanation。
  3. “质保期届满”当前缺少正式 fact source，必须作为显式例外记录，不能在 runtime 或文档中假装已被模型化。
