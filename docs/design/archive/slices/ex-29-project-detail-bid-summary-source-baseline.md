# EX-29 项目详情投标摘要事实源纠偏实施基线包

- Gate Status: `Pass`
- Parent: `EX-18`
- Owner: `Codex`
- Slice Type: `query-behavior + frontend-consumer-test`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-29`

## 1. 范围

- 本次目标:
  1. 关闭 `EX18-E1-BID-SUMMARY`：项目详情 `currentBidSummary` 不再固定返回 `not_configured`。
  2. 复用 `EX-27` 已落地的 `ProjectBidCommercialProcess` 当前有效事实源。
  3. 保持 `ProjectDetailBidSummary` 现有字段不变，只把 `bidProcessId`、`bidStatus`、`resultStatus`、`summary` 映射到当前竞标 process。
  4. 补 API focused test 和项目详情前端显示测试，证明详情页可展示真实投标摘要。
- 本次明确不做:
  1. 不新增 public API route、DTO 字段、OpenAPI schema、generated client 或 DDL。
  2. 不新增竞标写动作、审批、材料表格或详情页内完整投标工作区。
  3. 不把 `ProjectDetailView.currentBidSummary` 扩展成 `ProjectBidCommercialWorkspaceView`。
  4. 不改签约前工作区的 `bid-commercial` 页面。

## 2. 正式输入

| Input Type       | Document / Source                                         | Section / Anchor              | Status | Notes                                |
| ---------------- | --------------------------------------------------------- | ----------------------------- | ------ | ------------------------------------ |
| Open exception   | `ex-18-project-detail-view-action-boundary-baseline.md`   | `EX18-E1-BID-SUMMARY`         | Open   | 项目详情投标摘要仍是占位             |
| Fact source      | `ex-27-presigning-bid-commercial-fact-source-baseline.md` | `ProjectBidCommercialProcess` | Done   | 当前竞标 process 已有正式事实源      |
| Runtime query    | `ProjectQueryService.getProjectDetail`                    | `currentBidSummary`           | Fact   | 当前固定返回 `not_configured`        |
| Runtime frontend | `ProjectDetail`                                           | `投标信息`                    | Fact   | 非 `not_configured` 时展示 `summary` |

## 3. 本次 SSOT

| Concern                 | SSOT                                                                  | Implementation Rule                                      |
| ----------------------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| Current bid process     | `ProjectRepository.findCurrentProjectBidCommercialProcessByProjectId` | 详情 query 只读取当前有效 process，不枚举历史版本        |
| Detail summary contract | `ProjectDetailBidSummary`                                             | 不增字段，不改 generated client                          |
| `bidStatus`             | `ProjectBidCommercialProcess.currentStage`                            | 表示当前竞标阶段；无当前 process 时仍为 `not_configured` |
| `resultStatus`          | `ProjectBidCommercialProcess.resultStatus`                            | 直接投影结果状态                                         |
| `summary`               | `ProjectBidCommercialProcess.processSummary`                          | 详情页只展示简短摘要，不复制完整工作区细节               |

## 4. 命令与接口边界

| Route / Controller   | Query / Service                        | Request DTO / Contract | Response DTO / Contract      | Guard / Permission | Result |
| -------------------- | -------------------------------------- | ---------------------- | ---------------------------- | ------------------ | ------ |
| `GET /projects/{id}` | `ProjectQueryService.getProjectDetail` | existing path `id`     | existing `ProjectDetailView` | `project:read`     | Reused |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{id}`
- Current implemented route(s): `GET /projects/{id}`
- Inventory status: `aligned`
- Blocker / exception: none. 本片只修正 existing query projection，不新增 route surface。

## 5. 测试与校验

| Check                  | Required | Command / Evidence                                                                            | Result  | Gap / Reason             |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------- | ------- | ------------------------ |
| API focused tests      | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts` | Pending | detail query projection  |
| Admin focused tests    | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail.spec.ts`      | Pending | detail page display      |
| API lint               | Yes      | `corepack pnpm nx lint poms-api`                                                              | Pending | query behavior change    |
| Admin lint             | Yes      | `corepack pnpm nx lint poms-admin`                                                            | Pending | frontend test / template |
| Admin build            | Yes      | `corepack pnpm nx build poms-admin`                                                           | Pending | contract consumption     |
| OpenAPI / client check | No       | N/A                                                                                           | N/A     | no schema / route change |
| Migration check        | No       | N/A                                                                                           | N/A     | no persistence change    |
| Markdown format        | Yes      | `corepack pnpm run format:md:check`                                                           | Pending | docs touched             |
| Diff hygiene           | Yes      | `git diff --check`                                                                            | Pending | G3 required              |

## 6. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-25`
- Conditions:
  1. 可以进入实现。
  2. 不新增 route、DTO 字段、generated client 或 DDL。
  3. 若现有 `ProjectDetailBidSummary` 无法表达详情摘要，应停止并新增 contract slice。
