# EX-63B CRM 销售事实字段级审计扩展 G3/G4 Closeout

- Gate Status: `G4 / Done`
- Parent: `EX-63`
- Owner: `Codex`
- Date: `2026-05-07`
- Baseline: `ex-63b-crm-sales-fact-field-audit-baseline.md`
- Tracker Row: `EX-63B`

## 1. 交付范围

本片已完成 CRM 销售事实编辑命令字段级审计:

- `PATCH /customer-contacts/{id}` 成功修改时写入 `customer-contact.updated`。
- `PATCH /opportunity-stakeholders/{id}` 成功修改时写入 `opportunity-stakeholder.updated`。
- `PATCH /competitor-intelligence-records/{id}` 成功修改时写入 `competitor-intelligence.updated`。
- `PATCH /sales-discovery-records/{id}` 成功修改时写入 `sales-discovery-record.updated`。
- 四类更新均记录 `targetType + targetId`、`operatorId`、`requestId`、`beforeSnapshot`、`afterSnapshot`、`metadata.changedFields`、`metadata.redactedFields`、`metadata.sourceCommand` 和业务上下文。
- 业务实体保存和 audit log 写入使用同一 MikroORM transaction。
- 无实际字段变化时不写成功审计, 不刷新 `updatedBy`。
- 联系方式、备注、关系说明、竞争说明和销售发现长文本只写长度 / 存在性摘要, 不复制原文。

## 2. 明确未交付

- 未新增 public route、DTO、OpenAPI、generated client 或 migration。
- 未新增前端入口或全局审计中心。
- 未覆盖 create / void / replace 等非编辑命令。
- 未新增私人画像字段, 未改变销售情报缺口、评分、闸口或转项目算法。
- 未为 CRM 编辑 DTO 增加 `expectedVersion`, 继续作为后续收口项。

## 3. 关键一致性结论

| Edge                 | Result | Evidence                                                                                                  |
| -------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Document -> code     | Pass   | 四类对象、事件命名、targetType 与 `EX-63` 一致。                                                          |
| Route surface        | Pass   | 只增强既有 update command, 无新增或变更 public route。                                                    |
| Transaction boundary | Pass   | `SalesIntelligenceService` 通过 repository entity manager transaction 同时 persist 业务实体和 audit log。 |
| Snapshot semantics   | Pass   | before / after 只包含 changed fields, 自由文本与联系方式使用摘要。                                        |
| Read-side boundary   | Pass   | targetType 已由 `EX-63C` 实体级审计读取出口支持。                                                         |

## 4. 验证结果

| Check             | Command                                                                                    | Result | Notes                   |
| ----------------- | ------------------------------------------------------------------------------------------ | ------ | ----------------------- |
| API focused tests | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=sales-intelligence.service` | Pass   | 9 tests passed.         |
| API lint          | `corepack pnpm nx lint poms-api`                                                           | Pass   | No lint errors.         |
| API build         | `corepack pnpm nx build poms-api`                                                          | Pass   | Webpack build passed.   |
| Markdown check    | `corepack pnpm run format:md:check`                                                        | Pass   | Touched docs formatted. |
| Diff check        | `git diff --check`                                                                         | Pass   | No whitespace errors.   |

## 5. Drift / Risk

- `new-real-drift`: none.
- `existing-baseline-drift`: CRM update DTOs do not yet carry `expectedVersion`; baseline records `EX63B-E1-EXPECTED-VERSION`.
- `accepted-db-specific-difference`: N/A, no DDL.
- `tool-noise`: N/A.
- `design-change-required`: none.

## 6. G3 / G4 结论

`EX-63B` 已满足 `G4 / Done` 条件。下游 `FE-57` 编辑历史入口可读取四类 CRM 销售事实编辑历史；后续若要补 `expectedVersion`，应另拆契约切片处理。
