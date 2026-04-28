# FE-45A 销售主责候选只读接口与前端候选源修复 G4 Close-Out

- Gate Status: `G4 = Done`
- Parent: `FE-45`
- Owner: `Codex`
- Slice Type: `cross-layer corrective`
- Closed At: `2026-04-29`
- Commit: `9b6fcb9 feat(project): 完成 FE-45A 销售负责人候选查询闭环`
- G3 Checkpoint: `docs/design/fe-45a-owner-reference-candidates-g3-checkpoint.md`

## 1. Delivered Boundary

`FE-45A` 已关闭销售账号登记线索时销售主责 / 主责组织下拉为空的问题:

1. `GET /platform/owner-reference` 已落地，作为 Lead / Project owner 选择的最小只读候选接口。
2. `OwnerReferenceUser` / `OwnerReferenceOrgUnit` / `OwnerReferenceData` 已进入 shared contract、OpenAPI 与 generated client。
3. `HasAnyPermissions` 已落地，允许候选只读接口在 `lead:write`、`project:write`、`platform:users:manage`、`platform:org-units:manage` 任一权限满足时访问。
4. `PlatformStore.loadOwnerReferenceData()` 已替代前端 owner 选择场景中的平台管理用户 / 组织列表读取。
5. 线索登记和项目详情销售主责变更均消费 owner reference 候选源，不再依赖平台管理权限。
6. Playwright 已覆盖 `sales_rep` 无平台管理权限时登记线索下拉候选可见。

本片未放宽 `GET /platform/users` 或 `GET /platform/org-units` 的平台管理权限，也未把邮箱、电话、角色名等平台管理字段暴露给业务 owner 候选下拉。

## 2. Validation Evidence

沿用 `docs/design/fe-45a-owner-reference-candidates-g3-checkpoint.md` 的 G3 证据:

- OpenAPI client generate / check: pass
- permission guard tests: 4 passed
- platform controller tests: 24 passed
- platform service tests: 55 passed
- lead focused tests: 7 passed
- project focused tests: 22 passed
- `poms-api` lint / build: pass
- `poms-admin` lint / build: pass
- `admin-data-access` lint: pass
- targeted Playwright sales writer regression: 1 passed
- full lead bootstrap Playwright journey: 4 passed
- Markdown format and diff hygiene: pass

## 3. Exception Status

| Exception / Drift ID            | Status   | Notes                                                                                                  |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `FE45A-D1-OWNER-CANDIDATE-AUTH` | Closed   | owner 候选读取已从平台管理列表拆出，销售账号可通过业务写权限读取候选。                                 |
| `FE45A-D2-PLAYWRIGHT-WEBSERVER` | Accepted | Playwright webServer 的 `NX Daemon` 与 inspector `9229` 输出属于本地工具噪声；目标浏览器用例均已通过。 |

## 4. Downstream Readiness

| Downstream                 | Readiness | Notes                                              |
| -------------------------- | --------- | -------------------------------------------------- |
| Lead registration          | Ready     | 销售账号可在登记线索时读取销售主责和主责组织候选。 |
| Project owner reassignment | Ready     | 项目详情变更销售主责入口复用同一候选源。           |
| Platform management lists  | Unchanged | 平台用户 / 组织管理列表仍受平台管理权限保护。      |

## 5. G4 Conclusion

- `FE-45A` 可标记为 `Done / G4`。
- `FE-45` 的用户验收缺陷已关闭。
- owner reference 接口后续不得扩展为平台用户管理列表替代品。
