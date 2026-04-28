# FE-45A 销售主责候选只读接口与前端候选源修复 G3 Checkpoint

- Gate Status: `G3 = Pass`
- Parent: `FE-45`
- Owner: `Codex`
- Slice Type: `cross-layer corrective`
- Checkpoint Date: `2026-04-29`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-45A`
- Runtime Commit: `9b6fcb9 feat(project): 完成 FE-45A 销售负责人候选查询闭环`

## 1. Problem Summary

用户验收发现登记线索时“销售主责 / 主责组织”下拉没有选项。

根因是 `FE-45` 前端复用了 `PlatformStore.loadUsers()` 与 `loadOrgUnits()`，这两个接口受 `platform:users:manage` / `platform:org-units:manage` 保护；销售账号通常只有 `lead:write` / `project:write`，因此候选读取被后端拒绝，页面只能得到空列表。

直接放开平台管理用户列表不合理，因为 `PlatformUserSummary` 包含邮箱、电话、角色名等平台管理字段。本修复新增最小只读候选接口。

## 2. Delivered Boundary

1. 新增 `OwnerReferenceUser` / `OwnerReferenceOrgUnit` / `OwnerReferenceData` 契约，只暴露 owner 选择所需字段。
2. 新增 `GET /platform/owner-reference`，权限为任一满足: `lead:write`、`project:write`、`platform:users:manage`、`platform:org-units:manage`。
3. 新增 `HasAnyPermissions` guard metadata，保留既有 `HasPermissions` 全量满足语义。
4. `PlatformStore` 新增 `loadOwnerReferenceData()` 与 owner reference signals。
5. 线索登记和项目详情销售主责变更均切换到 owner reference 候选源，不再消费平台管理用户 / 组织列表。
6. Playwright 增加销售账号无平台管理权限时下拉可见的回归用例。

## 3. Alignment Evidence

| Boundary                  | Result | Evidence                                                                                   |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Route inventory           | Pass   | `api-route-canonical-inventory.md` 已登记 `GET /platform/owner-reference`。                |
| DTO / OpenAPI             | Pass   | `interface-openapi-dto-design.md` 已冻结 owner reference 最小字段集。                      |
| Permission boundary       | Pass   | `HasAnyPermissions` 只用于候选只读 route，不改变既有 `HasPermissions` 行为。               |
| Generated client          | Pass   | `platformControllerListOwnerReferenceData` 已生成并由 `PlatformStore` 消费。               |
| Frontend owner selectors  | Pass   | Lead registration 与 Project detail reassignment 均改为消费 `ownerUsers / ownerOrgUnits`。 |
| Sensitive platform fields | Pass   | 候选 DTO 不包含 `email`、`phone`、`roleNames`、审计时间或平台管理详情。                    |

## 4. Validation

| Check                    | Result | Command / Evidence                                                                                                                                                                                                                     |
| ------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI client generate  | Pass   | `corepack pnpm nx run shared-api-client:generate`                                                                                                                                                                                      |
| Generated client check   | Pass   | `corepack pnpm nx run shared-api-client:check`                                                                                                                                                                                         |
| Permission guard tests   | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=permissions.guard`，4 passed                                                                                                                                            |
| Platform controller test | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=platform.controller`，24 passed                                                                                                                                         |
| Platform service test    | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=platform.service`，55 passed                                                                                                                                            |
| Lead focused tests       | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`，7 passed                                                                                                                                                  |
| Project focused tests    | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`，22 passed                                                                                                                                            |
| API lint / build         | Pass   | `corepack pnpm nx lint poms-api`; `corepack pnpm nx build poms-api`                                                                                                                                                                    |
| Admin lint / build       | Pass   | `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access`; `corepack pnpm nx build poms-admin`                                                                                                                     |
| Browser regression       | Pass   | `$env:POMS_E2E_PORT_SEED='548'; corepack pnpm exec playwright test apps/poms-admin-e2e/src/lead-bootstrap.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts --grep "sales writer can load owner candidates"`，1 passed |

## 5. Drift Classification

| Drift ID                        | Class            | Status | Notes                                                                                                     |
| ------------------------------- | ---------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `FE45A-D1-OWNER-CANDIDATE-AUTH` | `new-real-drift` | Fixed  | `FE-45` 误把业务 owner 候选读取绑定到平台管理权限，导致销售账号下拉为空。                                 |
| `FE45A-D2-PLAYWRIGHT-WEBSERVER` | `tool-noise`     | Open   | Playwright webServer 输出 `NX Daemon is not running` 与 inspector `9229` 占用提示；目标浏览器用例已通过。 |

## 6. G3 Conclusion

- Gate Status: `Pass`
- Commit / G4 Status: closed by `9b6fcb9` and `docs/design/archive/slices/fe-45a-owner-reference-candidates-g4-closeout.md`
- Conditions:
  1. `FE-45A` 已从 `Doing / G3` 推进到 `Done / G4`。
  2. `GET /platform/owner-reference` 保持只读最小字段，不得扩展为平台用户管理列表替代品。
