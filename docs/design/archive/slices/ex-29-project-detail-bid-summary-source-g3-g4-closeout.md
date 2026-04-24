# EX-29 项目详情投标摘要事实源纠偏 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Parent: `EX-18`
- Owner: `Codex`
- Slice Type: `query-behavior + frontend-consumer-test`
- Date: `2026-04-25`
- Baseline: `docs/design/archive/slices/ex-29-project-detail-bid-summary-source-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-29-project-detail-bid-summary-source-g3-checkpoint.md`
- Runtime Commit: `b9057e7 fix(project): 用当前投标事实源修正项目详情投标摘要`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-29`

## 1. Delivered Scope

- 项目详情投标摘要已接入真实事实源:
  - `ProjectQueryService.getProjectDetail` 读取当前有效 `ProjectBidCommercialProcess`。
  - `ProjectDetailView.currentBidSummary` 投影 `bidProcessId`、`bidStatus`、`resultStatus`、`summary`。
  - 无当前竞标 process 时继续返回 `not_configured`，保留既有业务空态。
- 项目详情前端消费边界已验证:
  - 后端提供真实投标摘要时，详情页展示 `summary`。
  - 不再显示“投标详情暂未接入正式事实源”。

## 2. Out Of Scope

- 未新增 public API route、DTO 字段、OpenAPI schema、generated client 或 DDL。
- 未把 `currentBidSummary` 扩展为完整 `ProjectBidCommercialWorkspaceView`。
- 未新增竞标写动作、审批、材料明细或时间线展示。
- 未修改签约前 `bid-commercial` 工作区页面。

## 3. Alignment

| Area                       | Result         | Notes                                                                |
| -------------------------- | -------------- | -------------------------------------------------------------------- |
| Document -> code           | `Pass`         | Delivered scope matches `EX-29` G1 baseline.                         |
| Route inventory -> route   | `Pass`         | Reused `GET /projects/{id}`; no new route surface.                   |
| Query -> view              | `Pass`         | Detail query now projects current bid process into existing summary. |
| DTO / contract             | `Pass`         | `ProjectDetailBidSummary` shape unchanged.                           |
| OpenAPI / generated client | `Not required` | No route or schema change.                                           |
| Persistence                | `Not required` | No migration, entity, repository, or DDL change.                     |

## 4. Validation

| Check               | Result | Evidence                                                                                                             |
| ------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Runtime commit      | `Pass` | `b9057e7 fix(project): 用当前投标事实源修正项目详情投标摘要`                                                         |
| API focused tests   | `Pass` | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts` (`1 suite / 24 tests`) |
| Admin focused tests | `Pass` | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail.spec.ts` (`1 suite / 11 tests`)      |
| API lint            | `Pass` | `corepack pnpm nx lint poms-api`                                                                                     |
| Admin lint          | `Pass` | `corepack pnpm nx lint poms-admin`                                                                                   |
| Admin build         | `Pass` | `corepack pnpm nx build poms-admin`; initial total `957.54 kB`; no new bundle warning                                |
| Markdown format     | `Pass` | `corepack pnpm run format:md:check`                                                                                  |
| Diff hygiene        | `Pass` | `git diff --check`                                                                                                   |

## 5. Drift 与例外

- Drift classification: `none`
- New drift introduced: `none`

| Exception ID          | Previous Status | G4 Status | Closure Evidence                                                                                         |
| --------------------- | --------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `EX18-E1-BID-SUMMARY` | Open            | Closed    | `ProjectDetailView.currentBidSummary` now reads current `ProjectBidCommercialProcess`; commit `b9057e7`. |

## 6. G4 Conclusion

- `EX-29` delivered boundary matches the frozen baseline and G3 checkpoint.
- Runtime changes are committed in `b9057e7`.
- `EX18-E1-BID-SUMMARY` is closed.
- Tracker can mark `EX-29` as `Done / G4 04-25` and clear the `EX-18` exception column.
