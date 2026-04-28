# EX-41A Project Owner Reassignment Command G3 Checkpoint

- Gate Status: `G3 = Pass`
- Parent: `EX-41`
- Owner: `Codex`
- Slice Type: `api / command + persistence`
- Checkpoint Date: `2026-04-29`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-41A`

## 1. Scope Summary

本片已落地项目创建后的销售主责变更命令:

1. `POST /projects/{id}:reassignOwner`
2. `ReassignProjectOwnerRequest` / `ProjectOwnerReassignmentResult`
3. `ProjectService.reassignOwner`
4. `ProjectOwnerReassignmentRecord` entity + migration
5. `ProjectDetailView.allowedActions` 新增 `reassign-project-owner`
6. OpenAPI + generated shared API client

本片未改 `PATCH /projects/{id}` owner 字段，也未改 `ConvertLeadToProjectRequest`。转项目当场覆盖销售主责仍交给后续决策；`FE-45` 可先消费本片后置 reassignment 能力。

## 2. Alignment Evidence

| Boundary                     | Result | Evidence                                                                                         |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Document -> code             | Pass   | 实现范围与 `ex-41a-project-owner-reassignment-command-baseline.md` 一致。                        |
| ADR-015 inventory -> route   | Pass   | `api-route-canonical-inventory.md` 已从 `planned` 回写到 `aligned`。                             |
| Route -> command             | Pass   | `ProjectController.reassignOwner` 只委派 `ProjectService.reassignOwner`。                        |
| DTO / contract -> controller | Pass   | shared contract、API DTO、OpenAPI 与 generated client 均新增 request / result。                  |
| Migration -> entity          | Pass   | 新增表、索引、FK、comments 与 `ProjectOwnerReassignmentRecord` metadata 对齐。                   |
| Entity -> contract           | Pass   | response 暴露 record id、前后 owner 和 `businessStatusAfter`；内部 reason 留在动作记录表。       |
| Query -> view                | Pass   | `ProjectDetailView.allowedActions` 在 active / blocked + `project:write` 时新增 action key。     |
| Guard / permission           | Pass   | 按 `EX41-E1` 使用 `project:write` + active / blocked guard；未声明完整对象级组织范围授权已落地。 |

## 3. Validation

| Check                    | Result | Command / Evidence                                                                                                                                             |
| ------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused / backend tests  | Pass   | `corepack pnpm nx test poms-api --testFile=project.service.spec.ts --testFile=project.controller.spec.ts --testFile=project-query.service.spec.ts`，514 passed |
| API lint                 | Pass   | `corepack pnpm nx lint poms-api`                                                                                                                               |
| API build                | Pass   | `corepack pnpm nx build poms-api`                                                                                                                              |
| OpenAPI generation       | Pass   | `corepack pnpm nx run shared-api-client:generate` 触发 `poms-api:openapi` 并生成 client                                                                        |
| Generated client check   | Pass   | `corepack pnpm nx run shared-api-client:check`                                                                                                                 |
| Migration apply          | Pass   | `corepack pnpm nx run poms-api:migration-up` 已应用 `Migration20260429100000_ex41a_project_owner_reassignment_record`                                          |
| Migration / schema check | Pass   | `corepack pnpm nx run poms-api:migration-check`，schema up-to-date                                                                                             |
| Markdown format          | Pass   | `corepack pnpm run format:md:check`                                                                                                                            |
| Diff hygiene             | Pass   | `git diff --check`                                                                                                                                             |

## 4. Drift Classification

| Drift ID                         | Class            | Status   | Notes                                                                                                   |
| -------------------------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `EX41A-D1-PROJECT-OWNER-COMMENT` | `new-real-drift` | Fixed    | `migration:create --dump` 暴露 `project.owner_*` entity comment 与 migration 不一致，已补 comment SQL。 |
| `EX41A-D2-GENERATOR-WARNINGS`    | `tool-noise`     | Accepted | OpenAPI generator 继续报告既有 `propertyNames` warning；client check 已通过，非本片新增阻断。           |

## 5. Exceptions

| Exception ID                        | Level | Status | Notes                                                                                 |
| ----------------------------------- | ----- | ------ | ------------------------------------------------------------------------------------- |
| `EX41-E1-OBJECT-AUTH-GRANULARITY`   | `E1`  | Open   | 本片按已批准范围复用 `project:write` + status guard。完整对象级授权仍是后续治理任务。 |
| `EX41-E2-CONVERSION-OWNER-OVERRIDE` | `E2`  | Open   | 本片不改转项目 DTO；`FE-45` 可用项目后置 reassignment 入口承接。                      |

## 6. G3 Conclusion

- Gate Status: `Pass`
- Commit / G4 Status: `Pending`
- Conditions:
  1. 提交后可将 `EX-41A` 从 `Doing / G3` 推进到 `Done / G4`。
  2. `FE-45` 可依赖 generated client、route 和 `reassign-project-owner` action key 开始 G1。
