# FE-33 合同创建项目选择器与合同上下文体验 G3/G4 收口

- Gate Status: `G4 = Done`
- Parent: `FE-30`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Close-out Date: `2026-04-26`
- Runtime Commit: `b2ff12a`
- Baseline: `docs/design/archive/slices/fe-33-contract-project-picker-frontend-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-33-contract-project-picker-frontend-g3-checkpoint.md`

## 1. Delivered Boundary

已交付:

1. 合同创建弹窗已从项目 UUID 输入改为 PrimeNG AutoComplete 项目选择器。
2. 项目选择器复用既有 `GET /projects` / `ProjectStore.loadProjects()`，不新增 public API。
3. 选择项目后展示项目编号、项目名称、客户、客户项目编号、阶段和状态。
4. 创建合同请求仍只提交 selected project `id`、客户合同编号、金额和币种。
5. focused component tests 与合同管理菜单入口 Playwright 已通过。

未交付且仍按基线保持:

1. 合同编辑不支持改关联项目。
2. 不新增服务端项目搜索 / 分页 query。
3. 不改变合同状态流转、审批、生效或资金条款。

## 2. Validation

验证证据见 FE-33 G3 checkpoint。

补充 G4 证据:

| Check          | Result | Evidence                    |
| -------------- | ------ | --------------------------- |
| Runtime commit | Pass   | `b2ff12a` 已提交 FE-33 改动 |
| Tracker update | Pass   | `FE-33` 标记为 `Done / G4`  |
| Exception      | Pass   | `FE30-E2` 与 `FE33-E1` 关闭 |

## 3. Exceptions Closed

| Exception ID                               | G4 Status | Evidence                                                          |
| ------------------------------------------ | --------- | ----------------------------------------------------------------- |
| `FE30-E2-CONTRACT-PROJECT-PICKER-DEFERRED` | Closed    | 合同创建已由项目选择器替代项目 UUID 输入，并展示项目上下文。      |
| `FE33-E1-CLIENT-SIDE-PROJECTS`             | Closed    | 本片接受现有 `GET /projects` 客户端过滤；未来规模问题另开 query。 |

## 4. Conclusion

`FE-33` 已完成提交后 G4 收口，可作为合同创建项目选择体验的稳定输入。
