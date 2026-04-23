# EX-14B1 Final Settlement / Rule Explanation Query 实施基线包

- Gate Status: `Pass`
- Parent: `EX-14B`
- Owner: `Codex`
- Slice Type: `query-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-14B1`

---

## 1. 范围

- 本次目标:
  1. 沿 `EX-14G1` 已冻结的 canonical route，落地 `GET /projects/{projectId}/commission-final-settlement` 与 `GET /projects/{projectId}/commission-rule-explanation` 两条 project-scoped query。
  2. 在 `@poms/shared-contracts`、`commission.controller.ts` 与 `commission.service.ts` 中冻结 `CommissionFinalSettlementView`、`CommissionRuleExplanationView` 的正式 contract / OpenAPI / generated client 输出。
  3. 将 `EX-14A` 三张正式模型表接成稳定读链：`CommissionRuleExplanationSnapshot -> CommissionFinalSettlementSnapshot -> CommissionRoleAssignment`，避免规则解释页回退为页面私有拼装。
- 本次明确不做:
  1. 不实现最终结算、质保金结算、离职 / 特例处理等写侧 command。
  2. 不扩展 `CommissionStageGateView` future surface，不猜测额外 route。
  3. 不补前端页面 wiring、按钮交互或 E2E 页面流程。
- 下游可依赖的交付边界:
  1. 统一解释页与最终结算页可以通过稳定 public route 读取当前 project-scoped current snapshot。
  2. `summarySnapshotId`、`baselineSelectionSource`、`taxImpactSummary` 等共同依据包输出来源固定为 `CommissionFinalSettlementSnapshot`，不允许在 `CommissionRuleExplanationView` 自行重算。
  3. `EX-14B` 后续写侧切片可直接复用本片冻结的 query contract / controller surface / OpenAPI。
- 不允许下游依赖的留白:
  1. 不接受只落 route、不补 shared contract / OpenAPI / client 的半完成状态。
  2. 不接受 `CommissionRuleExplanationView` 只读 `CommissionRuleExplanationSnapshot` 单表并遗漏共同依据包。
  3. 不接受无 current snapshot 时伪造空 view 或默认“可结算”状态。

---

## 2. 正式输入

| Input Type                | Document / Source                                                            | Section / Anchor | Status   | Notes                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------- |
| Business design           | `docs/design/phase2-commission-retention-final-settlement.md`                | `4`, `6`, `9`    | Review   | 冻结最终结算 / 质保金结算状态、依据包与摘要链一致性规则                                           |
| Business design           | `docs/design/phase2-commission-rule-explanation-language.md`                 | `6` ~ `11`       | Review   | 冻结阻断原因分类、gate 结论、下一步动作与中文表达边界                                             |
| DTO / OpenAPI design      | `docs/design/interface-openapi-dto-design.md`                                | `291`            | Active   | `CommissionFinalSettlementView` / `CommissionRuleExplanationView` 与同轮查询共享同一摘要快照口径  |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                               | `255` ~ `256`    | Active   | 两条 canonical route 已登记为 `planned`，本片负责转成 implemented                                 |
| Route inventory / ADR-015 | `docs/design/ex-14g1-ex14-route-governance-baseline.md`                      | `全文`           | Active   | `EX-14B1` 必须严格沿既有 canonical route 落地                                                     |
| Query boundary            | `docs/design/query-view-boundary-design.md`                                  | `150` ~ `157`    | Active   | 冻结两个 view 的字段组、共同依据包与 `allowedActions`                                             |
| Data model / table freeze | `docs/design/data-model-prerequisites.md`                                    | `8.2`            | Active   | `CommissionFinalSettlementSnapshot` 与 `CommissionRuleExplanationSnapshot` 已形成正式对象链       |
| Schema / DDL              | `docs/design/schema-ddl-design.md`                                           | `8.10.4`, `8.11` | Active   | `CommissionRuleExplanationSnapshot.finalSettlementSnapshotId` 与 `summarySnapshotId` 已有正式约束 |
| Persistence baseline      | `docs/design/ex-14a-final-settlement-and-rule-explanation-model-baseline.md` | `全文`           | Active   | 本片只读 `EX-14A` 已冻结模型，不新增 migration                                                    |
| Authorization baseline    | `docs/design/business-authorization-matrix.md`                               | `5`, `12`        | Review   | 当前权限字典不新增 key，本片沿用既有 `commission:payouts:manage`                                  |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                | `全文`           | Accepted | project-scoped stable noun subresource                                                            |

---

## 3. 本次 SSOT

| Concern                     | SSOT                                                                                            | Implementation Rule                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Business semantics          | `phase2-commission-retention-final-settlement` + `phase2-commission-rule-explanation-language`  | 不改写结算状态、阻断原因与动作语义，只做 stable snapshot 映射                                                               |
| Public route canonical path | `api-route-canonical-inventory.md` + `EX-14G1`                                                  | 只能使用 `GET /projects/{projectId}/commission-final-settlement` 与 `GET /projects/{projectId}/commission-rule-explanation` |
| Route / command naming      | `getCommissionFinalSettlement`、`getCommissionRuleExplanation`                                  | controller / client method 命名与 canonical inventory 保持一致                                                              |
| DTO / contract naming       | `query-view-boundary-design.md` + `interface-openapi-dto-design.md`                             | `CommissionFinalSettlementView`、`CommissionRuleExplanationView` 必须作为正式 shared contract / OpenAPI schema              |
| Table / column naming       | `EX-14A` + `schema-ddl-design.md`                                                               | 本片只读 `commission_final_settlement_snapshot`、`commission_rule_explanation_snapshot`，不新增表或列                       |
| Date / time semantics       | `generatedAt` 为当前输出快照生成时点                                                            | 输出 `iso datetime`；不降格为 `date`                                                                                        |
| Identifier semantics        | `projectId`、`summarySnapshotId`、`freezeVersionId` 均为系统内 UUID                             | `CommissionRuleExplanationView.summarySnapshotId` 必须来自关联 `CommissionFinalSettlementSnapshot`                          |
| Money / decimal semantics   | `taxImpactPendingAmount` 延续 `decimal(18,2)`                                                   | shared contract 输出 number，不改金额精度口径                                                                               |
| Status machine              | `finalSettlementStatus`、`nonRetentionSettlementStatus`、`retentionSettlementStatus` 为独立状态 | 不允许压平成单一“已完成”状态                                                                                                |
| Permission boundary         | 既有 permission catalog                                                                         | 本片不新增权限 key，查询 route 先沿用 `commission:payouts:manage`                                                           |

---

## 4. 命令与接口边界

| Route / Controller                                      | Command / Service                                | Request DTO / Contract | Response DTO / Contract         | Guard / Permission          | Design Source                                 | Result |
| ------------------------------------------------------- | ------------------------------------------------ | ---------------------- | ------------------------------- | --------------------------- | --------------------------------------------- | ------ |
| `GET /projects/{projectId}/commission-final-settlement` | `CommissionService.getCommissionFinalSettlement` | path: `projectId`      | `CommissionFinalSettlementView` | `commission:payouts:manage` | `EX-14G1` + `query-view-boundary` + `ADR-015` | Pass   |
| `GET /projects/{projectId}/commission-rule-explanation` | `CommissionService.getCommissionRuleExplanation` | path: `projectId`      | `CommissionRuleExplanationView` | `commission:payouts:manage` | `EX-14G1` + `query-view-boundary` + `ADR-015` | Pass   |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{projectId}/commission-final-settlement`、`GET /projects/{projectId}/commission-rule-explanation`
- Current implemented route(s): `GET /projects/{projectId}/commission-final-settlement`、`GET /projects/{projectId}/commission-rule-explanation`
- Inventory status: `aligned`
- Route governance source: `docs/design/ex-14g1-ex14-route-governance-baseline.md`
- Blocker / exception: `N/A`

---

## 5. 读侧边界

| Query / View                    | Consumer          | Fields                                                                                                                                                                                                                                                                         | Filter / Sort        | Permission Boundary         | Design Source                   | Result |
| ------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | --------------------------- | ------------------------------- | ------ |
| `CommissionFinalSettlementView` | `L5-T03` consumer | `finalSettlementStatus`、`nonRetentionSettlementStatus`、`retentionSettlementStatus`、`retentionRequirementSummary`、`retentionReceiptSummary`、`departureExceptionSummary`、`freezeVersionSummary`、共同依据包(`baselineSelectionSource` ~ `exportPolicy`)与 `allowedActions` | project current only | `commission:payouts:manage` | `query-view-boundary-design.md` | Pass   |
| `CommissionRuleExplanationView` | `L5-T04` consumer | `currentStageStatus`、`blockingReasonCategory`、`blockingReasonCode`、`blockingReasonSummary`、`gateDecisionCode`、`gateDecisionSummary`、`nextActionSummary`、`freezeVersionSummary`、共同依据包(`baselineSelectionSource` ~ `exportPolicy`)与 `allowedActions`               | project current only | `commission:payouts:manage` | `query-view-boundary-design.md` | Pass   |

补充规则:

1. `CommissionRuleExplanationView` 必须读取 current `CommissionRuleExplanationSnapshot`，再验证其 `finalSettlementSnapshotId` 指向的 `CommissionFinalSettlementSnapshot` 仍是 current。
2. `freezeVersionSummary` 不来自持久化列，必须由 `CommissionRoleAssignment` 聚合输出。
3. 本片对两个 view 的 `allowedActions` 先返回保守集合；后续写侧切片才允许扩展。

---

## 6. 持久化边界

| Table                                  | Migration | Entity / Repository                                          | DDL / Freeze Source               | Check Result |
| -------------------------------------- | --------- | ------------------------------------------------------------ | --------------------------------- | ------------ |
| `commission_final_settlement_snapshot` | `N/A`     | `CommissionFinalSettlementSnapshot` / `CommissionRepository` | `EX-14A` + `schema-ddl-design.md` | Read-only    |
| `commission_rule_explanation_snapshot` | `N/A`     | `CommissionRuleExplanationSnapshot` / `CommissionRepository` | `EX-14A` + `schema-ddl-design.md` | Read-only    |
| `commission_role_assignment`           | `N/A`     | `CommissionRoleAssignment` / `CommissionRepository`          | 既有 commission freeze chain      | Read-only    |

| Field                       | Design Type / Meaning    | Migration / DDL | Entity                              | Shared Contract / OpenAPI                      | Result |
| --------------------------- | ------------------------ | --------------- | ----------------------------------- | ---------------------------------------------- | ------ |
| `summarySnapshotId`         | 统一摘要快照稳定锚点     | Existing        | `CommissionFinalSettlementSnapshot` | 两个 query view 都必须共享同一输出             | Pass   |
| `freezeVersionId`           | 当前冻结版本引用         | Existing        | `CommissionFinalSettlementSnapshot` | 映射成 `freezeVersionSummary`                  | Pass   |
| `finalSettlementSnapshotId` | 规则解释页共同依据包桥接 | Existing        | `CommissionRuleExplanationSnapshot` | 不允许在规则解释 view 里重算共同依据包         | Pass   |
| `taxImpactPendingAmount`    | 待闭合税务影响金额       | Existing        | `CommissionFinalSettlementSnapshot` | 输出为 settlement / explanation 共同依据包字段 | Pass   |
| `currentStageStatus`        | 当前阶段状态             | Existing        | `CommissionRuleExplanationSnapshot` | 直接映射到 `CommissionRuleExplanationView`     | Pass   |
| `finalSettlementStatus`     | 项目级最终结算状态       | Existing        | `CommissionFinalSettlementSnapshot` | 直接映射到 `CommissionFinalSettlementView`     | Pass   |

---

## 7. 一致性结论

- Document -> code: 先冻结 `EX-14B1` baseline，再落 contract / controller / service / OpenAPI。
- ADR-015 inventory -> route: route 只能沿 `EX-14G1` 已冻结 canonical path 实现，不得回退到页面后缀或 item detail。
- Migration -> entity: 本片不新增 migration；完全消费 `EX-14A` 既有模型。
- Entity -> contract: `CommissionRuleExplanationView` 的共同依据包必须来自 `CommissionFinalSettlementSnapshot`，不允许对 `CommissionRuleExplanationSnapshot` 单表硬映射。
- Route -> command: 本片只有 query route，无写侧 command。
- Query -> view: `CRES -> CFSS -> CommissionRoleAssignment` 三段式读链是正式实现规则。
- Guard / permission: 当前权限字典未新增 key；查询 route 沿用 `commission:payouts:manage`。
- OpenAPI / generated client: 两个新 view schema 与 route 方法必须同轮回写 `openapi.json` 与 generated client。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                         | Result | Gap / Reason                                                        |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                                                                                                           | Pass   | `poms-api` lint 全绿                                                |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                                                                                                          | Pass   | `shared-contracts` 与 `poms-api` 构建通过                           |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`                                                                                               | Pass   | 已覆盖两个 query route 的 controller / service 主路径与缺失快照分支 |
| API / integration tests          | No       | `N/A`                                                                                                                                      | `N/A`  | 本片先不补 HTTP E2E                                                 |
| E2E                              | No       | `N/A`                                                                                                                                      | `N/A`  | 留给 `EX-14C`                                                       |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check` | Pass   | OpenAPI 与 generated client 已同步                                  |
| Migration / schema check         | No       | `N/A`                                                                                                                                      | `N/A`  | 本片不改 persistence                                                |
| Diff / whitespace check          | Yes      | `git diff --check`                                                                                                                         | Pass   | 待 close-out 保持无 whitespace error                                |
| Copilot blocking gate            | Yes      | `copilot-skill-plan.cmd --model claude-sonnet-4.6 --context-mode repo-read`                                                                | Pass   | 已返回二次意见并吸收进 baseline                                     |

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | `N/A` |

风险提示:

1. 若 current `CommissionRuleExplanationSnapshot` 指向的 `CommissionFinalSettlementSnapshot` 已不再 current，本片必须报 `NotFoundException`，而不是静默返回陈旧依据包。
2. `freezeVersionSummary` 来源于聚合映射，不得偷简化为 `freezeVersionId` 直出。
3. inventory / baseline / runtime / openapi / generated client 需要同轮回写，避免形成 route 已实现但文档仍是 `planned` 的 drift。

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. 先更新 tracker，把 `EX-14B` 切到 `Doing` 并补 `EX-14B1` 子行。
  2. service 必须按 `CRES -> CFSS -> CommissionRoleAssignment` 三段式链路装配 view。
  3. close-out 前必须完成 `poms-api` lint / build / unit test、OpenAPI / client 回写、inventory 状态更新与 `git diff --check`。

## 11. Close-out

- Status: `Done`
- Closed At: `2026-04-18`
- Evidence:
  1. 已新增 `CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` shared contract，并在 `api-contracts` 补齐 DTO。
  2. 已在 `CommissionController` 落地两条 canonical query route，并在 `CommissionService` 完成 `CommissionRuleExplanationSnapshot -> CommissionFinalSettlementSnapshot -> CommissionRoleAssignment` 三段式读链。
  3. 已回写 `api-route-canonical-inventory.md`、`phase2-development-execution-tracker.md` 与 `poms-design-progress.md`，将两条 route 从 `planned` 收口到 `aligned` 实现态。
  4. 已通过 `corepack pnpm nx test poms-api --runInBand`、`corepack pnpm nx lint poms-api`、`corepack pnpm nx build poms-api`、`corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check` 与 `git diff --check`。
