# FE-36 签约前竞标 / 报价版本历史与审计呈现 G3/G4 收口

- Gate Status: `G4 = Done`
- Task ID: `FE-36`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Close-out Date: `2026-04-27`
- Runtime Commit: `d5fe91a`
- Baseline: `docs/design/archive/slices/fe-36-presigning-version-history-audit-frontend-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-36-presigning-version-history-audit-frontend-g3-checkpoint.md`

## 1. Delivered Boundary

已交付:

1. `ProjectWorkspaceStore` 已接入:
   - `loadBidCommercialProcessHistory(projectId)`
   - `loadPricingMarginReviewHistory(projectId)`
   - bid-commercial / pricing-margin history selectors、loading state 与 error state
2. `createBidCommercialProcess` 与 `createPricingMarginReview` 成功后刷新当前 workspace projection 和历史列表。
3. 新增共享 `WorkspaceVersionHistory`，统一页内版本历史表格、替代链摘要、empty / loading / error state 和 PrimeNG table / tag 模式。
4. `/projects/:id/workspace/bid-commercial` 已展示竞标过程版本历史、当前 / 历史标记、`effective` / `superseded` 状态、过程阶段、参与决策、竞标结果、effective / created metadata、操作人 ID、替代关系与 `rowVersion`。
5. `/projects/:id/workspace/pricing-margin` 已展示报价评审版本历史、当前 / 历史标记、`effective` / `superseded` 状态、报价版本、毛利判断、评审结论、effective / created metadata、操作人 ID、替代关系与 `rowVersion`。
6. G1 baseline 与 G3 checkpoint 均已归档，tracker 与 progress 已回写。

未交付且仍按基线保持:

1. 不新增后端 API、OpenAPI、generated client、DTO、数据库表或 DDL。
2. 不实现字段级 diff。
3. 不实现恢复旧版本、回滚、删除历史版本或切换 current version。
4. 不新增独立审计中心或全局 audit timeline。
5. 不做操作人姓名 enrichment；首版只展示 `createdBy` / `updatedBy` ID 或空值 fallback。

## 2. Validation

验证证据见 FE-36 G3 checkpoint。

补充 G4 证据:

| Check           | Result | Evidence                                                        |
| --------------- | ------ | --------------------------------------------------------------- |
| Runtime commit  | Pass   | `d5fe91a` 已提交 FE-36 运行时代码、G1 baseline 与 G3 checkpoint |
| Tracker update  | Pass   | `FE-36` 标记为 `Done / G4`                                      |
| Progress update | Pass   | `poms-design-progress.md` 已补 G4 收口记录                      |
| Exception close | Pass   | `FE34-E3-HISTORY-LIST-NOT-PRIMARY` 已由 FE-36 实现关闭          |

## 3. Drift And Exceptions

| Item                                          | G4 Status | Evidence                                                                                    |
| --------------------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `FE34-E3-HISTORY-LIST-NOT-PRIMARY`            | Closed    | bid-commercial / pricing-margin 两个工作区均已实现历史版本列表、替代链摘要与审计 metadata。 |
| `FE36-E1-ACTOR-DISPLAY-NAME-OUT-OF-SCOPE`     | Accepted  | DTO 只提供 actor ID，首版页面明确标注为操作人 ID；姓名 enrichment 需未来后端 / 用户投影片。 |
| `FE36-E2-NO-DIFF-COMPARISON`                  | Accepted  | 首版只展示版本链和 metadata；字段级 diff 如需要应另开审计增强切片。                         |
| `FE36-E3-NO-RESTORE-COMMAND`                  | Accepted  | 当前后端只支持 append replacement；restore / revert 需未来后端 command 切片。               |
| `section-card` projection wrapper             | Closed    | 初版共享组件投影标题未渲染，已改为直接 card 结构。                                          |
| PrimeNG table mutable input                   | Closed    | `p-table` mutable value input 类型问题已修复。                                              |
| Store fixture non-null assertion lint warning | Closed    | 测试 fixture 已改为显式 guard，无 lint warning。                                            |

## 4. Conclusion

`FE-36` 已完成提交后 G4 收口。签约前竞标 / 报价两个工作区现在可以在当前项目上下文中读取历史版本、替代链和基础审计 metadata，且未扩大到后端契约、字段级 diff、restore command 或 actor display-name enrichment。

后续若需要更完整审计体验，应拆为独立切片处理:

1. actor display-name / user projection enrichment
2. 字段级版本 diff
3. restore / revert / re-activate command
4. 全局 audit timeline
