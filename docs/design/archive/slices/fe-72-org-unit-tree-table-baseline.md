# FE-72 组织单元列表树形表格实施基线

- Gate Status: `Pass`
- Parent: N/A
- GitHub Issue: `#20`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-18
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-72`

## 1. 范围

- 本次目标:
  - 将 Admin 端“组织单元”页面从平铺表格升级为可展开 / 折叠的树形表格。
  - 以组织层级作为主视图，帮助管理员直接理解 POMS 内部组织结构。
  - 搜索组织名称或编码时保留命中节点的祖先链，并自动展开到命中路径。
  - 同级节点按现有排序规则展示，不做全局排序打散树结构。
  - 保留现有组织单元创建、编辑、移动、启用、停用等行级能力。
- 本次明确不做:
  - 不新增、删除或重命名 public API route。
  - 不修改 OpenAPI / generated client，除非实现核对发现 Admin 侧缺失既有 `org-unit-tree` 客户端封装。
  - 不新增 migration、entity 字段或权限 key。
  - 不实现拖拽排序、批量导入、复杂组织编制、岗位或组织范围授权。
  - 不纳入外部组织同步父任务 `#8`；本片只做 POMS 内部组织单元列表体验。
- 下游可依赖的交付边界:
  - 管理员在组织单元页面可以按树结构查看 POMS 组织。
  - 管理员在搜索时不会丢失命中节点的父级上下文。
  - 组织变更后树形表格刷新结果与现有列表 / 表单数据一致。
- 不允许下游依赖的留白:
  - 不保证本片提供树上拖拽移动。
  - 不保证本片提供虚拟滚动或懒加载；若组织规模后续显著增长，另拆性能切片。
  - 不改变组织单元后端写入规则、排序规则或启停规则。

## 2. 正式输入

| Input Type                | Document / Source                                                | Section / Anchor                          | Status | Notes                                                                 |
| ------------------------- | ---------------------------------------------------------------- | ----------------------------------------- | ------ | --------------------------------------------------------------------- |
| Business design           | GitHub issue `#20`                                               | Scope / acceptance criteria               | Pass   | 冻结组织单元列表树形表格目标和不做范围。                              |
| Org unit design           | `docs/design/platform-governance/org-unit-design.md`             | `7. 树结构设计` / `11. 管理能力边界`      | Pass   | 组织单元是单父节点树，管理端当前缺口是尚未演进为完整树形管理视图。    |
| ADR                       | `docs/adr/002-org-unit-model-and-assignment.md`                  | OrgUnit tree model                        | Pass   | 第一阶段组织单元采用树结构。                                          |
| Current implementation    | `apps/poms-admin/src/app/features/platform/org-unit-list.ts`     | OrgUnit list page                         | Rework | 当前页面为平铺表格，需要升级主视图形态。                              |
| Shared contracts          | `libs/shared/contracts/src/lib/shared-contracts.ts`              | `OrgUnitTreeNode` / `PlatformOrgUnitTree` | Pass   | 既有树契约可消费，不新增字段。                                        |
| Existing API              | `apps/poms-api/src/app/features/platform/platform.controller.ts` | `GET /platform/org-unit-tree`             | Pass   | 既有 public route；本片只消费，不变更 route surface。                 |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                   | Platform org unit routes                  | Pass   | 不新增 public route；如实现发现 inventory drift，必须先回到 G1 修正。 |

## 3. 本次 SSOT

| Concern                     | SSOT                                              | Implementation Rule                                                            |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Business semantics          | `#20` + 本基线                                    | 组织单元列表默认表达内部组织树，而不是平铺记录清单。                           |
| Public route canonical path | `GET /platform/org-unit-tree` existing route      | 本片只消费既有路由；不得新增或改名。                                           |
| Route / command naming      | Existing Platform org unit API                    | 组织创建、更新、移动、启停继续复用现有命令。                                   |
| DTO / contract naming       | `OrgUnitTreeNode` / `PlatformOrgUnitTree`         | 视图层使用既有树节点字段，不新增 contract 字段。                               |
| Table / column naming       | Existing `OrgUnit` persistence                    | 不改 `org_unit` 表、entity 或字段语义。                                        |
| Date / time semantics       | N/A                                               | 不新增日期字段。                                                               |
| Identifier semantics        | Existing `OrgUnit.id` / `parentId` UUID semantics | POMS 组织 ID 和父组织 ID 仍为内部 UUID；搜索不得把外部部门 ID 语义带入本页面。 |
| Money / decimal semantics   | N/A                                               | 不涉及金额。                                                                   |
| Status machine              | Existing `isActive` lifecycle                     | 启用 / 停用表现沿用当前状态，不新增状态机。                                    |

## 4. 命令与接口边界

| Route / Controller                   | Command / Service     | Request DTO / Contract | Response DTO / Contract | Guard / Permission          | Design Source  | Result |
| ------------------------------------ | --------------------- | ---------------------- | ----------------------- | --------------------------- | -------------- | ------ |
| `GET /platform/org-unit-tree`        | `listOrgUnitTree`     | N/A                    | `PlatformOrgUnitTree`   | `platform:org-units:manage` | OrgUnit design | Reuse  |
| `GET /platform/org-units`            | `listOrgUnits`        | existing query         | existing list contract  | `platform:org-units:manage` | Current page   | Reuse  |
| `POST /platform/org-units`           | `createOrgUnit`       | existing request       | existing summary        | `platform:org-units:manage` | Current page   | Reuse  |
| `PATCH /platform/org-units/{id}`     | `updateOrgUnit`       | existing request       | existing summary        | `platform:org-units:manage` | Current page   | Reuse  |
| `POST /platform/org-units/{id}:move` | `moveOrgUnit`         | existing request       | existing summary        | `platform:org-units:manage` | Current page   | Reuse  |
| existing activate / deactivate       | `activate/deactivate` | existing request       | existing summary        | `platform:org-units:manage` | Current page   | Reuse  |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing Platform org unit routes, especially `GET /platform/org-unit-tree`
- Current implemented route(s): existing Platform org unit routes
- Inventory status: `aligned` expected; implementation must verify before route work
- Route governance source: `ADR-015` + existing platform route inventory
- Blocker / exception: N/A. If implementation requires new route or DTO fields, pause and update G1 / inventory first.

## 5. 读侧边界

| Query / View               | Consumer            | Fields                                                        | Filter / Sort                                                            | Permission Boundary | Design Source | Result |
| -------------------------- | ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------- | ------------- | ------ |
| Org unit tree table        | Admin org unit page | id, parentId, name, code, description, isActive, displayOrder | Tree hierarchy from backend; same-level order stable                     | page route guard    | `#20`         | New    |
| Org unit flat reference    | Forms / parent pick | id, parentId, name, code, isActive                            | Existing list semantics                                                  | page route guard    | Current page  | Reuse  |
| Tree search filtered model | Admin org unit page | matched node + ancestor chain + children visibility           | Search name/code; preserve ancestors; auto-expand matched ancestor paths | page route guard    | `#20`         | New    |

## 6. 持久化边界

| Table      | Migration | Entity / Repository | DDL / Freeze Source | Check Result     |
| ---------- | --------- | ------------------- | ------------------- | ---------------- |
| `org_unit` | No        | existing            | OrgUnit design      | no schema change |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result             |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------------------ |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | no contract change |

## 7. 一致性结论

- Document -> code: 本片消费组织单元树结构设计，将 Admin 主列表视图对齐到正式组织模型。
- ADR-015 inventory -> route: 不新增 route；消费既有 `GET /platform/org-unit-tree`。
- Migration -> entity: N/A，不改 persistence。
- Entity -> contract: N/A，不改 contract 字段。
- Route -> command: 写侧命令全部复用当前组织单元 API。
- Query -> view: 树表视图从既有树查询和现有平铺组织数据派生。
- Guard / permission: 沿用组织单元页面既有权限。
- OpenAPI / generated client: 预期不变化；如缺少既有 route 客户端封装，需先确认是否为生成客户端漂移。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                              | Result  | Gap / Reason                           |
| -------------------------------- | -------- | ------------------------------------------------------------------------------- | ------- | -------------------------------------- |
| Admin focused tests              | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=org-unit-list` | Pending | 覆盖树表渲染、搜索保留祖先和刷新路径。 |
| Admin lint                       | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache`                              | Pending | touched lint-enabled project。         |
| Admin build                      | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                             | Pending | 验证 Angular template / PrimeNG 编译。 |
| Browser / interaction smoke      | Decision | local or test env manual smoke                                                  | Pending | 视实现复杂度决定是否补浏览器验证。     |
| OpenAPI generation / client diff | No       | N/A                                                                             | N/A     | 不改 API surface。                     |
| Migration / schema check         | No       | N/A                                                                             | N/A     | 不改 persistence。                     |
| Markdown format                  | Yes      | `corepack pnpm run format:md:check`                                             | Pending | 本片新增 Markdown。                    |
| Diff sanity                      | Yes      | `git diff --check`                                                              | Pending | 提交前必跑。                           |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes               |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception at G1. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-18
- Conditions:
  - 本片保持 `frontend-only`；不得顺手改外部组织同步或其他平台配置页面。
  - 不新增 public route、OpenAPI、generated client 或 migration。
  - 若 TreeTable 引入 PrimeNG 模块变更，必须通过 `poms-admin` lint/build 和 focused tests 验证。
  - 搜索必须保留祖先链，不能把树形表退化为无上下文的平铺搜索结果。
