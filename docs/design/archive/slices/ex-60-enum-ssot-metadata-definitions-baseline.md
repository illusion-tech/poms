# EX-60 枚举 SSOT 形态收敛与 metadata definitions 治理基线

- Task ID: `EX-60`
- Slice type: `contract / frontend / governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-60` through `EX-60F`
- Public route surface: no new, changed or removed public route.
- Status: `G1`
- G1 Date: 2026-05-04

## 1. Background

`EX-58` 完成了 code value direct cutover、配置字典 runtime 和核心状态历史模型基线，但 shared contracts 仍存在三类 SSOT 形态混杂：

1. `ARRAY + type + schema + Value object` 双源维护。
2. 前端局部维护 `LABELS`、`SEVERITIES`、`OPTIONS`，与 shared contract code value 分离。
3. 配置字典字段和闭合枚举字段混用，容易重新把 runtime dictionary 写回硬编码 enum。

本片只收敛 SSOT 形态，不改变枚举 code value、不做旧值兼容、不迁移数据库、不新增 public route。

## 2. Target Classification

| Classification            | Rule                                                                                           | Examples                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Metadata definitions SSOT | 闭合业务枚举，展示 label / severity / options 属于领域事实或稳定 UI 事实。                     | `LeadStatus`、`ProjectStage`、`ContractReadinessStatus`、`CommissionPayoutStatus` |
| Value object SSOT         | 低层通用生命周期或技术枚举，只需要稳定 code value 和 schema，不需要 label / options metadata。 | `ActiveInactiveStatus`、`VersionLifecycleStatus`、`AuditLogResult`                |
| Runtime dictionary        | 业务运营可维护选项，由 `dictionary_item` seed / API / Admin 字典管理提供，不回退硬编码 enum。  | `AttachmentCategory`、`SalesFollowUpType`、`ExpenseCategory`、`LeadSource`        |
| Derived subset            | 由一个已命名 Value object 派生子集，不另建 label / value 双源。                                | `NON_RETENTION_COMMISSION_PAYOUT_STAGES`、`CREATABLE_OPERATING_SNAPSHOT_MODES`    |

## 3. Slice Breakdown

| Sub-slice | Scope                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `EX-60A`  | 建立 definitions helper，并以 `LeadGateMissingItem` 试点派生 values / schema / value object / label。                                      |
| `EX-60B`  | 收敛线索、客户、附件安全级别、销售跟进结果等 CRM 展示型枚举的 label / severity / options。                                                 |
| `EX-60C`  | 收敛项目、合同、合同准备、合同移交、项目移交等展示型枚举。                                                                                 |
| `EX-60D`  | 收敛技术成本、招投标 / 商务竞标、报价与毛利评审中的 decision / status / type / level 展示枚举。                                            |
| `EX-60E`  | 收敛回款 / 应付 / 付款 / 发票、审批 / 待办、提成计算 / 发放 / 调整 / 结算、经营信号等展示枚举。                                            |
| `EX-60F`  | 将通用低层 lifecycle / platform / audit / security 枚举改为 Value object 派生数组 / schema，并通过 enum-like scan 防止新增未治理裸字符串。 |

## 4. Non-goals

- 不引入中文枚举 code value。
- 不接受旧 code value，不做 mapping / fallback / 双写。
- 不把 `AttachmentCategory`、`SalesFollowUpType`、`ExpenseCategory` 等 runtime dictionary 字段重新写成静态 enum。
- 不改变状态流转、权限、金额、审批、待办、提成或敏感投影行为。
- 不修改数据库结构或迁移。

## 5. Validation Plan

| Check                                            | Purpose                                                |
| ------------------------------------------------ | ------------------------------------------------------ |
| `corepack pnpm nx build shared-contracts`        | 验证 helper、metadata definitions 和 schema 类型边界。 |
| `corepack pnpm nx build poms-api`                | 验证 API 消费 shared contracts 不受影响。              |
| `corepack pnpm nx build poms-admin`              | 验证 Admin metadata 消费与 generated enum 类型兼容。   |
| `corepack pnpm nx lint poms-api`                 | 后端 lint 回归。                                       |
| `corepack pnpm nx lint poms-admin`               | 前端 lint 回归。                                       |
| `corepack pnpm nx test poms-api`                 | 后端行为和枚举边界回归。                               |
| `corepack pnpm nx test poms-admin --watch=false` | 前端展示 helper 和页面回归。                           |
| `corepack pnpm run check:enum-like-strings`      | 回归扫描，确认新增裸字符串均已治理或分类。             |
| `corepack pnpm run format:md:check`              | 文档格式检查。                                         |
| `git diff --check`                               | 补丁 whitespace 检查。                                 |
