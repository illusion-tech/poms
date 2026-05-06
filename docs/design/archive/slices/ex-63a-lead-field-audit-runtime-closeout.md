# EX-63A Lead 基础信息字段级审计后端运行时 G3/G4 Closeout

- 状态: `G4 / Done`
- 日期: `2026-05-06`
- 父任务: `EX-63`
- 基线: `ex-63a-lead-field-audit-runtime-baseline.md`
- Tracker: `phase2-development-execution-tracker.md` / `EX-63A`

## 1. 交付内容

- `PATCH /leads/{id}` 的 `LeadService.updateLead` 改为事务内加载、比对、保存和审计。
- 成功修改线索基础信息时写入 `lead.updated` 审计事件。
- 审计载荷包含 `eventType`、`targetType`、`targetId`、`operatorId`、`requestId`、`beforeSnapshot`、`afterSnapshot`、`metadata.changedFields`、`metadata.sourceCommand`、`metadata.expectedVersion` 和 `metadata.redactedFields`。
- `demandDescription` 只记录长度摘要, 不复制全文到审计日志。
- 无实际字段变化时直接返回当前 Lead, 不写 `lead.updated`、不写评分快照、不刷新 `updatedAt`。
- `UpdateLeadRequest` 增加可选 `expectedVersion`, Admin 编辑线索时传入当前 `rowVersion`。
- `RuntimeAuditService.recordAuditLog` 支持接收事务 `EntityManager`, 用于和业务写入同事务提交。

## 2. 明确未做

- 未新增审计读取 route。
- 未新增前端编辑历史入口。
- 未扩展 CRM 客户联系人、关系人、竞争态势或销售发现字段审计。
- 未调整评分算法、线索状态机、转项目规则或销售情报缺口算法。
- 未新增 migration 或 DDL。

## 3. 验证结果

| Check                            | Result | Evidence                                                                              |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| poms-api focused tests           | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead.service`          |
| runtime audit focused tests      | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=runtime-audit.service` |
| poms-admin focused tests         | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`           |
| poms-api lint                    | Pass   | `corepack pnpm nx lint poms-api`                                                      |
| poms-admin lint                  | Pass   | `corepack pnpm nx lint poms-admin`                                                    |
| poms-api build                   | Pass   | `corepack pnpm nx build poms-api`                                                     |
| poms-admin build                 | Pass   | `corepack pnpm nx build poms-admin`                                                   |
| OpenAPI / generated client check | Pass   | `corepack pnpm nx run shared-api-client:check`                                        |
| Markdown table check             | Pass   | `corepack pnpm run format:md:check`                                                   |
| Git diff whitespace check        | Pass   | `git diff --check`                                                                    |
| Migration check                  | N/A    | No DDL change.                                                                        |

## 4. Drift 分类

- Public route surface: `no-drift`; 本片复用既有 `PATCH /leads/{id}`。
- Contract / generated client: `aligned`; `expectedVersion` 已同步 shared contract、OpenAPI 和 generated client。
- Migration / entity: `no-change`; 不涉及 DDL。
- Frontend: `aligned`; 线索编辑请求已传入 `rowVersion`。

## 5. G4 结论

本片已满足 `G4 / Done` 条件，可作为 `EX-63C` 实体级审计读取边界的后端写侧输入。
