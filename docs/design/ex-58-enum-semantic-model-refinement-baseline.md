# EX-58 枚举语义模型重整基线

- Task ID: `EX-58`
- Slice type: `docs-only / governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-58`
- Public route surface: no new, changed or removed public route in this slice.
- Status: `G1`
- G1 Date: 2026-05-03

## 1. 背景

`EX-56` 到 `EX-57` 已经完成第一轮枚举治理：闭合业务字段不再散落裸字符串，前端改为消费 generated enum，并通过 `check:enum-like-strings` 建立回归扫描。

本次问题不再是“哪里还有字符串字面量”，而是更高一层的语义问题：

1. 是否过度为每个业务对象创建自己的状态枚举。
2. 哪些枚举其实表达同一个生命周期族。
3. 哪些选项不应继续作为代码枚举，而应成为可管理字典。
4. 哪些开放原因、备注、角色 key 不应强行 enum 化。
5. 哪些核心对象需要状态历史，而不是只存当前状态。

本片冻结后续重整原则和执行拆分，不直接修改运行时代码。

## 2. Scope

本片目标：

1. 给当前 `shared-contracts` 中的枚举和值集建立语义分类。
2. 确定保留独立业务枚举、抽象共享生命周期、转配置字典、保留开放 taxonomy 的边界。
3. 固定代码值命名规范，避免中文值、兼容映射和混合命名继续扩散。
4. 拆分后续可执行切片，避免在一个切片中同时改 contract、DB、OpenAPI、Admin 和数据迁移。

本片明确不做：

1. 不修改 `shared-contracts`、OpenAPI、generated client、migration、entity、service 或 Admin 页面。
2. 不引入 TypeScript native enum 作为领域 SSOT。
3. 不引入 PostgreSQL enum type。
4. 不做历史兼容映射。当前系统仍处开发期，后续 runtime cutover 应直接使用目标代码值。
5. 不把开放文本字段、外部 code、运营字典全部强行 enum 化。

## 3. Current Inventory

基于 2026-05-03 当前 `libs/shared/contracts/src/lib/shared-contracts.ts` 静态扫描：

| Item                                   | Count | Notes                                                                 |
| -------------------------------------- | ----: | --------------------------------------------------------------------- |
| `export const FOO = [...] as const`    |   125 | 包含正式业务值集、权限 registry、平台 UI 类型和部分未命名 lifecycle。 |
| `export const FooSchema = z.enum(...)` |    99 | 仍有一部分 inline `z.enum([...])` 没有命名 value object。             |
| `export const FooValue = ...`          |    80 | 第一轮治理已覆盖主要业务枚举，但仍有历史切片遗留不完整模式。          |
| 已由 `EX-56` 到 `FE-52` 跨层收口的枚举 |    85 | 已进入 shared contract / DB check / generated client / Admin 消费链。 |

### 3.1 Already Good As Independent Business Lifecycle

以下枚举表达对象自己的业务生命周期，当前不应为了复用字面值而合并：

| Enum                                       | Decision | Reason                                           |
| ------------------------------------------ | -------- | ------------------------------------------------ |
| `LeadStatus`                               | Keep     | 销售漏斗语义，和项目、合同状态机不同。           |
| `ProjectStatus`                            | Keep     | 项目主状态，涉及交付、暂停、关闭和权限动作。     |
| `ProjectStage`                             | Keep     | 阶段路径，不等同于状态。                         |
| `ContractStatus`                           | Keep     | 合同签署 / 履约生命周期。                        |
| `ReceiptRecordStatus`                      | Keep     | 到账事实确认 / 冲销生命周期。                    |
| `PayableRecordStatus`                      | Keep     | 应付登记、部分支付、完成、关闭语义。             |
| `PaymentRecordStatus`                      | Keep     | 付款事实登记和确认语义。                         |
| `InvoiceRecordStatus`                      | Keep     | 开票 / 收票 / 核验 / 异常 / 关闭语义。           |
| `CommissionPayoutStatus`                   | Keep     | 提成发放状态机。                                 |
| `CommissionAdjustmentStatus`               | Keep     | 提成调整审批与执行状态机。                       |
| `CommissionFinalSettlementStatus`          | Keep     | 最终结算和质保金结算语义。                       |
| `ProjectActualCostRecordStatus`            | Keep     | 实际成本登记、确认、纳入、作废、替换状态机。     |
| `ProjectHandoverDetailView.handoverStatus` | Promote  | 当前是 inline enum；应先提取命名 schema 再治理。 |

### 3.2 Shared Lifecycle Candidates

以下值域在多个业务中重复出现，且不是每次都代表独立状态机。后续应抽象为共享 lifecycle family，减少复制：

| Lifecycle Family          | Values                               | Candidates                                                                                                                 | Next Slice |
| ------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `VersionLifecycle`        | `active/superseded/voided`           | `SalesFollowUpRecordStatus`、`ContractTermSnapshotStatus`、`OperatingLifecycleStatus`、`CommissionLifecycleSnapshotStatus` | `EX-58A`   |
| `EffectiveVersionState`   | `effective/superseded`               | `ProjectTechnicalCostPackageStatus`、`ProjectBidCommercialProcessStatus`、`ProjectPricingMarginReviewStatus`               | `EX-58A`   |
| `PublishableVersionState` | `draft/active/superseded`            | `OperatingBaselinePackageStatus`、部分规则版本 / baseline 版本                                                             | `EX-58A`   |
| `DictionaryItemStatus`    | `active/inactive`                    | `LeadSourceStatus`、未来附件分类 / 跟进类型 / 费用分类字典项                                                               | `EX-58C`   |
| `BinaryAvailability`      | `available/missing`、`ready/blocked` | 合同承接、移交摘要等只读 projection 中的可用性检查                                                                         | `EX-58A`   |
| `ConfirmationLifecycle`   | `pending/confirmed/closed`           | 移交参与人确认、确认记录摘要、只读 projection 状态                                                                         | `EX-58A`   |

Rule：只有当含义、流转、权限动作和历史记录要求一致时，才允许复用共享 lifecycle。值相同但语义不同的枚举不得合并。

### 3.3 Dictionary / Configuration Candidates

以下值域不适合长期硬编码为代码枚举；它们应该由管理权限维护，支持初始化、排序、停用、引用保护：

| Candidate               | Current Shape                     | Target Model                                                        | Reason                                | Next Slice |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------- | ------------------------------------- | ---------- |
| Lead source             | 已有 `LeadSource` 字典和 status   | 保持字典；只保留 `LeadSourceStatus` 或共享 `DictionaryItemStatus`。 | 来源应可增删停用，不应写死代码。      | `EX-58C`   |
| Attachment category     | `AttachmentCategory` enum         | `attachment_category` 字典，初始化高频分类，已被引用只能停用。      | 附件分类会随业务沉淀变化。            | `EX-58C`   |
| Sales follow-up type    | `SalesFollowUpType` enum          | `sales_follow_up_type` 字典，保留系统默认项和停用策略。             | 跟进方式会受企业工具和流程变化影响。  | `EX-58C`   |
| Sales follow-up outcome | `SalesFollowUpOutcome` enum       | 先保持 enum；若后续销售过程管理要求可配置，再转字典。               | 当前还参与提醒和流程判断，先谨慎。    | `EX-58C`   |
| Expense category        | `ExpenseCategory` enum            | `expense_category` 字典或财务科目映射表。                           | 财务费用类型通常需要运营 / 财务维护。 | `EX-58C`   |
| Pricing condition type  | `PricingMarginConditionType` enum | 可后置为审批 / 风险条件配置表。                                     | 当前作为 MVP 条件分类可先保留。       | `EX-58C`   |

Rule：配置字典的 `code` 仍是稳定英文代码，不允许中文值；展示名、描述、排序、是否启用由字典表管理。

### 3.4 Keep As Enum, But Not Status

以下是动作、决策、模式、等级或来源类型，不应和 `status` 合并：

| Category             | Examples                                                                       | Decision                                        |
| -------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------- |
| Decision             | `ApprovalDecision`、`PricingMarginDecision`、`OperatingSignalReviewDecision`   | 保留独立决策枚举。                              |
| Mode                 | `OperatingSnapshotMode`、`CostStageAttributionMode`、`SensitiveProjectionMode` | 保留模式枚举；可抽 common subset schema。       |
| Severity / level     | `OperatingSignalLevel`、`OperatingRiskLevel`、`GrossMarginBand`                | 保留规则等级枚举；中文只在展示 label。          |
| Source / target type | `AttachmentTargetType`、`TodoSourceType`、`ProjectTimelineSourceType`          | 保留引用类型枚举，但需统一 code style。         |
| Action               | `LeadAllowedAction`、`OperatingSnapshotActionLevel`                            | 保留动作 / 动作等级枚举，不归入状态 lifecycle。 |

### 3.5 Keep Open

以下字段不进入闭合 enum：

| Field Pattern                                 | Reason                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `reason` / `summary` / `description` / `note` | 用户输入或业务叙述。                                                     |
| `blockingReasons`                             | 当前是开放原因摘要；若后续需要规则化，应改为 `reasonCode + reasonText`。 |
| `roleKey` / `roleCode` / `participantRoleKey` | 平台角色或责任边界 code，不能假装成业务 enum。                           |
| `externalId` / `sourceRecordId` / `code`      | 外部系统或运营配置标识。                                                 |
| `mimeType` / `extension` / `storageKey`       | 技术元数据，应由格式校验和安全策略治理。                                 |
| Query params and UI-only severity             | 传输参数或纯展示状态，不属于领域枚举。                                   |

## 4. Code Value Policy

后续新增或改造 enum / dictionary code 必须遵守：

1. 不允许中文枚举值。
2. 不为了兼容开发期历史值保留迁移映射。
3. DB / API / OpenAPI code value 默认使用 `lower-kebab`。
4. 已存在且非外部口径的 `not_started`、`pending_effective` 等 snake case 应在对应切片 direct cutover 为 `not-started`、`pending-effective`。
5. `void` 应统一为 `voided`，避免和 JavaScript / SQL / 操作语义混淆。
6. `UPPER_SNAKE` 只允许用于真实外部系统代码、会计口径代码或历史已冻结的集成枚举；否则后续应改为 `lower-kebab`。
7. 展示层中文 label 必须在 Admin presentation helper 或字典表 `displayName` 中维护，不进入 value。

## 5. Status History Policy

只存当前 `status` 不能满足追溯。以下对象后续需要状态 / 阶段历史：

| Object                         | History Needed         | Recommended Shape                                                             | Next Slice |
| ------------------------------ | ---------------------- | ----------------------------------------------------------------------------- | ---------- |
| Lead                           | status history         | `lead_status_history(id, lead_id, from_status, to_status, reason, actor, at)` | `EX-58D`   |
| Project                        | stage + status history | `project_stage_history` + `project_status_history` 或统一 project event 表。  | `EX-58D`   |
| Contract                       | status history         | `contract_status_history`，记录草稿、待审、生效、终止、完成。                 | `EX-58D`   |
| Commission payout / adjustment | domain event history   | 当前可依托审批和提成记录；是否新增统一 event 表由 G1 决策。                   | `EX-58D`   |
| Finance records                | audit / reversal chain | 优先用既有版本链 / 作废 / 冲销字段，不急于新增通用 history 表。               | `EX-58D`   |

Rule：状态历史不是替代当前状态字段；当前状态仍保留在主表，历史表记录变化过程。

## 6. Follow-Up Slice Plan

| Slice    | Type                  | Scope                                                                                                               | Must Not Do                                                                     |
| -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `EX-58A` | contract / refactor   | 抽象共享 lifecycle family，提取 inline enum 为命名 schema + value object，统一 projection-only 状态的 schema 命名。 | 不改 DB 值、不改业务状态机、不转字典。                                          |
| `EX-58B` | cross-layer-high-risk | 统一代码值风格，对非外部口径的 `void`、snake case、UPPER_SNAKE 做 direct cutover，更新 DB check / OpenAPI / Admin。 | 不做兼容映射，不保留旧值，不混入字典化。                                        |
| `EX-58C` | persistence / config  | 冻结并落地配置字典候选：附件分类、跟进类型、费用分类等；支持 seed、排序、停用、引用保护和管理权限。                 | 不把开放文本硬 enum 化；不做复杂审批流。                                        |
| `EX-58D` | persistence / query   | 为 Lead / Project / Contract 等核心对象冻结状态历史模型，明确 from/to、actor、reason、source command 和查询面。     | 不把所有台账都接入统一 history；不做事件溯源框架。                              |
| `FE-53`  | frontend-only         | 在后端 generated client / dictionary query 稳定后，调整 Admin 展示、筛选、表单选项来源和 label 映射。               | 不在前端本地伪造字典或 enum。                                                   |
| `EX-59`  | governance / process  | 将 `check:enum-like-strings` 扩展到后端服务、实体和 shared contracts，覆盖 inline `z.enum` 和未命名 schema。        | 不直接替代 `EX-58A` 的 contract 设计；扫描结果必须进入显式 allowlist 或子切片。 |

## 7. Execution Order

推荐顺序：

1. `EX-58A`：先解决 schema 和 value object 形态，建立共享 lifecycle 名称。
2. `EX-58B`：再统一 code value 风格，避免后续字典和历史表继续继承混乱值。
3. `EX-58C`：转配置字典，优先附件分类和销售跟进类型。
4. `EX-58D`：补状态历史，让核心对象具备长期追溯能力。
5. `FE-53`：等后端 enum / dictionary / generated client 稳定后再做前端选项来源和展示收口。
6. `EX-59`：最后把扫描覆盖面扩大到后端和 shared contracts，防止 inline enum 倒灌。

## 8. G1 Conclusion

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-03`
- Conditions:
  - 后续 runtime 切片必须拆分，禁止在一个 PR / commit 中同时做共享 lifecycle、code value direct cutover、字典化和状态历史。
  - 涉及 OpenAPI / generated client / DB check 的切片必须按 cross-layer validation 执行。
  - 涉及开发库值改造的切片不做旧值兼容，不保留中文值，不做双写。
