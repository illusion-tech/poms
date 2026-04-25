# EX-34A 项目归档记录撤销 / 替代版本链运行时 G3/G4 收口

- Gate Status: `G4 = Pass`
- Slice Type: `cross-layer-high-risk`
- Owner: `Codex`
- Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-34A`

## 1. 交付范围

本次完成:

1. 新增 `ProjectArchiveRecord` 三态：`recorded` / `voided` / `superseded`。
2. 新增替代链与撤销字段：`supersedesArchiveRecordId`、`replacementReason`、`voidedAt`、`voidedBy`、`voidReason`。
3. 新增 migration、实体约束、current `recorded` partial unique 约束与 repository / service 守卫。
4. 新增 `POST /project-archive-records/{id}:replace` 与 `POST /project-archive-records/{id}:void`。
5. 更新 shared contract、API DTO、OpenAPI 与 generated Angular client。
6. 更新归档记录 query 输出审计字段；项目生命周期 timeline 继续只投影 latest current `recorded` 归档事实。

本次未做:

1. 未新增前端按钮、弹窗、权限显隐或浏览器入口验证；`FE-31` 承接。
2. 未改变归档作为 `completed` 终态附属 milestone 的设计。
3. 未新增项目生命周期第九个 stage。
4. 未新增归档附件、审批流或多级复核。

## 2. 一致性判断

| Checkpoint                 | Result | Notes                                                                                      |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Document -> code           | Pass   | `EX-34` / `EX-34A` 冻结的三态、替代链、撤销字段和 current recorded 语义均已落地。          |
| ADR-015 inventory -> route | Pass   | 两条 item-level route 已实现，inventory 状态已从 `planned` 改为 `aligned`。                |
| Route -> command           | Pass   | path `{id}` 绑定被替代 / 被撤销归档记录 identity；service command 使用同一 identity SSOT。 |
| DTO / contract -> code     | Pass   | request DTO、summary DTO、shared contract、OpenAPI 与 generated client 已同步。            |
| Migration -> entity        | Pass   | migration 与 entity 字段、状态 check、partial unique、self reference 对齐。                |
| Query -> view              | Pass   | archive list 输出非 current 归档审计字段；timeline 只读取 latest current `recorded`。      |
| Guard / permission         | Pass   | replace / void 使用 `project:write`；list / timeline 继续使用项目读侧权限边界。            |

## 3. Drift 判断

| Item                               | Classification                    | Result                                                                                                      |
| ---------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Local DB migration-check first run | `accepted-db-specific-difference` | 首次 `migration-check` 发现本地 DB 尚未应用本片 migration；执行 `migration:up` 后重新检查通过。             |
| OpenAPI generator warnings         | `tool-noise`                      | generated client 仍输出既有 `propertyNames` generator warning；`shared-api-client:check` 最终确认完全同步。 |
| New route inventory delta          | `N/A`                             | route rows 已由 `planned` 更新为 `aligned`，没有遗留 route drift。                                          |

## 4. 验证

| Command / Evidence                                                                                                                                                                                                                                                      | Required | Result                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------- |
| `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/project/project.service.spec.ts --testFile=apps/poms-api/src/app/features/project/project.controller.spec.ts --testFile=apps/poms-api/src/app/features/project/project-query.service.spec.ts` | Yes      | Passed                                |
| `corepack pnpm nx lint poms-api`                                                                                                                                                                                                                                        | Yes      | Passed                                |
| `corepack pnpm nx build poms-api`                                                                                                                                                                                                                                       | Yes      | Passed                                |
| `corepack pnpm nx run poms-api:openapi`                                                                                                                                                                                                                                 | Yes      | Passed                                |
| `corepack pnpm nx run shared-api-client:generate`                                                                                                                                                                                                                       | Yes      | Passed                                |
| `corepack pnpm nx run shared-api-client:check`                                                                                                                                                                                                                          | Yes      | Passed                                |
| `corepack pnpm nx run poms-api:migration-check`                                                                                                                                                                                                                         | Yes      | Passed after applying local migration |
| `corepack pnpm run format:md`                                                                                                                                                                                                                                           | Yes      | Passed                                |
| `corepack pnpm run format:md:check`                                                                                                                                                                                                                                     | Yes      | Passed                                |
| `git diff --check`                                                                                                                                                                                                                                                      | Yes      | Passed                                |
| Admin E2E                                                                                                                                                                                                                                                               | No       | Deferred to `FE-31`                   |

## 5. 例外关闭

| Exception ID                 | Status      | Closure                                                                                       |
| ---------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `EX34A-E1-NO-FRONTEND-ENTRY` | Transferred | Runtime 能力已完成；前端入口、权限显隐、反馈态和浏览器验证由 `FE-31` 从 `G1` 重新冻结后实现。 |

## 6. G4 结论

- `EX-34A` 可以标记 `Done`。
- 后端归档撤销 / 替代 runtime 能力、OpenAPI、generated client 和 schema 约束可作为下游稳定输入。
- `FE-31` 是下一步前端切片；不得在未冻结 `FE-31` G1 前零散添加入口。
