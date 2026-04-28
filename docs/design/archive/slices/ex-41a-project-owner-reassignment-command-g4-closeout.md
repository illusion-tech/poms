# EX-41A Project Owner Reassignment Command G4 Close-Out

- Gate Status: `G4 = Done`
- Parent: `EX-41`
- Owner: `Codex`
- Slice Type: `api / command + persistence`
- Closed At: `2026-04-29`
- Commit: `b5a444e feat(project): 完成 EX-41A 项目负责人重分配闭环`

## 1. Delivered Boundary

`EX-41A` 已交付项目创建后的销售主责变更后端闭环:

1. `POST /projects/{id}:reassignOwner`
2. `ReassignProjectOwnerRequest` / `ProjectOwnerReassignmentResult`
3. `ProjectOwnerReassignmentRecord` 动作记录表与 migration
4. OpenAPI 与 shared generated API client
5. `ProjectDetailView.allowedActions` 的 `reassign-project-owner` action key
6. focused service / controller / query tests

本片未改 `PATCH /projects/{id}`，也未改转项目 DTO。`FE-45` 继续承接前端入口、表单和浏览器验证。

## 2. Validation Evidence

沿用 `docs/design/ex-41a-project-owner-reassignment-command-g3-checkpoint.md` 的 G3 证据:

- focused backend tests: 514 passed
- `poms-api` lint / build: pass
- OpenAPI generation and generated client check: pass
- migration-up and migration-check: pass
- Markdown format and diff hygiene: pass

## 3. Downstream Readiness

| Downstream | Readiness | Notes                                                                       |
| ---------- | --------- | --------------------------------------------------------------------------- |
| `FE-45`    | Ready     | 可消费 generated client 的 `projectControllerReassignOwner` 与 action key。 |

## 4. G4 Conclusion

- `EX-41A` 可标记为 `Done / G4`。
- `FE-45` 可进入 `G1`。
