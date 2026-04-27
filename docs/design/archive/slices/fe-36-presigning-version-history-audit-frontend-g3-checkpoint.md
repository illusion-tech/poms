# FE-36 签约前竞标 / 报价版本历史与审计呈现 G3 Checkpoint

- Gate Status: `G3 = Pass / G4 Pending Commit`
- Task ID: `FE-36`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- G3 Date: `2026-04-27`
- Baseline: `docs/design/archive/slices/fe-36-presigning-version-history-audit-frontend-baseline.md`

## 1. Delivered Boundary

已完成:

1. `ProjectWorkspaceStore` 新增 bid-commercial process history 与 pricing-margin review history 的 read state:
   - `bidCommercialProcessHistory`
   - `pricingMarginReviewHistory`
   - `loadingBidCommercialHistory`
   - `loadingPricingMarginHistory`
   - `bidCommercialHistoryError`
   - `pricingMarginHistoryError`
   - `loadBidCommercialProcessHistory(projectId)`
   - `loadPricingMarginReviewHistory(projectId)`
2. `createBidCommercialProcess` 与 `createPricingMarginReview` 在提交成功后同步刷新 workspace projection 与历史列表。
3. 新增共享 `WorkspaceVersionHistory` UI 组件，统一版本历史表格、替代链摘要、loading / empty / error state 和 PrimeNG table 基线。
4. `/projects/:id/workspace/bid-commercial` 已展示竞标版本历史:
   - current / historical 标记
   - `effective` / `superseded` 状态
   - 过程阶段、参与决策、竞标结果
   - effective / created metadata
   - `createdBy` / `updatedBy` 操作人 ID fallback
   - `supersedesId` 替代关系与 `rowVersion`
5. `/projects/:id/workspace/pricing-margin` 已展示报价评审版本历史:
   - current / historical 标记
   - `effective` / `superseded` 状态
   - 报价版本、毛利判断、评审结论
   - effective / created metadata
   - `createdBy` / `updatedBy` 操作人 ID fallback
   - `supersedesId` 替代关系与 `rowVersion`

未纳入:

1. 未新增后端 API、OpenAPI、generated client、DTO 或 DDL。
2. 未实现字段级 diff。
3. 未实现 restore / revert / re-activate command。
4. 未新增全局审计中心。
5. 未做 actor display-name enrichment；页面明确按操作人 ID 显示。

## 2. Consistency Evidence

| Edge                   | Result | Evidence                                                                                                    |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Document -> code       | Pass   | 实现遵循 FE-36 G1：只做签约前 bid/pricing 历史版本与审计 metadata 呈现。                                    |
| Route inventory -> API | Pass   | 只消费已 aligned 的 existing list routes；无 public route surface 变更。                                    |
| DTO / contract -> view | Pass   | 页面 view model 只从 generated summary DTO 派生；未新造 wire contract。                                     |
| Query -> view          | Pass   | Store 使用 generated `ProjectApi` list methods；页面消费 store selectors。                                  |
| Guard / permission     | Pass   | 历史列表为 read-only；未新增写权限判断、未绕过既有 route guard 或 workspace `allowedActions`。              |
| UI consistency         | Pass   | 版本历史统一走共享 `WorkspaceVersionHistory`，底层使用 PrimeNG table / tag 和既有 Workspace feedback/grid。 |

## 3. Validation

| Check                | Required | Result | Evidence                                                                                                     |
| -------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| Bid page unit        | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-bid-commercial-workspace`，5 passed |
| Pricing page unit    | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pricing-margin-workspace`，5 passed |
| Store unit           | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`，26 passed         |
| Admin lint           | Yes      | Pass   | `corepack pnpm nx lint poms-admin`                                                                           |
| Data-access lint     | Yes      | Pass   | `corepack pnpm nx lint admin-data-access`                                                                    |
| Admin build          | Yes      | Pass   | `corepack pnpm nx build poms-admin`                                                                          |
| Markdown check       | Yes      | Pass   | `corepack pnpm run format:md:check`                                                                          |
| Diff whitespace      | Yes      | Pass   | `git diff --check`                                                                                           |
| OpenAPI/client check | No       | N/A    | Frontend-only；无 OpenAPI / generated client 变更。                                                          |
| Migration check      | No       | N/A    | 无 DDL。                                                                                                     |
| E2E                  | No       | N/A    | 未改变路由、菜单入口或权限路径；本片新增页内 read-only sections，已由 focused page tests 与 build 覆盖。     |

## 4. Drift

| Item                              | Classification | Result                                                                                                   |
| --------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| `section-card` projection wrapper | `tool-noise`   | 初版共享组件把 `section-card` 的 content template 包入组件内部，测试 DOM 中标题未渲染；已改为直接 card。 |
| PrimeNG table mutable input       | `tool-noise`   | 初版 `rows` 使用 readonly array，Angular build 发现 `p-table` 需要 mutable array；已修复。               |
| Test non-null assertions          | `tool-noise`   | Store fixture 使用 non-null assertion 触发 lint warning；已改为显式 fixture guard。                      |

## 5. Exceptions

| Exception ID                              | G1 Status | G3 Status            | Notes                                                        |
| ----------------------------------------- | --------- | -------------------- | ------------------------------------------------------------ |
| `FE34-E3-HISTORY-LIST-NOT-PRIMARY`        | Accepted  | Ready to close at G4 | FE-36 已实现历史列表与审计 metadata 呈现，提交后可关闭。     |
| `FE36-E1-ACTOR-DISPLAY-NAME-OUT-OF-SCOPE` | Low       | Accepted / remains   | DTO 只提供 actor ID；首版页面按操作人 ID 展示。              |
| `FE36-E2-NO-DIFF-COMPARISON`              | Low       | Accepted / remains   | 首版显示版本链与 metadata，不显示字段级 diff。               |
| `FE36-E3-NO-RESTORE-COMMAND`              | Low       | Accepted / remains   | 现有后端只支持 append replacement，不支持 restore / revert。 |

## 6. G3 Conclusion

`FE-36` 本地实现满足 G3。提交后可做 G4 close-out，并关闭 `FE34-E3-HISTORY-LIST-NOT-PRIMARY`；`FE36-E1` / `FE36-E2` / `FE36-E3` 作为首版范围边界保留到未来独立增强切片。
