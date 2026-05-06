# FE-57 编辑历史前端入口实施基线包

- Gate Status: `Pass`
- Parent: `EX-63`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-06`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-57`

## 1. 范围

- 本次目标:
  - 在线索详情、客户详情和项目详情增加只读“编辑历史”入口。
  - 消费 `EX-63C` generated client 的实体级审计查询接口。
  - 使用统一前端组件展示审计事件、结果、操作人、时间、字段和脱敏后的 before / after。
  - 前端只展示后端返回的 `metadata.changedFields` 与 snapshots, 不自行计算 diff。
  - 补 focused tests 覆盖入口存在、查询调用参数和无记录 / 错误状态。
- 本次明确不做:
  - 不新增全局审计中心、平台菜单、导出或图表。
  - 不新增后端 route、OpenAPI、generated client 或 migration。
  - 不在前端补推断字段差异, 不解析业务状态机。
  - 不覆盖尚未产生字段级审计的业务编辑命令。
- 下游可依赖的交付边界:
  - 三类详情页都有一致入口和统一展示。
  - 后续合同详情、联系人、机会关系人等对象可复用同一组件。
- 不允许下游依赖的留白:
  - 无审计记录时只展示空状态, 不代表对象从未修改。
  - 操作人当前只展示 `operatorId`, 真实姓名解析另行治理。
  - CRM 销售事实字段审计仍由 `EX-63B` 补写侧。

## 2. 正式输入

| Input Type                | Document / Source                                | Section / Anchor                                  | Status | Notes                        |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------- | ------ | ---------------------------- |
| Business design           | `ex-63-field-level-audit-governance-baseline.md` | 编辑历史前端入口                                  | Pass   | 前端只读展示, 不做全局中心。 |
| API / Query design        | `ex-63c-entity-audit-read-boundary-closeout.md`  | `GET /audit-logs/targets/{targetType}/{targetId}` | Pass   | 已完成 `G4`。                |
| DTO / OpenAPI design      | `RuntimeAuditApi` generated client               | `runtimeAuditControllerListEntityAuditLogs`       | Pass   | Query 已生成。               |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`               | `listEntityAuditLogs`                             | Pass   | 本片不新增 public route。    |
| UI source                 | `lead-list`, `customer-list`, `project-detail`   | Existing detail containers                        | Pass   | 在详情上下文中增加局部入口。 |

## 3. 本次 SSOT

| Concern                     | SSOT                         | Implementation Rule                                     |
| --------------------------- | ---------------------------- | ------------------------------------------------------- |
| Business semantics          | `EX-63` / `EX-63C`           | 只读展示实体编辑历史。                                  |
| Public route canonical path | `EX-63C` generated client    | 不手写 URL, 只调用 generated method。                   |
| UI component naming         | `AuditHistoryPanel`          | 独立 standalone 组件, 自带弹窗和读取状态。              |
| Store naming                | `AuditHistoryStore`          | 在 admin data-access 封装 `RuntimeAuditApi`。           |
| Date / time semantics       | `AuditLogSummary.occurredAt` | 使用本地 `date` pipe 展示到分钟。                       |
| Identifier semantics        | `targetType + targetId`      | 由详情页传入当前业务对象 ID。                           |
| Snapshot semantics          | `metadata.changedFields`     | 仅展示后端声明字段及对应 snapshot 值, 不前端计算 diff。 |

## 4. 前端边界

| Page / Component             | Target Type | Target ID     | Entry Placement        | Data Source         | Result      |
| ---------------------------- | ----------- | ------------- | ---------------------- | ------------------- | ----------- |
| `LeadList` detail dialog     | `lead`      | `lead.id`     | dialog footer actions  | `AuditHistoryPanel` | Implemented |
| `CustomerList` detail dialog | `customer`  | `customer.id` | detail header actions  | `AuditHistoryPanel` | Implemented |
| `ProjectDetail` page         | `project`   | `project.id`  | context header actions | `AuditHistoryPanel` | Implemented |

## 5. 测试与校验

| Check                  | Required | Command / Evidence                                                          | Result       | Gap / Reason           |
| ---------------------- | -------- | --------------------------------------------------------------------------- | ------------ | ---------------------- |
| Frontend focused tests | Yes      | `audit-history-panel`, `lead-list`, `customer-list`, `project-detail` specs | Pass G3      |                        |
| Admin data-access lint | Yes      | `corepack pnpm nx lint admin-data-access`                                   | Pass G3      |                        |
| Admin lint             | Yes      | `corepack pnpm nx lint poms-admin`                                          | Pass G3      |                        |
| Admin build            | Yes      | `corepack pnpm nx build poms-admin`                                         | Pass G3      |                        |
| OpenAPI / client check | No       | N/A                                                                         | Not required | No API surface change. |
| Markdown / diff check  | Yes      | `format:md:check`, `git diff --check`                                       | Pending G3   |                        |

## 6. 例外与风险

| Exception ID            | Level | Scope                       | Approved By | Cleanup Owner | Cleanup Due | Notes                                   |
| ----------------------- | ----- | --------------------------- | ----------- | ------------- | ----------- | --------------------------------------- |
| `FE57-E1-OPERATOR-NAME` | Low   | 审计记录仅返回 `operatorId` | Codex local | `FE-57+`      | TBD         | 本片不新增用户名称聚合查询, 先展示 ID。 |

## 7. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-06`
- Conditions: UI must not compute field diff; unsupported targets remain hidden by not rendering the component in unrelated pages.

## 8. G3 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-06`
- Evidence: see `fe-57-entity-audit-history-frontend-closeout.md`.
- Remaining condition: browser-level UX review before G4 / Done.
