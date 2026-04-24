# EX-14B2 Final Settlement Write-side 实施基线包

- Gate Status: `Pass`
- Parent: `EX-14B`
- Owner: `Codex`
- Slice Type: `api / command`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-14B2`

---

## 1. 范围

- 本次目标:
  1. 在不新增 public route surface 的前提下，收紧现有 `POST /commission-payouts/{id}:submitApproval` 与 `POST /commission-payouts/{id}:registerPayout` 对 `stage=final` 的写侧守卫。
  2. 将 `stage=final` 的 payout 审批 / 登记链从 phase-1 最小逻辑提升为消费正式 `L4 -> L5` 输入链的实现：至少校验当前冻结版本、current final gate binding / gate review 结果，并在关键状态推进后回写 current `CommissionFinalSettlementSnapshot`。
  3. 固定 current final-settlement snapshot 的最小 version-chain 写入规则，保证 `EX-14B1` 已交付的最终结算 query 不再只能依赖预置数据。
- 本次明确不做:
  1. 不在本片补 `stage=retention` 的正式命令输入、离职 / 特例守卫或 retention draft 创建边界。
  2. 不修改 canonical route，也不新增 `CommissionStageGateView`、`CommissionDepartureExceptionDecision` 等新的 public API。
  3. 不在本片实现 `CommissionRuleExplanationSnapshot` 写侧闭环；规则解释写侧留给 `EX-14B3`。
  4. 不在本片补前端页面表单、E2E 或 retention 专项页面交互。
- 下游可依赖的交付边界:
  1. final-stage payout 进入审批 / 完成登记时，后端会消费当前正式冻结 / gate 链，而不是继续裸跑 phase-1 简化状态迁移。
  2. `CommissionFinalSettlementSnapshot` 将从纯读侧对象变为由 final-stage 写侧驱动的 current version-chain，`EX-14B1` query 可直接读取真实运行期生成的 current snapshot。
  3. `EX-14B3` 可以在本片固定的 final snapshot version-chain 基础上继续补 retention / rule explanation 写侧。
- 不允许下游依赖的留白:
  1. 不接受把 `retention` 硬塞进当前 `createPayout` cap 逻辑、却不说明 retention 比例与离职特例输入来源的半实现状态。
  2. 不接受 final-stage 继续只校验 payout 自身状态，不校验 current frozen assignment / final gate binding / gate review 的退化实现。
  3. 不接受 current final-settlement snapshot 直接原地覆盖，必须保留 `isCurrent + supersedesId` version chain。

---

## 2. 正式输入

| Input Type                | Document / Source                                                             | Section / Anchor                  | Status   | Notes                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- | --------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Business design           | `docs/design/phase2-commission-retention-final-settlement.md`                 | `4`, `5`, `6`, `9`, `10`          | Review   | 本片只消费“最终结算（非质保部分）与质保金待结算分离表达”的最小边界                                                           |
| Business design           | `docs/design/phase2-business-accounting-feedback-rules.md`                    | `307`                             | Review   | `final` 与 `retention` 是两个独立 downstream stage；本片只处理 `final`                                                       |
| Command design            | `docs/design/interface-command-design.md`                                     | `220`, `222`, `228`, `229`        | Active   | `stage=final` 的 payout 命令必须消费正式 gate / 经营依据链；`retention` 后置到 `EX-14B3`                                     |
| DTO / OpenAPI design      | `docs/design/interface-openapi-dto-design.md`                                 | `281`, `283`, `290`, `291`        | Active   | 本片显式记录：public DTO tightening 先不推进，避免在 retention 与 admin consumer 未收口前混做                                |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                | `255`, `256`                      | Active   | 本片不新增 route，只复用既有 payout command route 与已实现 query route                                                       |
| Route governance baseline | `docs/design/ex-14g1-ex14-route-governance-baseline.md`                       | `全文`                            | Active   | 无新 route，inventory 不需新增行                                                                                             |
| Query boundary            | `docs/design/query-view-boundary-design.md`                                   | `148`, `150`, `155`               | Active   | `CommissionPayoutDetailView` 与 `CommissionFinalSettlementView` 必须共享同一依据链                                           |
| Data model / table freeze | `docs/design/data-model-prerequisites.md`                                     | `323`, `325`, `326`, `358`, `359` | Active   | 当前 `CommissionFinalSettlementSnapshot` 已是正式对象；`retention` 所需对象链单独后置                                        |
| Schema / DDL              | `docs/design/schema-ddl-design.md`                                            | `799` ~ `803`                     | Active   | current `commission_final_settlement_snapshot` 必须绑定 current gate review、retention receipt / departure decision 语义独立 |
| Persistence baseline      | `docs/design/ex-14a-final-settlement-and-rule-explanation-model-baseline.md`  | `40` ~ `44`, `72`, `104`          | Active   | `CommissionDepartureExceptionDecision` 已正式建模，但本片不消费其命令面                                                      |
| Query baseline            | `docs/design/ex-14b1-final-settlement-and-rule-explanation-query-baseline.md` | `全文`                            | Active   | 本片必须产出能被 `EX-14B1` query 直接消费的 current snapshot                                                                 |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                 | `全文`                            | Accepted | 无 route grammar 变化                                                                                                        |

---

## 3. 本次 SSOT

| Concern                     | SSOT                                                                                                             | Implementation Rule                                                                                         |                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------- |
| Business semantics          | `phase2-commission-retention-final-settlement` + `phase2-business-accounting-feedback-rules`                     | 本片只实现“最终结算（非质保部分）”进入审批 / 登记后的正式事实收口，不把 `retention` 与 `final` 压成同一阶段 |                 |
| Public route canonical path | `ADR-015` + authoritative inventory                                                                              | 不新增或重命名 public route；仍使用既有 `commission-payouts/{id}:submitApproval                             | registerPayout` |
| Route / command naming      | `submitCommissionPayoutApproval` / `registerCommissionPayout`                                                    | route 与 command 名称保持不变；本片只收紧 `stage=final` 行为                                                |                 |
| DTO / contract naming       | 现有 `SubmitCommissionPayoutApprovalRequest` / `RegisterCommissionPayoutRequest`                                 | 本片不改 public request shape；explicit DTO tightening 留给 `EX-14B3`                                       |                 |
| Table / column naming       | `commission_final_settlement_snapshot`                                                                           | 只使用已存在列，不新增 migration                                                                            |                 |
| Date / time semantics       | `handledAt` / `approvedAt` / `generatedAt` 均为 `datetime`                                                       | snapshot `generatedAt` 与 payout 处理时间保持 `iso datetime` 语义                                           |                 |
| Identifier semantics        | `projectId`、`freezeVersionId`、`gateReviewRecordId`、`summarySnapshotId` 为系统内 UUID                          | final snapshot 只能引用同一项目、同一 current 冻结 / gate 链                                                |                 |
| Money / decimal semantics   | `taxImpactPendingAmount`、`theoreticalCapAmount`、`approvedAmount`、`paidRecordAmount` 延续 decimal string       | 本片不重写 payout 金额口径，只回写 settlement status 与正式依据链                                           |                 |
| Status machine              | final snapshot 必须显式区分 `finalSettlementStatus`、`nonRetentionSettlementStatus`、`retentionSettlementStatus` | 本片保守固定 `retentionSettlementStatus = waiting-retention`，直到 `EX-14B3` 补齐 retention 正式命令链      |                 |

---

## 4. 命令与接口边界

| Route / Controller                             | Command / Service                | Request DTO / Contract                           | Response DTO / Contract                 | Guard / Permission          | Design Source                              | Result                                                                                                          |
| ---------------------------------------------- | -------------------------------- | ------------------------------------------------ | --------------------------------------- | --------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `POST /commission-payouts/{id}:submitApproval` | `submitCommissionPayoutApproval` | existing `SubmitCommissionPayoutApprovalRequest` | existing payout approval result surface | `commission:payouts:manage` | `interface-command-design.md` `220`, `229` | 本片只收紧 `stage=final`；要求 current frozen assignment + active final gate binding + latest final gate review |
| `POST /approval-records/{id}:approve`          | payout approval resolution       | existing approval DTO                            | existing `CommandResult`                | 审批链既有权限              | 既有 approval flow + `EX-14B2` baseline    | 当目标 payout 属于 `stage=final` 且审批通过时，必须生成 / 替代 current final-settlement snapshot                |
| `POST /commission-payouts/{id}:registerPayout` | `registerCommissionPayout`       | existing `RegisterCommissionPayoutRequest`       | existing payout summary                 | `commission:payouts:manage` | `interface-command-design.md` `222`, `228` | 当目标 payout 属于 `stage=final` 且登记完成时，必须推进 non-retention settlement 状态并替代 current snapshot    |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `POST /commission-payouts/{id}:submitApproval`、`POST /commission-payouts/{id}:registerPayout`
- Current implemented route(s): unchanged
- Inventory status: `aligned`
- Route governance source: `docs/adr/015-api-route-canonical-grammar.md`
- Blocker / exception:
  1. `Submit / Register CommissionPayout` 的 explicit request/response DTO tightening 属于后续 `EX-14B3`，本片不把 retention / admin consumer / generated client 一并拉进来。

---

## 5. 读侧边界

| Query / View                    | Consumer                 | Fields                                                                                                                          | Filter / Sort          | Permission Boundary         | Design Source                                | Result                                             |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `CommissionFinalSettlementView` | `EX-14B1` query consumer | `finalSettlementStatus`、`nonRetentionSettlementStatus`、`retentionSettlementStatus`、`retentionRequirementSummary`、共同依据包 | current by `projectId` | `commission:payouts:manage` | `query-view-boundary-design.md` `150`, `155` | 本片必须产出可被 query 直接消费的 current snapshot |

补充规则:

1. 本片不写 `CommissionRuleExplanationSnapshot`；若 current rule explanation 与新 final snapshot 之间暂时不同步，视为 `EX-14B3` 范围，不在本片伪造中文解释结果。
2. `retentionSettlementStatus` 在本片保守固定为 `waiting-retention`；不允许在没有 retention receipt / departure exception 正式命令链时猜测“可结算”。

---

## 6. 持久化边界

| Table                                  | Migration | Entity / Repository                      | DDL / Freeze Source               | Check Result                                      |
| -------------------------------------- | --------- | ---------------------------------------- | --------------------------------- | ------------------------------------------------- |
| `commission_final_settlement_snapshot` | `N/A`     | `CommissionFinalSettlementSnapshot`      | `EX-14A` + `schema-ddl-design.md` | Write existing table                              |
| `commission_role_assignment`           | `N/A`     | `CommissionRoleAssignment`               | 既有 freeze chain                 | Read current frozen version                       |
| `operating_signal_gate_binding`        | `N/A`     | `OperatingSignalToCommissionGateBinding` | `EX-13B`                          | Read current active final binding                 |
| `commission_gate_review_record`        | `N/A`     | `CommissionGateReviewRecord`             | `EX-13B1`                         | Read latest gate review for current final binding |

| Field                                      | Design Type / Meaning              | Migration / DDL | Entity                              | Shared Contract / OpenAPI              | Result                                                      |
| ------------------------------------------ | ---------------------------------- | --------------- | ----------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `freezeVersionId`                          | current frozen assignment FK       | Existing        | `CommissionFinalSettlementSnapshot` | consumed by `EX-14B1` query            | must match same-project current frozen assignment           |
| `gateReviewRecordId`                       | current final gate review FK       | Existing        | `CommissionFinalSettlementSnapshot` | consumed by `EX-14B1` query indirectly | must come from current active `gateStageType=final` binding |
| `summarySnapshotId`                        | shared approval summary anchor     | Existing        | `CommissionFinalSettlementSnapshot` | consumed by `EX-14B1` query            | must copy from gate review record                           |
| `baselineSelectionSource` ~ `exportPolicy` | shared evidence package            | Existing        | `CommissionFinalSettlementSnapshot` | consumed by `EX-14B1` query            | must copy from current final gate binding / review chain    |
| `retentionSettlementStatus`                | retention stage placeholder status | Existing        | `CommissionFinalSettlementSnapshot` | consumed by `EX-14B1` query            | this slice only allows conservative `waiting-retention`     |
| `supersedesId` / `isCurrent` / `version`   | current snapshot version chain     | Existing        | `CommissionFinalSettlementSnapshot` | read by `EX-14B1` query                | new write must supersede, not overwrite                     |

---

## 7. 一致性结论

- Document -> code: `EX-14B2` 只消费 final-stage 最小可执行边界；retention 与 rule explanation 写侧显式留给 `EX-14B3`。
- ADR-015 inventory -> route: 无新 route；继续沿用 canonical payout action routes。
- Migration -> entity: 本片不新增 migration；完全消费 `EX-14A` / `EX-13B1` 既有模型。
- Entity -> contract: `CommissionFinalSettlementSnapshot` 的 current version-chain 将成为 `EX-14B1` query 的正式运行期来源。
- Route -> command: `submitApproval` / `registerPayout` 对 `stage=final` 不再只是 phase-1 状态推进，而是要校验 current frozen / gate 链。
- Query -> view: 本片只保证 `CommissionFinalSettlementView` 的 current snapshot 来源稳定；`CommissionRuleExplanationView` 写侧仍未完成。
- Guard / permission: `commission:payouts:manage` 保持不变；新增 guard 只收紧 final-stage 业务前提，不放宽任何既有权限。
- OpenAPI / generated client: 本片默认不改 public contract；若实现中被迫改动，则必须在 G3 补跑 OpenAPI / client evidence 并回写本基线。

---

## 8. 测试与校验

| Check                            | Required    | Command / Evidence                                                          | Result  | Gap / Reason                                                                   |
| -------------------------------- | ----------- | --------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| Lint                             | Yes         | `corepack pnpm nx lint poms-api`                                            | Pending | backend command slice 必跑                                                     |
| Build                            | Yes         | `corepack pnpm nx build poms-api`                                           | Pending | backend command slice 必跑                                                     |
| Unit tests                       | Yes         | `corepack pnpm nx test poms-api --runInBand`                                | Pending | 至少覆盖 approval / commission service 的 final-stage guard 与 snapshot 版本链 |
| API / integration tests          | No          | `N/A`                                                                       | `N/A`   | 本片先不补 HTTP E2E                                                            |
| E2E                              | No          | `N/A`                                                                       | `N/A`   | 留给 `EX-14C` 与后续 retention slice 统一评估                                  |
| OpenAPI generation / client diff | Conditional | only if public contract changes                                             | Pending | 默认不改 public DTO；若触发变更则转为 required                                 |
| Migration / schema check         | No          | `N/A`                                                                       | `N/A`   | 本片不改 persistence schema                                                    |
| Diff / whitespace check          | Yes         | `git diff --check`                                                          | Pending | close-out 必跑                                                                 |
| Copilot blocking gate            | Yes         | `copilot-skill-plan.cmd --model claude-sonnet-4.6 --context-mode repo-read` | Pass    | 已提示 `retention` enum/DTO/snapshot 触发边界必须先冻结                        |

---

## 9. 例外与风险

| Exception ID | Level | Scope                                                        | Approved By                | Cleanup Owner | Cleanup Due         | Notes                                                                                                                                        |
| ------------ | ----- | ------------------------------------------------------------ | -------------------------- | ------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX-14B2-E1` | `E1`  | `Submit / Register CommissionPayout` public DTO 不在本片收紧 | `Solo worktree checkpoint` | `Codex`       | `EX-14B3 close-out` | 当前前端 consumer 仍依赖 phase-1 request shape；本片先用服务端 current chain 收紧 `stage=final`，避免在 retention / admin 仍未冻结时跨层混做 |

风险提示:

1. 若不存在 current frozen assignment、current active `gateStageType=final` binding 或 latest gate review，本片必须显式阻断 `stage=final` 提交审批，不得退回旧 phase-1 最小逻辑。
2. 本片保守不写 `CommissionRuleExplanationSnapshot`；因此 `EX-14B1` 的规则解释 query 在真实写侧切换后仍可能读取旧 snapshot 或缺失 current snapshot，该事实需保留到 `EX-14B3`，不能静默伪造。
3. `retentionSettlementStatus` 在本片只能输出保守占位状态；若实现中发现没有 retention 事实也被误标记为 `waiting-retention`，该差异需在 `EX-14B3` 通过 retention 正式命令链修正。

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. 先按 tracker 把 `EX-14B` 明确拆成 `EX-14B2` / `EX-14B3`，再开始编码。
  2. `EX-14B2` 只允许触达 final-stage 命令守卫与 `CommissionFinalSettlementSnapshot` current version-chain。
  3. 若 public DTO / generated client 被迫变更，必须把本片 slice type 升级为 `cross-layer-high-risk` 并补跑对应验证。
