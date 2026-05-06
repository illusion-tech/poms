# FE-56 线索评分历史与人工覆盖前端入口收口

- Task ID: `FE-56`
- Slice type: `frontend-only`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `FE-56`
- Baseline: `docs/design/fe-56-lead-score-history-override-frontend-baseline.md`
- Status: `G4`
- Closed At: 2026-05-06

## 1. Delivered

1. `LeadStore` 新增 EX-54A generated client 包装方法，覆盖评分历史读取、覆盖提交、批准、驳回和撤销。
2. 线索列表突出 `effectiveScore/effectiveRating`，同时展示 `system` / `manual-override` 来源标识；人工覆盖时保留系统评分提示。
3. 线索详情将“评分评级”改为“当前有效评分”，并提供评分历史入口；人工覆盖时同时展示有效评分说明和系统评分说明。
4. 新增评分历史与人工覆盖对话框，展示系统评分、当前有效评分、pending override、active override、快照历史和覆盖记录。
5. 有 `lead:write` 权限且线索未关闭 / 未转项目时可提交覆盖申请；有 `lead:score:override` 权限时可批准、驳回或撤销，并使用 override `rowVersion` 做并发输入。
6. 保留硬闸口缺口提示，覆盖提交表单明确提示人工覆盖不会补齐确认有效或转项目硬闸口。

## 2. Validation

| Check                            | Result | Notes                                                                         |
| -------------------------------- | ------ | ----------------------------------------------------------------------------- |
| Focused frontend tests           | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`。 |
| Admin lint                       | Pass   | `corepack pnpm nx lint poms-admin`。                                          |
| Admin build                      | Pass   | `corepack pnpm nx build poms-admin`。                                         |
| Markdown format check            | Pass   | `corepack pnpm run format:md:check`。                                         |
| `git diff --check`               | Pass   | `git diff --check`。                                                          |
| API / OpenAPI / migration checks | N/A    | 本片不新增后端 route、OpenAPI、generated client 或 migration。                |

## 3. Remaining Risks

- 本片未新增专门的端到端浏览器用例；评分覆盖交互由 focused component tests 覆盖。
- `rating` 筛选仍按 EX-54 冻结语义代表系统评级；若业务需要按有效评级筛选，需要另拆显式 query / UI 需求。
- 评分历史对话框使用现有后端返回顺序展示；若后续需要时间线分组或审批任务中心，应另拆前端体验切片。

## 4. G4 结论

- Gate Status: `Pass`
- Closed At: 2026-05-06
- Delivered boundary matches FE-56: frontend-only, consume EX-54A generated client, no public route surface change.
