# EX-29 项目详情投标摘要事实源纠偏 Local G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `EX-18`
- Owner: `Codex`
- Slice Type: `query-behavior + frontend-consumer-test`
- G3 Reviewer: `Codex`
- Checkpoint Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-29`
- Baseline: `docs/design/archive/slices/ex-29-project-detail-bid-summary-source-baseline.md`

## 1. 范围

- 本次完成:
  1. `ProjectQueryService.getProjectDetail` 读取 `findCurrentProjectBidCommercialProcessByProjectId(project.id)`。
  2. `ProjectDetailView.currentBidSummary` 从当前有效 `ProjectBidCommercialProcess` 投影 `bidProcessId`、`bidStatus`、`resultStatus`、`summary`。
  3. 无当前 process 时继续返回 `not_configured`，保持既有空态语义。
  4. `ProjectDetail` 单测覆盖后端提供真实投标摘要时不再显示“投标详情暂未接入正式事实源”。
- 本次明确不做:
  1. 不新增 public route、DTO 字段、OpenAPI schema、generated client 或 DDL。
  2. 不把详情页摘要扩展为完整投标工作区。
  3. 不新增竞标写动作、审批或材料明细展示。

## 2. 一致性结论

| Concern                    | Conclusion                                                           | Result       |
| -------------------------- | -------------------------------------------------------------------- | ------------ |
| Document -> code           | 实现范围与 `EX-29` G1 一致，只修正 `currentBidSummary` 事实源。      | Pass         |
| Route inventory -> route   | 复用 `GET /projects/{id}`，无新增 route surface。                    | Pass         |
| Query -> view              | 详情 query 读取当前有效 bid process；前端只展示既有 `summary` 字段。 | Pass         |
| DTO / contract             | 未新增或变更 `ProjectDetailBidSummary` 字段。                        | Pass         |
| OpenAPI / generated client | Contract 未变，不需要 generate/check。                               | Not required |
| Persistence                | 未改 migration、entity、repository 或 DDL。                          | Not required |

## 3. 测试与校验

| Check                  | Required | Command / Evidence                                                                            | Result       | Gap / Reason                                     |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| API focused tests      | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts` | Pass         | `1 suite / 24 tests`                             |
| Admin focused tests    | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail.spec.ts`      | Pass         | `1 suite / 11 tests`                             |
| API lint               | Yes      | `corepack pnpm nx lint poms-api`                                                              | Pass         |                                                  |
| Admin lint             | Yes      | `corepack pnpm nx lint poms-admin`                                                            | Pass         |                                                  |
| Admin build            | Yes      | `corepack pnpm nx build poms-admin`                                                           | Pass         | initial total `957.54 kB`; no new bundle warning |
| OpenAPI / client check | No       | N/A                                                                                           | Not required | no schema / route change                         |
| Migration check        | No       | N/A                                                                                           | Not required | no persistence change                            |
| Markdown format        | Yes      | `corepack pnpm run format:md:check`                                                           | Pass         | docs touched                                     |
| Diff hygiene           | Yes      | `git diff --check`                                                                            | Pass         |                                                  |

## 4. Drift 与例外

- Drift classification: `none`
- New drift introduced: `none`
- `EX18-E1-BID-SUMMARY`: ready to close at `EX-29 G4` after commit evidence exists.

## 5. 决策

- Can commit to main: `yes`.
- Can mark tracker `Done`: `no`, 需要用户提交后进入 `G4`。
- Can close `EX18-E1-BID-SUMMARY`: `yes`, at `EX-29 G4` after commit evidence exists.
