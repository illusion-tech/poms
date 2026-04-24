# EX-14B3A Retention Stage Contract Foundation 实施基线包

- Gate Status: `Pass`
- Parent: `EX-14B`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-14B3A`

---

## 1. 范围

- 本次目标:
  1. 正式把 `retention` 纳入 `CommissionPayoutStage` 的 shared contract / entity / OpenAPI / generated client 枚举链，关闭 `EX-14B3` 当前最上游的 contract 缺口。
  2. 在 backend command 面显式阻断 `stage=retention` 的 draft create / submit / approve / register，避免在 retention 金额口径、到账事实、离职 / 特例结论与 rule explanation 写侧未冻结前把错误状态写入正式链路。
  3. 对齐最小 admin consumer 读侧显示能力：已存在或种子数据里的 retention payout 至少能够稳定显示中文标签，但创建入口继续保持隐藏。
- 本次明确不做:
  1. 不新增 `CommissionDepartureExceptionDecision` 的 public route / command surface。
  2. 不在本片实现 `submitCommissionPayoutApproval(stage=retention)` 所需 `retentionReceiptRecordId`、`departureExceptionDecisionId` 守卫。
  3. 不在本片实现 `CommissionRuleExplanationSnapshot` 写侧闭环。
  4. 不为 retention 发放草稿定义正式 cap-rate / 金额口径；创建行为在本片必须显式拒绝，而不是猜测比例。
- 下游可依赖的交付边界:
  1. `retention` 已成为正式 public contract enum 成员，后续 `EX-14B3B / EX-14B3C` 不必再重复补 shared contract / generated client 基础链。
  2. runtime 已显式拒绝 retention payout lifecycle，避免出现 `PAYOUT_CAP_RATES` 漏项、`NaN` 金额或半成品审批链。
  3. 前端读侧对 retention 阶段不会再因为 enum / label 缺失而崩溃。
- 不允许下游依赖的留白:
  1. 不接受把 `retention` 仅加到 enum，却继续允许 `createPayout` 生成错误理论上限金额。
  2. 不接受新增 `CommissionDepartureExceptionDecision` route 但未先回写 authoritative inventory。
  3. 不接受 admin 页面把 retention 直接暴露为可创建选项，因为当前后端仍应显式阻断该链路。

---

## 2. 正式输入

| Input Type                | Document / Source                                                            | Section / Anchor               | Status   | Notes                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| Business design           | `docs/design/phase2-commission-retention-final-settlement.md`                | `4`, `5`, `6`, `9`, `10`       | Review   | 明确 `final` 与 `retention` 是两个独立阶段，retention 依赖到账、争议收口与特例结论                             |
| Rule explanation design   | `docs/design/phase2-commission-rule-explanation-language.md`                 | `全文`                         | Review   | 当前统一解释链仍需后续写侧闭环，本片只做 contract foundation                                                   |
| Command design            | `docs/design/interface-command-design.md`                                    | `220`, `222`, `229`            | Active   | `stage=retention` 的 submit / register 已冻结为正式命令输入，但实现前提未齐                                    |
| DTO / OpenAPI design      | `docs/design/interface-openapi-dto-design.md`                                | `281`, `282`, `283`, `290`     | Active   | `submitCommissionPayoutApproval(stage=retention)` 与 `registerCommissionPayout(stage=retention)` 已有 DTO 口径 |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                               | `186` ~ `190`                  | Active   | 本片不新增 route；继续复用既有 payout canonical route                                                          |
| Route governance baseline | `docs/design/ex-14g1-ex14-route-governance-baseline.md`                      | `全文`                         | Active   | 仅冻结了 final settlement / rule explanation query route；未冻结 CDED command route                            |
| Governance sweep          | `docs/design/ex-15h-in-flight-route-governance-sweep.md`                     | `全文`                         | Active   | `EX-14` 现有 route governance 缺口已清点，本片确认不得擅自引入新 route                                         |
| Data model / table freeze | `docs/design/data-model-prerequisites.md`                                    | `325`, `327`, `358`, `359`     | Active   | `retentionReceiptRecordId` 应回到正式 `ReceiptRecord`，`departureExceptionDecisionId` 必须回到正式对象链       |
| Schema / DDL              | `docs/design/schema-ddl-design.md`                                           | `8.10.4`, `8.11`               | Active   | `CommissionFinalSettlementSnapshot` 已为 retention receipt / departure decision 预留 FK 语义                   |
| Persistence baseline      | `docs/design/ex-14a-final-settlement-and-rule-explanation-model-baseline.md` | `41`, `44`, `72`, `104`, `105` | Active   | persistence 已具备 `CommissionDepartureExceptionDecision` / `ReceiptRecord` 正式引用位                         |
| Previous slice baseline   | `docs/design/ex-14b2-final-settlement-write-side-baseline.md`                | `1`, `2`, `7`, `9`, `10`       | Active   | `EX-14B2` 明确把 retention、CDED 命令面与 rule explanation 写侧后置到本轮                                      |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                | `全文`                         | Accepted | 任何新增 public route 都必须先进入 authoritative inventory                                                     |

---

## 3. 本次 SSOT

| Concern                     | SSOT                                                                  | Implementation Rule                                                                                    |         |            |                                                                         |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------- | ---------- | ----------------------------------------------------------------------- |
| Business semantics          | `phase2-commission-retention-final-settlement`                        | `retention` 与 `final` 继续分离；本片不猜测 retention 金额口径                                         |         |            |                                                                         |
| Public route canonical path | `ADR-015` + authoritative inventory                                   | 无新 route delta；`CommissionDepartureExceptionDecision` command surface 不得在本片落地                |         |            |                                                                         |
| DTO / contract naming       | `CommissionPayoutStage = first \                                      | second \                                                                                               | final \ | retention` | enum 链必须同步到 shared contract / entity / OpenAPI / generated client |
| Runtime guard semantics     | backend command services                                              | 当 `stage=retention` 时统一抛出显式阻断错误，直到到账 / 特例 / rule explanation 写侧补齐               |         |            |                                                                         |
| Admin read-side semantics   | existing `project-commission` consumer                                | 允许显示 retention 标签；不暴露创建入口                                                                |         |            |                                                                         |
| Money / decimal semantics   | `CreateCommissionPayoutRequest.theoreticalCapAmount` existing formula | retention 创建被拒绝；本片不生成任何 retention 理论上限金额                                            |         |            |                                                                         |
| Status machine              | payout lifecycle                                                      | retention payout 不进入 `draft -> pending-approval -> approved -> paid` 正式迁移，直到 `EX-14B3C` 完成 |         |            |                                                                         |

---

## 4. 命令与接口边界

| Route / Controller                              | Command / Service                | Request DTO / Contract                           | Response DTO / Contract                 | Guard / Permission          | Design Source                              | Result                                                                                         |
| ----------------------------------------------- | -------------------------------- | ------------------------------------------------ | --------------------------------------- | --------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `POST /projects/{projectId}/commission-payouts` | `createCommissionPayout`         | existing `CreateCommissionPayoutRequest`         | existing `CommissionPayoutSummary`      | `commission:payouts:manage` | `EX-15E3` + `interface-openapi-dto-design` | contract 层接受 `retention` enum，但 runtime 对 `stage=retention` 显式拒绝                     |
| `POST /commission-payouts/{id}:submitApproval`  | `submitCommissionPayoutApproval` | existing `SubmitCommissionPayoutApprovalRequest` | existing payout approval result surface | `commission:payouts:manage` | `interface-command-design.md` `229`        | retention submit 在 approval / direct service 两侧都必须显式阻断                               |
| `POST /approval-records/{id}:approve`           | payout approval resolution       | existing approval DTO                            | existing `CommandResult`                | 审批链既有权限              | 既有 approval flow                         | 若目标 payout 为 retention，则只允许 reject / close existing todo；不允许 approve 进入正式写链 |
| `POST /commission-payouts/{id}:registerPayout`  | `registerCommissionPayout`       | existing `RegisterCommissionPayoutRequest`       | existing payout summary                 | `commission:payouts:manage` | `interface-command-design.md` `222`        | retention register 在 runtime 显式阻断，避免伪造到账 / 结清事实                                |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): unchanged
- Current implemented route(s): unchanged
- Inventory status: `aligned`
- Route governance source: `docs/adr/015-api-route-canonical-grammar.md`
- Blocker / exception:
  1. `CommissionDepartureExceptionDecision` 当前没有任何 authoritative inventory 行，也没有已冻结 canonical route；因此其 public command surface 必须后置到 `EX-14B3B`。

---

## 5. 读侧边界

| Query / View                    | Consumer               | Fields             | Filter / Sort          | Permission Boundary         | Design Source           | Result                                                      |
| ------------------------------- | ---------------------- | ------------------ | ---------------------- | --------------------------- | ----------------------- | ----------------------------------------------------------- |
| `CommissionPayoutSummary`       | admin payout list      | `stageType` label  | project by `projectId` | `commission:payouts:manage` | existing admin consumer | retention item 至少能稳定显示中文阶段名                     |
| `CreateCommissionPayoutRequest` | admin create payout UI | `stageType` option | `N/A`                  | `commission:payouts:manage` | `project-commission.ts` | retention 不加入创建选项，直到写侧 guard 与金额口径冻结完成 |

补充规则:

1. 本片不新增 retention 专项页面与表单字段。
2. 若已有测试或种子数据读取到 retention payout，前端必须能稳定显示而不是出现空 label。

---

## 6. 持久化边界

| Table                                     | Migration | Entity / Repository                    | DDL / Freeze Source | Check Result                             |
| ----------------------------------------- | --------- | -------------------------------------- | ------------------- | ---------------------------------------- |
| `commission_payout`                       | `N/A`     | `CommissionPayout`                     | existing            | 仅扩展 enum 语义，不新增列               |
| `commission_final_settlement_snapshot`    | `N/A`     | `CommissionFinalSettlementSnapshot`    | `EX-14A`            | 本片不写 retention snapshot              |
| `commission_departure_exception_decision` | `N/A`     | `CommissionDepartureExceptionDecision` | `EX-14A`            | persistence 已存在，但本片不开放命令入口 |

| Field / Concern       | Design Type / Meaning                     | Migration / DDL | Entity / Contract                    | Result                                                        |
| --------------------- | ----------------------------------------- | --------------- | ------------------------------------ | ------------------------------------------------------------- |
| `stageType=retention` | retention payout stage canonical identity | Existing        | `CommissionPayout` + shared contract | 正式进入 enum 链                                              |
| cap calculation       | theoretical cap amount formula            | Existing        | `CommissionService`                  | retention 在本片必须短路拒绝，禁止落入现有 `PAYOUT_CAP_RATES` |
| approval lifecycle    | draft / pending / approved / paid         | Existing        | approval + commission services       | retention lifecycle 在本片必须统一阻断                        |

---

## 7. 一致性结论

- Document -> code: 本片只交付 retention contract foundation，不把 CDED 命令面与 rule explanation 写侧混进来。
- ADR-015 inventory -> route: 无 route 变更；任何 CDED route 实现都必须由后续切片先补 route baseline。
- Entity -> contract: `CommissionPayoutStage` 从三态升级为四态，shared contract / entity / OpenAPI / generated client 必须同步一致。
- Contract -> runtime: contract 虽包含 `retention`，但 runtime 在正式输入链未齐前必须显式拒绝。
- Runtime -> admin consumer: 管理端读侧能识别 retention，创建入口继续维持保守隐藏。
- OpenAPI / generated client: 本片必须补跑并验证，因为 public enum 已变化。

---

## 8. 测试与校验

| Check                        | Required | Command / Evidence                                | Result  | Gap / Reason                                      |
| ---------------------------- | -------- | ------------------------------------------------- | ------- | ------------------------------------------------- |
| Lint                         | Yes      | `corepack pnpm nx lint poms-api`                  | Pending | backend runtime guard 变更                        |
| Build                        | Yes      | `corepack pnpm nx build poms-api`                 | Pending | backend runtime guard 变更                        |
| Unit tests                   | Yes      | `corepack pnpm nx test poms-api --runInBand`      | Pending | 至少覆盖 retention create / submit / approve 阻断 |
| OpenAPI generation           | Yes      | `corepack pnpm nx run poms-api:openapi`           | Pending | shared enum 改动                                  |
| Generated client             | Yes      | `corepack pnpm nx run shared-api-client:generate` | Pending | shared enum 改动                                  |
| Generated client consistency | Yes      | `corepack pnpm nx run shared-api-client:check`    | Pending | public client 必须同步                            |
| Admin lint                   | Yes      | `corepack pnpm nx lint poms-admin`                | Pending | admin label / option 变更                         |
| Admin build                  | Yes      | `corepack pnpm nx build poms-admin`               | Pending | admin consumer 编译需验证                         |
| E2E                          | No       | `N/A`                                             | `N/A`   | 本片不暴露 retention 创建入口，也不新增 route     |
| Migration / schema check     | No       | `N/A`                                             | `N/A`   | 本片不改 schema                                   |
| Diff / whitespace check      | Yes      | `git diff --check`                                | Pending | close-out 必跑                                    |

---

## 9. 例外与风险

| Exception ID  | Level | Scope                                                        | Approved By                | Cleanup Owner | Cleanup Due          | Notes                                                                             |
| ------------- | ----- | ------------------------------------------------------------ | -------------------------- | ------------- | -------------------- | --------------------------------------------------------------------------------- |
| `EX-14B3A-E1` | `E1`  | contract 已暴露 `retention`，但 runtime 继续显式拒绝该命令链 | `Solo worktree checkpoint` | `Codex`       | `EX-14B3C close-out` | 这是为避免错误金额口径与缺失守卫落库的保守阻断，不允许被误解为 retention 已可执行 |

风险提示:

1. 若后续 `EX-14B3B` 直接实现 `CommissionDepartureExceptionDecision` route，却不先回写 inventory / baseline，会再次引入 route governance drift。
2. 若任何 consumer 在本片后自行暴露 retention 创建入口，backend 会返回显式错误；该行为应视为 consumer drift，而不是 backend bug。
3. `CommissionRuleExplanationSnapshot` current 写侧仍未完成，因此 retention 的统一中文解释仍不得宣称已上线。

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. `EX-14B3` 必须拆成至少 `EX-14B3A`（contract foundation）、`EX-14B3B`（离职 / 特例 command / route governance）与 `EX-14B3C`（retention + rule explanation 写侧）。
  2. `EX-14B3A` 只能做 enum / OpenAPI / client / admin label 对齐与 runtime safe blocking。
  3. 任何 `CommissionDepartureExceptionDecision` public route 实现都必须在后续切片先补 authoritative inventory 与 route baseline。
