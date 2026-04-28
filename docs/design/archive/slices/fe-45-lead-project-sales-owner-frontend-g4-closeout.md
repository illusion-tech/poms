# FE-45 Lead / Project 销售主责前端收口 G4 Close-Out

- Gate Status: `G4 = Done`
- Parent: `EX-41`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Closed At: `2026-04-29`
- Commit: `7d80276 feat(commission): 完成 FE-45 销售负责人前端迁移闭环`
- Baseline: `docs/design/fe-45-lead-project-sales-owner-frontend-baseline.md`
- G3 Checkpoint: `docs/design/fe-45-lead-project-sales-owner-frontend-g3-checkpoint.md`

## 1. Delivered Boundary

`FE-45` 已交付 Lead / Project 销售主责前端闭环:

1. 线索登记弹窗显式选择销售主责和主责组织，默认当前登录用户与主组织，并提交 `CreateLeadRequest.ownerUserId / ownerOrgId`。
2. 线索列表、详情、确认有效和转项目入口统一使用“销售主责 / 主责组织”口径，避免把登记人、确认人或转化人误认为业务负责人。
3. 转项目弹窗展示将被项目继承的销售主责，不修改 `ConvertLeadToProjectRequest`。
4. 项目详情消费 `ProjectDetailView.allowedActions` 的 `reassign-project-owner`，只在后端允许时展示“变更销售主责”入口。
5. `ProjectStore.reassignProjectOwner` 通过 generated client 调用 `projectControllerReassignOwner`，提交目标 owner、原因和 `rowVersion`。
6. focused unit 与 targeted Playwright journey 覆盖登记、确认有效、转项目继承展示和项目详情受控变更入口。

本片未新增 public route、未修改 OpenAPI / persistence，也未把 `owner*` 纳入普通项目基础信息编辑。

## 2. Validation Evidence

沿用 `docs/design/fe-45-lead-project-sales-owner-frontend-g3-checkpoint.md` 的 G3 证据:

- focused lead tests: 7 passed
- focused project detail tests: 22 passed
- focused project store tests: 7 passed
- `poms-admin` lint / build: pass
- `admin-data-access` lint: pass
- `poms-api:seeder-run`: pass
- targeted Playwright lead bootstrap journey: 3 passed
- Markdown format and diff hygiene: pass

## 3. Exception Status

| Exception ID                                 | Status          | Notes                                                                                         |
| -------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------- |
| `FE45-E1-CONVERSION-OWNER-OVERRIDE-DEFERRED` | Open downstream | 转项目仍只展示继承 owner；若后续需要当场覆盖，必须先补 DTO / 审计设计。                       |
| `FE45-E1-BROWSER-SCOPE`                      | Closed          | targeted Playwright journey 已覆盖本片关键入口，无需继续以 unit-only 证据替代浏览器入口验证。 |

## 4. Downstream Readiness

| Downstream           | Readiness   | Notes                                                             |
| -------------------- | ----------- | ----------------------------------------------------------------- |
| Lead registration    | Ready       | 登记时可明确线索销售主责，登记人继续保留为审计操作者。            |
| Lead to Project      | Ready       | 转项目前可看见将被继承的项目销售主责。                            |
| Project detail       | Ready       | 项目创建后可通过受控命令变更销售主责。                            |
| Conversion owner DTO | Future only | 不阻断当前闭环；只在业务需要转项目当场覆盖时另起设计 / 实现切片。 |

## 5. G4 Conclusion

- `FE-45` 可标记为 `Done / G4`。
- `EX-41` 的前后端执行链已完成闭环。
- `FE45-E1-CONVERSION-OWNER-OVERRIDE-DEFERRED` 继续作为后续 DTO 决策留存，不阻断本片关闭。
