# EX-14B3B Departure Exception Command 实施基线包

- Gate Status: `Pass`
- Parent: `EX-14B`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-14B3B`

---

## 1. 范围

- 本次目标:
  1. 冻结 `CommissionDepartureExceptionDecision` 的 authoritative command / route / DTO 边界，关闭 `EX-14B3` 当前最大的上游 public-surface 缺口。
  2. 在 `commission` 模块落地 `POST /projects/{projectId}/commission-departure-exception-decisions`，把离职 / 特例结论从“只有 persistence FK”提升为正式 current-version 命令链。
  3. 固定旧结论 `supersede` 规则：同一项目只允许一个 current decision，旧 current 由服务端隐式 supersede，而不是开放第二条 replace route。
- 本次明确不做:
  1. 不在本片放开 `stage=retention` payout lifecycle；`EX-14B3A` 的 runtime safe blocking 继续保持。
  2. 不在本片实现 `CommissionRuleExplanationSnapshot` current 写侧。
  3. 不新增 `CommissionDepartureExceptionDecision` 的 detail / list query route。
  4. 不新增 migration；完全消费 `EX-14A` 已落地的数据模型。
- 下游可依赖的交付边界:
  1. `CommissionFinalSettlementSnapshot.departureExceptionDecisionId` 现在对应正式 public command 输入链，而不再只是裸 FK。
  2. route inventory、command design、DTO design、controller / service、OpenAPI 与 generated client 将共同承认同一条 canonical create route。
  3. `EX-14B3C` 可直接消费 current `CommissionDepartureExceptionDecision` 版本链，不必再补 route governance。
- 不允许下游依赖的留白:
  1. 不接受在 body 中重复提交 `projectId`、`supersedesId`、`summaryPackageKey`、`projectionLevel` 或 `exportPolicy`。
  2. 不接受把离职 / 特例结论继续伪装为 final-settlement snapshot 的备注文本或页面本地状态。
  3. 不接受新增 `POST /commission-departure-exception-decisions/{id}:replace` 之类 replace route；本片明确采用项目子集合 create + 服务端隐式 supersede。

---

## 2. 正式输入

| Input Type                | Document / Source                                                            | Section / Anchor           | Status   | Notes                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------- | -------------------------- | -------- | --------------------------------------------------------------------------------------- |
| Business design           | `docs/design/phase2-commission-retention-final-settlement.md`                | `4`, `5`, `6`, `9`, `10`   | Review   | retention 结算需要显式离职 / 特例结论链                                                 |
| Rule explanation design   | `docs/design/phase2-commission-rule-explanation-language.md`                 | `全文`                     | Review   | 结论码与摘要会进入后续统一解释链，但本片不写 rule explanation snapshot                  |
| Command design            | `docs/design/interface-command-design.md`                                    | `4.7`                      | Active   | 本片新增 `createCommissionDepartureExceptionDecision` 正式命令边界                      |
| DTO / OpenAPI design      | `docs/design/interface-openapi-dto-design.md`                                | `5.5B`                     | Active   | 本片新增 project-subcollection create DTO 边界                                          |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                               | `6.9`                      | Active   | 本片补录并落地 canonical route                                                          |
| Route governance baseline | `docs/design/ex-14g1-ex14-route-governance-baseline.md`                      | `全文`                     | Active   | `EX-14G1` 仅冻结 final settlement / rule explanation query；本片继续补 command surface  |
| Governance sweep          | `docs/design/ex-15h-in-flight-route-governance-sweep.md`                     | `全文`                     | Active   | 已明确 `EX-14B` 的下一缺口是 `CommissionDepartureExceptionDecision` authoritative route |
| Data model / table freeze | `docs/design/data-model-prerequisites.md`                                    | `325`, `358`, `359`        | Active   | `CommissionDepartureExceptionDecision` 已是正式对象链                                   |
| Schema / DDL              | `docs/design/schema-ddl-design.md`                                           | `8.10.4`, `8.11`           | Active   | 已存在 current unique、project+version unique 与 summary snapshot / freeze version FK   |
| Persistence baseline      | `docs/design/ex-14a-final-settlement-and-rule-explanation-model-baseline.md` | `41`, `72`, `104`, `105`   | Active   | persistence 已具备 `CommissionDepartureExceptionDecision` 正式模型                      |
| Previous slice baseline   | `docs/design/ex-14b3a-retention-stage-contract-baseline.md`                  | `1`, `2`, `4.1`, `9`, `10` | Active   | `EX-14B3A` 已明确本片必须先补 route governance，再进入命令面实现                        |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                | `全文`                     | Accepted | 采用 project-scoped subcollection create，而不是 singleton update / item replace        |

---

## 3. 本次 SSOT

| Concern                     | SSOT                                                                                                | Implementation Rule                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Business semantics          | `phase2-commission-retention-final-settlement`                                                      | 离职 / 特例结论是 retention settlement 前置事实，不属于前端备注或 snapshot 自由拼装字段                      |
| Public route canonical path | `ADR-015` + authoritative inventory                                                                 | 命令入口固定为 `POST /projects/{projectId}/commission-departure-exception-decisions`                         |
| Route / command naming      | `createCommissionDepartureExceptionDecision`                                                        | 使用 collection create 语义；旧 current version 由服务端隐式 supersede                                       |
| DTO / contract naming       | `CreateCommissionDepartureExceptionDecisionRequest` / `CommissionDepartureExceptionDecisionSummary` | request 不带 `projectId` / `supersedesId` / derived summary fields；response 返回稳定 current version 事实链 |
| Permission boundary         | `business-authorization-matrix` + 现有 `commission:payouts:manage`                                  | 本片沿用 payout / settlement 既有 manage 权限，不引入新的 permission key                                     |
| Identifier semantics        | `projectId` path + `freezeVersionId` body                                                           | `freezeVersionId` 必须属于同一项目、当前有效且已冻结                                                         |
| Summary snapshot semantics  | current frozen `CommissionRoleAssignment.handoverSummarySnapshotId`                                 | body `summarySnapshotId` 必须与当前冻结版本绑定的 active handover summary snapshot 一致                      |
| Version chain semantics     | `uq_cded_project_current` + `cded_project_version_unique`                                           | 同一项目只允许一个 current decision；新 create 自动 supersede 旧 current，并产生递增 `version`               |
| Derived evidence fields     | `ApprovalSummarySnapshot`                                                                           | `summaryPackageKey`、`projectionLevel`、`exportPolicy` 由服务端从 summary snapshot 固化，不接受客户端输入    |

---

## 4. 命令与接口边界

| Route / Controller                                                    | Command / Service                            | Request DTO / Contract                              | Response DTO / Contract                       | Guard / Permission          | Design Source                             | Result                                                                                                  |
| --------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------- | --------------------------------------------- | --------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `POST /projects/{projectId}/commission-departure-exception-decisions` | `createCommissionDepartureExceptionDecision` | `CreateCommissionDepartureExceptionDecisionRequest` | `CommissionDepartureExceptionDecisionSummary` | `commission:payouts:manage` | `interface-command-design.md` + `ADR-015` | 正式形成 current 离职 / 特例结论版本；旧 current 在服务端隐式 supersede，并保留 summary snapshot 引用链 |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `POST /projects/{projectId}/commission-departure-exception-decisions`
- Current implemented route(s): same as canonical
- Inventory status: `aligned`
- Route governance source: `docs/adr/015-api-route-canonical-grammar.md`
- Blocker / exception:
  1. 本片不新增 detail / list query route；若后续需要查询 surface，必须先单独补 authoritative inventory。

---

## 5. 读侧边界

| Query / View                                  | Consumer                          | Fields                                                                                           | Filter / Sort          | Permission Boundary         | Design Source                               | Result                                                                                     |
| --------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------- | --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `CommissionDepartureExceptionDecisionSummary` | retention / final-settlement 写侧 | `id`、`freezeVersionId`、`decisionCode`、`decisionSummary`、`summarySnapshotId`、derived package | current by `projectId` | `commission:payouts:manage` | `EX-14B3B` + downstream `EX-14B3C`          | 作为写侧稳定输入链返回，不在本片额外暴露 detail query                                      |
| `CommissionFinalSettlementView`               | `EX-14B1` query consumer          | `departureExceptionSummary`                                                                      | current by `projectId` | `commission:payouts:manage` | `query-view-boundary-design.md` + `EX-14B1` | 本片不直接改 query route，但为后续 retention settlement 提供正式 departure decision 引用链 |

补充规则:

1. `CommissionFinalSettlementView` / `CommissionRuleExplanationView` 在本片不直接新增字段；`EX-14B3C` 再决定如何消费 current departure decision。
2. 本片创建结果返回的是 command summary，不把其直接扩展为完整 detail query。

---

## 6. 持久化边界

| Table                                     | Migration | Entity / Repository                    | DDL / Freeze Source | Check Result                                     |
| ----------------------------------------- | --------- | -------------------------------------- | ------------------- | ------------------------------------------------ |
| `commission_departure_exception_decision` | `N/A`     | `CommissionDepartureExceptionDecision` | `EX-14A`            | 直接消费既有表、索引、唯一约束，不新增 migration |
| `commission_role_assignment`              | `N/A`     | `CommissionRoleAssignment`             | existing            | 读取 current frozen assignment                   |
| `approval_summary_snapshot`               | `N/A`     | `ApprovalSummarySnapshot`              | existing            | 读取 current active summary snapshot             |

| Field / Concern                                      | Design Type / Meaning        | Migration / DDL | Entity / Contract | Result                                                               |
| ---------------------------------------------------- | ---------------------------- | --------------- | ----------------- | -------------------------------------------------------------------- |
| `projectId`                                          | 项目归属                     | Existing        | entity + path     | 由 path 提供；request body 不重复提交                                |
| `freezeVersionId`                                    | current frozen assignment FK | Existing        | request + entity  | 必须属于同项目 current frozen version                                |
| `summarySnapshotId`                                  | handover summary snapshot FK | Existing        | request + entity  | 必须等于当前冻结版本绑定的 active summary snapshot                   |
| `summaryPackageKey / projectionLevel / exportPolicy` | derived evidence package     | Existing        | entity + response | 服务端从 summary snapshot 固化                                       |
| `version / isCurrent / supersedesId / status`        | current version chain        | Existing        | entity + response | create 自动 supersede 旧 current；新版本为 `active + isCurrent=true` |
| `handledAt / handledBy / createdBy / updatedBy`      | 审计字段                     | Existing        | entity            | 由服务端写入；response 只暴露 `handledAt`，不暴露内部 actor 字段     |

---

## 7. 一致性结论

- Document -> code: command / DTO / route / tracker / progress / inventory 必须同轮收口。
- ADR-015 inventory -> route: 本片新增的是 project-scoped collection create route，不再继续拖延为 future planned surface。
- Persistence -> service: 既有 current unique 与 version unique 现在正式接上 public command，不再只是 schema 预留。
- Service -> contract: response 必须返回稳定 current version 摘要，且 derived summary fields 由服务端写入。
- Route -> permission: 沿用 `commission:payouts:manage`，不在本片发散新的权限常量。
- Runtime -> downstream slice: `EX-14B3C` 可直接消费 current departure decision，不再重复设计 supersede 规则。

---

## 8. 测试与校验

| Check                        | Required | Command / Evidence                                | Result | Gap / Reason                                                       |
| ---------------------------- | -------- | ------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| Lint                         | Yes      | `corepack pnpm nx lint poms-api`                  | Pass   | backend controller / service 新增已验证                            |
| Build                        | Yes      | `corepack pnpm nx build poms-api`                 | Pass   | backend controller / service 新增已验证                            |
| Unit tests                   | Yes      | `corepack pnpm nx test poms-api --runInBand`      | Pass   | `33` suites / `383` tests 通过，包含新增 service / controller spec |
| OpenAPI generation           | Yes      | `corepack pnpm nx run poms-api:openapi`           | Pass   | 新 public route / DTO 已进入 OpenAPI                               |
| Generated client             | Yes      | `corepack pnpm nx run shared-api-client:generate` | Pass   | 新 public route / DTO 已进入 generated client                      |
| Generated client consistency | Yes      | `corepack pnpm nx run shared-api-client:check`    | Pass   | client 与 OpenAPI 同步                                             |
| E2E                          | No       | `N/A`                                             | `N/A`  | 本片先不新增 HTTP E2E；后续由 `EX-14C` 统一评估                    |
| Migration / schema check     | No       | `N/A`                                             | `N/A`  | 本片不改 schema                                                    |
| Diff / whitespace check      | Yes      | `git diff --check`                                | Pass   | close-out 已通过                                                   |

---

## 9. 例外与风险

| Exception ID  | Level | Scope                                           | Approved By                | Cleanup Owner | Cleanup Due        | Notes                                                                                   |
| ------------- | ----- | ----------------------------------------------- | -------------------------- | ------------- | ------------------ | --------------------------------------------------------------------------------------- |
| `EX-14B3B-E1` | `E1`  | 暂不新增 departure decision detail / list query | `Solo worktree checkpoint` | `Codex`       | `EX-14C close-out` | 先只交付 command + current-version 输入链，避免把 query scope 与 retention 写侧混片推进 |

风险提示:

1. 若 `freezeVersionId` 不再是 current frozen version，本片必须显式拒绝 create，而不是给旧版本补结论。
2. 若客户端尝试提交 `summaryPackageKey`、`projectionLevel`、`exportPolicy` 等 derived 字段，应视为 contract drift，而不是服务端兼容输入。
3. 本片不放开 retention payout；若 consumer 误以为 departure decision 已上线就能直接进入 retention 审批，仍会被 `EX-14B3A` 的 runtime blocking 阻断。

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. 先补 authoritative inventory、command design 与 DTO design，再落 controller / service / OpenAPI / generated client。
  2. 采用 `POST /projects/{projectId}/commission-departure-exception-decisions`；不开放额外 replace route。
  3. retention payout lifecycle 继续维持 `EX-14B3A` 的 runtime safe blocking，直到 `EX-14B3C` 完成。
