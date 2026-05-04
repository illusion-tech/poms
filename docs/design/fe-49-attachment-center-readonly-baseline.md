# FE-49 附件中心读取型检索页实施基线包

- Gate Status: `Pass`
- Parent: `EX-45`, `FE-46`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-05`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` -> `FE-49`

## 1. 范围

- 本次目标: 新增业务证据库只读检索页, 汇总当前用户可读取的客户、线索、项目和合同附件, 支持按业务对象、分类、上传人、时间和文件名过滤, 并跳回业务对象。
- 本次明确不做: 后端全局附件检索 API、目录树、网盘式操作、外链分享、批量下载、附件跨对象移动。
- 下游可依赖的交付边界: 业务用户可以从菜单进入只读附件中心, 查看可读范围内的 latest active 附件并回到来源业务对象。
- 不允许下游依赖的留白: 前端聚合不等同于后端索引; 大数据量检索、分页、全文检索和复杂权限矩阵需后续后端切片承接。

## 2. 正式输入

| Input Type      | Document / Source                                                   | Status  | Notes                                                |
| --------------- | ------------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| Business design | `phase2-development-execution-tracker.md` -> `FE-49`                | Frozen  | 只读检索页, 不是全局网盘。                           |
| Attachment API  | `EX-45` / `EX-51` attachment list API                               | Current | 当前只能按 target list, 本片不新增 public route。    |
| Navigation SSOT | `apps/poms-api/src/app/features/navigation/navigation.constants.ts` | Current | 需要新增正式菜单入口, 与前端 route 对齐。            |
| Permission SSOT | `libs/shared/contracts/src/lib/shared-contracts.ts`                 | Current | 需要新增 `nav:attachments:view` 作为菜单可见性权限。 |
| Frontend route  | `apps/poms-admin/src/app.routes.ts`                                 | Current | 新增 `/attachments` 正式业务入口。                   |

## 3. 本次 SSOT

| Concern             | SSOT                                              | Implementation Rule                                                             |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Search source       | Existing business list APIs + attachment list API | 只加载当前用户具备读取权限的业务对象类型; 单个目标读取失败不阻断全页。          |
| Attachment rows     | `AttachmentSummary`                               | 只展示 latest active 附件; 状态和安全过滤由后端附件 list 负责。                 |
| Business navigation | Explicit target route map                         | 客户 `/customers`, 线索 `/leads`, 项目 `/projects/:id`, 合同 `/contracts/:id`。 |
| Menu visibility     | `nav:attachments:view`                            | 仅控制菜单可见; 页面守卫仍要求至少一个业务读取权限。                            |

## 4. 命令与接口边界

| API / Route             | Consumer                | Request / Params        | Response              | Guard / Permission                               | Result  |
| ----------------------- | ----------------------- | ----------------------- | --------------------- | ------------------------------------------------ | ------- |
| business list APIs      | `AttachmentCenterStore` | none / existing filter  | business summaries    | existing business read permissions               | Consume |
| `GET /api/attachments`  | `AttachmentCenterStore` | target type + target id | `AttachmentSummary[]` | existing attachment read permissions             | Consume |
| `/attachments` frontend | `AttachmentCenter` page | query filters           | UI only               | `customer:read` OR `lead:read` OR `project:read` | Add     |

## 5. 测试与校验

| Check      | Required | Command / Evidence                                  | Result  | Gap / Reason |
| ---------- | -------- | --------------------------------------------------- | ------- | ------------ |
| Lint       | Yes      | `corepack pnpm nx lint poms-admin`                  | Pending | G3 执行。    |
| Build      | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache` | Pending | G3 执行。    |
| Unit tests | Yes      | `corepack pnpm nx test poms-admin --runInBand`      | Pending | G3 执行。    |
| API tests  | No       | N/A                                                 | N/A     | 不新增 API。 |

## 6. 例外与风险

| Exception ID           | Level | Scope            | Approved By | Cleanup Owner | Cleanup Due          | Notes                                            |
| ---------------------- | ----- | ---------------- | ----------- | ------------- | -------------------- | ------------------------------------------------ |
| `FE49-R1-FRONTEND-AGG` | Low   | 只读附件中心检索 | Codex       | Codex         | Backend search slice | 当前无全局附件搜索 API, 前端按可读业务对象聚合。 |

## 7. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-05`
- Conditions: 不新增后端路由; 聚合页必须清楚展示读取范围和失败降级。
