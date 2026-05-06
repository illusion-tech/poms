# FE-57 编辑历史前端入口 G3 Closeout

- Gate Status: `G3 / Ready for Review`
- Parent: `EX-63`
- Owner: `Codex`
- Date: `2026-05-06`
- Baseline: `fe-57-entity-audit-history-frontend-baseline.md`
- Tracker Row: `FE-57`

## 1. 交付范围

本片已完成编辑历史前端第一版:

- 新增 `AuditHistoryStore`, 通过 generated `RuntimeAuditApi.runtimeAuditControllerListEntityAuditLogs` 读取实体审计历史。
- 新增统一 `AuditHistoryPanel`, 自带只读入口、弹窗、刷新、加载、错误、空状态和字段快照展示。
- 在线索详情弹窗接入 `targetType=lead`。
- 在客户详情弹窗接入 `targetType=customer`。
- 在项目详情页接入 `targetType=project`。
- 只展示后端返回的 `metadata.changedFields` 与 before / after snapshots, 不在前端计算 diff。

## 2. 明确未交付

- 未新增后端 route、OpenAPI、generated client 或 migration。
- 未新增全局审计中心、导出、图表或跨对象检索。
- 未解析操作人姓名, 当前展示 `operatorId`。
- 未覆盖合同详情、联系人、关系人、竞争态势等对象入口。
- 未补写尚未产生字段级审计的业务命令。

## 3. 关键一致性结论

| Edge               | Result | Evidence                                                                                   |
| ------------------ | ------ | ------------------------------------------------------------------------------------------ |
| UI -> API client   | Pass   | `AuditHistoryStore` 只调用 generated client, 不手写 URL。                                  |
| Entity context     | Pass   | `LeadList`, `CustomerList`, `ProjectDetail` 均传入当前详情对象的 `targetType + targetId`。 |
| Snapshot semantics | Pass   | `AuditHistoryPanel` 只按 `metadata.changedFields` 展示字段, 不前端推断 diff。              |
| Scope boundary     | Pass   | 无全局审计菜单、无导出、无后端改动。                                                       |

## 4. 验证结果

| Check                          | Command                                                                               | Result | Notes                    |
| ------------------------------ | ------------------------------------------------------------------------------------- | ------ | ------------------------ |
| Audit panel focused test       | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=audit-history-panel` | Pass   | 2 tests passed.          |
| Lead entry regression test     | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`           | Pass   | 21 tests passed.         |
| Customer entry regression test | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-list`       | Pass   | 2 tests passed.          |
| Project entry regression test  | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`      | Pass   | 23 tests passed.         |
| Admin data-access lint         | `corepack pnpm nx lint admin-data-access`                                             | Pass   | No lint errors.          |
| Admin lint                     | `corepack pnpm nx lint poms-admin`                                                    | Pass   | No lint errors.          |
| Admin build                    | `corepack pnpm nx build poms-admin`                                                   | Pass   | Production build passed. |

## 5. 风险与留白

| Risk ID                     | Status   | Scope      | Notes                                                           |
| --------------------------- | -------- | ---------- | --------------------------------------------------------------- |
| `FE57-E1-OPERATOR-NAME`     | Accepted | 操作人展示 | 当前审计记录仅返回 `operatorId`, 真实姓名解析另行治理。         |
| `FE57-R1-BROWSER-UX-REVIEW` | Pending  | 浏览器体验 | G3 已通过自动化验证, 仍需用户在实际详情页确认入口位置和可读性。 |

## 6. G3 结论

`FE-57` 已满足 `G3 / Ready for Review` 条件。下一步建议在浏览器中分别打开线索、客户、项目详情确认入口位置与弹窗可读性；确认后再推进 `G4 / Done` 并提交。
