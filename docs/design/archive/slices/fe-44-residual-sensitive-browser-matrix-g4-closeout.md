# FE-44 残余敏感字段投影与浏览器权限矩阵验证 G4 Close-out

- Task ID: `FE-44`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation / browser regression / governance validation
- Baseline: `docs/design/archive/slices/fe-44-residual-sensitive-browser-matrix-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-44-residual-sensitive-browser-matrix-g3-checkpoint.md`
- Implementation Commit: `8073c3d docs(governance): 完成 FE-44 残留敏感字段前端浏览矩阵闭环`

---

## 1. G4 结论

`FE-44` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. `L4` / `L5` residual scalar 字段已完成定向敏感性复审。
2. `EX37C2-R1-NON-AMOUNT-NARRATIVE-SCOPE` 已关闭：当前 residual scalar 属于经营解释、结算条件、gate 归因或阻断说明，不属于第一批敏感金额 / 税务 / 毛利 / 提成字段包。
3. `ProjectWorkspaceStore` focused spec 已清退旧 L5 scalar fixture，使用当前 generated projection 字段。
4. targeted Playwright 覆盖 admin 登录后从项目菜单 / 项目列表 / 工作区入口进入 `L4` / `L5` 关键读取页。
5. targeted Playwright 覆盖 projection `full` / `masked` 渲染、viewer 受限 direct URL 和 anonymous returnUrl。
6. 本片未新增后端 API、generated client、permission key、guard、DDL、entity 或 migration。

---

## 2. 提交证据

| Evidence              | Result                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Implementation commit | `8073c3d docs(governance): 完成 FE-44 残留敏感字段前端浏览矩阵闭环`                          |
| Baseline              | `docs/design/archive/slices/fe-44-residual-sensitive-browser-matrix-baseline.md`             |
| G3 checkpoint         | `docs/design/archive/slices/fe-44-residual-sensitive-browser-matrix-g3-checkpoint.md`        |
| Frontend store spec   | `apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts`                   |
| Browser matrix        | `apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts`                      |
| Tracker / progress    | `docs/design/phase2-development-execution-tracker.md`、`docs/design/poms-design-progress.md` |

---

## 3. G3 验证回放

| Check                      | Command                                                                                                                                                                             | Result                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Focused store spec         | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts --runInBand`                                                  | Pass, 26 tests                                                        |
| `poms-admin` lint          | `corepack pnpm nx lint poms-admin`                                                                                                                                                  | Pass                                                                  |
| `poms-admin` build         | `corepack pnpm nx build poms-admin`                                                                                                                                                 | Pass                                                                  |
| Targeted Playwright matrix | `POMS_E2E_PORT_SEED=544 corepack pnpm exec playwright test apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | Pass, 7 tests                                                         |
| `poms-admin-e2e` lint      | Project config inspection                                                                                                                                                           | Not configured; no lint target in `apps/poms-admin-e2e/project.json`. |
| Markdown check             | `corepack pnpm run format:md:check`                                                                                                                                                 | Pass                                                                  |
| Diff whitespace            | `git diff --check`                                                                                                                                                                  | Pass                                                                  |

---

## 4. Drift 与例外

| Item                             | Status          | Decision                                                                   |
| -------------------------------- | --------------- | -------------------------------------------------------------------------- |
| `EX37C2-R1-NON-AMOUNT-NARRATIVE` | Closed at G3/G4 | residual scalar 字段已复审为非第一批敏感金额 / 提成字段包。                |
| `FE44-R1-FOCUSED-BROWSER-MATRIX` | Closed at G3/G4 | targeted browser matrix 覆盖本片入口链、projection 和权限边界。            |
| `EX37C1-R3-SUMMARY-GRANULARITY`  | Open downstream | L4 混合摘要字符串按 `operating-finance` 字段包整体遮罩；摘要裁剪另案治理。 |
| `EX37C2-R2-EVENT-VOLUME`         | Open downstream | 逐字段 masked event 批量降噪属于后端审计优化，不由 `FE-44` 关闭。          |
| Public API / generated client    | No change       | 未改 route、DTO、OpenAPI 或 generated client。                             |
| Persistence / migration          | No change       | 未改 DDL、entity、repository 或 migration。                                |
| Compatibility strategy           | Not applicable  | 当前仍处开发期；本片不保留兼容层，不做旧 scalar fallback。                 |

---

## 5. Parent Close-out

`EX-37C` 父任务可以关闭为 `Done / G4`：

1. `EX-37C1` 已关闭 `L4` `operating-finance` projection-only 后端投影与基础前端消费。
2. `EX-37C2` 已关闭 `L5` `commission-compensation` / `operating-finance` projection-only 后端投影与基础前端消费。
3. `FE-44` 已关闭 residual sensitive review 与 targeted browser matrix。

`EX37C1-R3-SUMMARY-GRANULARITY` 与 `EX37C2-R2-EVENT-VOLUME` 保留为下游治理优化项，不阻塞 `EX-37C` 父任务关闭。

---

## 6. 下游承接

后续只剩敏感投影治理的优化项：

1. `EX37C1-R3-SUMMARY-GRANULARITY`：如需把混合摘要拆成更细粒度字段包，另开后端 contract / projection 切片。
2. `EX37C2-R2-EVENT-VOLUME`：如需减少列表 projection 产生的逐字段 masked event 量，另开后端审计批量降噪切片。
