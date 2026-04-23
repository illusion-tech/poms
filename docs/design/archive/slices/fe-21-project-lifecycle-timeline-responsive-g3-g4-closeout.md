# FE-21 项目生命周期响应式与细节提示 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `frontend-only`
- Owner: `Codex`
- Date: 2026-04-23
- Baseline: `docs/design/fe-21-project-lifecycle-timeline-responsive-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `FE-21`

## 1. Delivered Scope

- `ProjectLifecycleTimeline` 保持 PrimeNG 组件优先基线，并补齐:
  - 桌面端横向阶段线改为组件自有 rail，确保 marker、标题、描述、tag 位于同一阶段单元中心列。
  - 窄屏端保留 PrimeNG `p-timeline` 纵向阶段线，避免蛇形折行。
  - 横向一行可展示时通过内部 `margin-inline: auto` 居中。
  - 阶段 marker、标题、描述、tag 按同一阶段单元居中。
  - 已完成节点支持 Tooltip / aria label 细节提示。
- `ProjectLifecycleTimelineItem` 新增可选展示字段:
  - `detail`
  - `completedAtLabel`
  - `tooltip`
- 新增 `project-lifecycle-timeline.spec.ts`，覆盖:
  - 横向 / 纵向结构存在。
  - 横向每个 label 与 marker 保持在同一个 stage node 内。
  - 完成节点完成时间展示和 marker aria label。
  - done / current / pending 状态 class。

## 2. Out Of Scope

- 未修改 API、OpenAPI、generated client、DTO、route surface、权限 guard 或 store 读取语义。
- 未新增阶段完成时间事实源；当前项目详情仍不展示伪造完成时间。
- 未新增 E2E 或视觉截图门禁。
- 未扩展到其它工作区组件或操作页。

## 3. Drift 判断

| Area                       | Result         | Notes                                                                             |
| -------------------------- | -------------- | --------------------------------------------------------------------------------- |
| Document -> code           | `Pass`         | 横向 `p-timeline` content slot 导致文字落在节点间，已修正为组件 rail 并回写基线。 |
| Query -> view              | `Pass`         | 仍只消费 `ProjectDetailView.stageSummary`。                                       |
| Guard / permission         | `Pass`         | 未改变权限语义。                                                                  |
| OpenAPI / generated client | `Not required` | 未触及 contract。                                                                 |
| Bundle                     | `Pass`         | `poms-admin` build 通过，initial total `930.67 kB`，无新 bundle warning。         |

## 4. Validation

| Check      | Result | Evidence                                                               |
| ---------- | ------ | ---------------------------------------------------------------------- |
| Diff check | `Pass` | `git diff --check`                                                     |
| Lint       | `Pass` | `corepack pnpm nx lint poms-admin`                                     |
| Build      | `Pass` | `corepack pnpm nx build poms-admin`                                    |
| Unit tests | `Pass` | `corepack pnpm nx test poms-admin --runInBand`（13 suites / 42 tests） |
| E2E        | `N/A`  | 不改入口链、权限、路由或业务流程。                                     |

## 5. Notes

- 初版组件样式超过 Angular component style budget 783 bytes；已压缩语义 class 与非关键样式，最终 build 无 warning。
- 用户视觉复核发现横向标签落在两个节点之间；根因是 PrimeNG horizontal timeline 的 content slot 与 marker 中心列不一致。该问题已作为 `FE-21` 本片内实现 drift 修正：横向改为组件自有 rail，纵向仍保留 PrimeNG Timeline。
- `FE21-E1-COMPLETION-TIME-SOURCE` 已由 `EX-22` + `FE-22` 关闭当前可用事实范围：完成时间 UI 字段已经消费 `ProjectTimelineView`；验收 / 完成 / 归档等缺失阶段仍按后续事实源切片处理。
- `FE21-E2-VISUAL-SNAPSHOT-GAP` 保留：本片未新增浏览器截图级视觉回归门禁。

## 6. G4 Conclusion

- `FE-21` delivered boundary matches the baseline.
- 项目生命周期组件已经具备横向节点文字同列居中、响应式、纵向窄屏展示和完成节点提示能力。
- 后续若要展示真实完成时间，应先补阶段历史或项目详情 query 事实源。
