# EX-69A 附件中心聚合查询纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `FE-49` 附件中心读取型检索页 / `FE-63` 浏览器验收反馈
- Owner: Codex
- Slice Type: `cross-layer-high-risk` corrective sub-slice
- G3 Reviewer: local
- Checkpoint Date: 2026-05-28
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-69A`

## 1. 触发背景与范围

- 触发原因: `FE-63` 视觉验收切到 `/attachments` 时发现页面长时间不可交互。排查显示 `FE-49` 旧实现按客户、线索、项目、合同列表在前端逐对象调用 `GET /attachments` 聚合，在试用数据量下形成 N+1 请求与浏览器主线程压力。
- 本次目标: 将附件中心只读列表收口为后端聚合读模型 `GET /attachment-center-records`，一次返回当前用户可读客户、线索、项目和合同的 latest active 附件记录。
- 本次明确不做: 不新增全局网盘、目录树、外链分享、批量下载、跨对象移动、服务端全文搜索或附件写侧行为。
- 本次纠偏后可恢复的可信边界: 附件中心页面可依赖一个受控后端读模型加载基础列表，前端继续只做展示、过滤和来源跳转。
- 仍不允许下游依赖的留白: 不承诺附件中心具备服务端分页、排序、全文搜索或导出能力；这些能力需要后续独立切片。

## 2. 正式输入

| Input Type                | Document / Source                                                              | Section / Anchor                       | Status     | Notes                                                              |
| ------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- | ---------- | ------------------------------------------------------------------ |
| Business design           | `docs/design/archive/slices/fe-49-attachment-center-readonly-baseline.md`      | FE-49 read-only attachment center      | superseded | 旧边界明确不新增后端全局检索 API，但前端聚合已被验证为性能漂移     |
| Business design           | `docs/design/archive/slices/fe-48-fe-49-attachment-frontend-g3-g4-closeout.md` | `FE49-R1-FRONTEND-AGG`                 | input      | 已接受的前端聚合留白现在转为本次纠偏输入                           |
| Frontend baseline         | `docs/design/fe-63-admin-table-visual-system-baseline.md`                      | `3. 不在本片范围`                      | input      | `FE-63` 不允许混入后端 route / OpenAPI / generated client          |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`                            | `AttachmentCenterRecordSchema`         | current    | 读模型返回 target 摘要与 `AttachmentSummary`                       |
| Query boundary            | `AttachmentService.listAttachmentCenterRecords`                                | service read model                     | current    | 权限按 target type 收敛；只返回 latest active 附件                 |
| Data model / table freeze | existing `attachment`, `attachment_link`, business target tables               | no schema change                       | N/A        | 本片不新增表、列或 migration                                       |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                  | resource-first + stable query resource | accepted   | 纠正临时 `/attachments/center` 为 `GET /attachment-center-records` |

## 3. Drift 清单与本次 SSOT

| Concern                   | Drift / SSOT                                                                | Corrective Rule                                                          |
| ------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Business semantics        | `FE49-R1-FRONTEND-AGG` 在数据量扩大后造成真实性能漂移                       | 附件中心基础列表升级为后端只读聚合读模型，不扩大为网盘能力               |
| Route / command naming    | 实现中曾直接新增 `GET /attachments/center`，缺少 route inventory 与 G1 冻结 | canonical route 固定为 `GET /attachment-center-records`                  |
| DTO / contract naming     | 前端曾手写 `AttachmentCenterApiRecord` 与 HTTP path                         | 使用 shared contract + OpenAPI generated client `AttachmentCenterRecord` |
| Table / column naming     | N/A                                                                         | 不改 schema                                                              |
| Date / time semantics     | 沿用 `AttachmentSummary.uploadedAt` / `updatedAt` datetime                  | 不新增日期字段                                                           |
| Identifier semantics      | target identity 由 `targetType + targetId + attachment.id` 组成             | `targetId` 保持 UUID；业务编号只作为显示字段                             |
| Money / decimal semantics | N/A                                                                         | 不涉及金额                                                               |
| Status machine            | 附件状态仍由 `Attachment.status`, `isLatest`, active links 决定             | 列表只返回 latest active 附件，不改变版本链状态机                        |

## 4. 当前阻断结论

- Current Gate: `G3 corrective checkpoint`
- Blocking Findings:
  1. `FE-63` 的正式基线是 frontend-only，但实现中新增了后端 public route。
  2. 新 route 初始没有出现在 `api-route-canonical-inventory.md`，且前端用手写 HTTP path 消费。
- Why parent task cannot be closed: `FE-63` 可保持视觉片边界，但本轮工作在提交前必须先关闭 `EX-69A` 的 route / contract / generated client 漂移。

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. 新增附件中心聚合读模型 route、controller、repository/service 查询和 focused backend test。
  2. 将前端附件中心 store 从 N+1 前端聚合改为消费 generated client。
  3. 回写 route inventory、tracker、progress 和 drift inventory。
- 本批未修复范围:
  1. 不做服务端分页、排序、全文搜索或导出。
  2. 不改变附件上传、下载、预览、版本和 final 标记行为。

| Concern                | Before                                                              | After                                       | Result |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------- | ------ |
| Attachment center load | frontend loads business lists then calls attachment list per target | backend returns aggregate read model once   | Pass   |
| Route governance       | temporary route missing authoritative inventory                     | `GET /attachment-center-records` registered | Pass   |
| Client contract        | hand-written `HttpClient.get('/api/attachments/center')`            | generated client method                     | Pass   |

## 6. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                                      | Result | Gap / Reason                                              |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access`                                                         | Pass   | No lint errors                                            |
| Build                            | Yes      | `corepack pnpm nx build shared-contracts`; `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                                       | Pass   | Builds passed                                             |
| Unit tests                       | Scoped   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=attachment.service`; `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=attachment-center` | Pass   | API 18 tests passed; Admin 3 tests passed                 |
| API / integration tests          | Scoped   | API dev server log shows `GET /api/attachment-center-records` route mapped and aggregate attachment queries executed                                                    | Pass   | Route reached through Admin page                          |
| E2E                              | Decision | In-app browser `/attachments` smoke after login with `sales_rep`                                                                                                        | Pass   | spinner 0, refresh enabled, row count 1, console errors 0 |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check`                                                                       | Pass   | Generated client synchronized                             |
| Markdown / diff sanity           | Yes      | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                  | Pass   | Markdown tables formatted; no whitespace errors           |
| Migration / schema check         | No       | N/A                                                                                                                                                                     | N/A    | no schema change                                          |

## 7. 残余阻断与后续切片

- 已解除的阻断: route inventory 缺失、临时 route 命名、手写 HTTP path 与 generated client drift 均已解除。
- 仍存在的阻断:
  1. 无。
- 后续子切片:
  1. 若附件中心需要服务端分页、排序、全文搜索或导出，另开新 `query-only` / `cross-layer` 切片。

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | -------------------------------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 不登记例外；本轮直接纠偏 route / client 漂移 |

## 9. G3 Checkpoint 结论

- Checkpoint Status: Pass
- Approved By: local corrective checkpoint
- Approved At: 2026-05-28
- Conditions: None.
