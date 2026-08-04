# EX-78A / FE-75 客户别名安全删除闭环实施基线包

- Gate Status: `Pass`
- Parent: GitHub issue `#35`; historical local slice `EX-42`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Wang Zishi`
- G1 Date: `2026-08-04`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-78A / FE-75`

## 1. 范围

- 本次目标:
  - 为误添加的非主客户别名提供可审计的硬删除闭环，使错误别名立即退出名称匹配和去重辅助。
  - 新增 canonical item route `DELETE /customer-aliases/{id}`，复用 `customer:write` 权限，并冻结成功及失败响应语义。
  - 在客户工作台“客户档案 / 客户别名”区域提供删除入口、二次确认、单项 loading、权限与客户状态约束。
  - 删除客户别名与 `customer.alias.deleted` runtime audit 在同一数据库事务内提交，审计记录继续通过客户“编辑历史”读取。
- 本次明确不做:
  - 不支持删除或替换 `isPrimary=true` 的主别名。
  - 不实现别名编辑、恢复、批量删除、软删除或别名版本链。
  - 不修改客户 `displayName`、`legalName`、`shortName`，也不改写 Lead / Project 历史名称快照。
  - 不新增权限 key、数据库表、字段、约束或 migration。
  - 不改变客户合并命令、别名类型定义或既有查询 / 新增 route。
- 下游可依赖的交付边界:
  - 具有 `customer:write` 的用户可删除活动或停用客户的非主别名；删除成功后该记录不再出现在客户详情和别名查询中。
  - 主别名、已合并客户、权限不足和不存在别名均由后端强制保护，前端显隐不是安全边界。
  - 客户审计历史能够识别删除人、删除时间、原别名内容和请求关联标识。
- 不允许下游依赖的留白:
  - 不提供已删除别名恢复能力；确需恢复时通过现有新增命令重新创建。
  - 不承诺主别名跟随客户展示名称自动同步；该语义需另开切片。

## 2. 正式输入

| Input Type                | Document / Source                                                                                                   | Section / Anchor                         | Status | Notes                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------ | ------------------------------------------------------------- |
| Business design           | GitHub issue `#35`                                                                                                  | 背景、交付范围、验收清单                 | Active | 用户确认需要删除误添加别名并批准进入实施与测试环境发布。      |
| Command design            | 本基线                                                                                                              | 4. 命令与接口边界                        | Frozen | 硬删除、保护规则、事务与审计语义由本基线冻结。                |
| DTO / OpenAPI design      | 本基线                                                                                                              | `204 No Content` / error semantics       | Frozen | 无 request / response DTO；OpenAPI 仍需生成并同步 client。    |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                                                      | `customer / deleteCustomerAlias`         | Frozen | B20 planned authoritative row 已登记。                        |
| Query boundary            | `CustomerDetailView.aliases` / `GET /customers/{id}/aliases`                                                        | existing customer read models            | Active | 删除后继续通过既有读模型回读，不新增 query route。            |
| Data model / table freeze | `docs/design/archive/slices/ex-42-customer-master-data-baseline.md`                                                 | `poms.customer_alias`                    | Active | 复用 UUID、customer FK、`is_primary` 和创建审计字段。         |
| Schema / DDL              | Existing migrations                                                                                                 | `poms.customer_alias` / `poms.audit_log` | N/A    | 本片无 DDL；部署 migration gate 仍必须验证目标库无 pending。  |
| Runtime audit             | `apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts`                                                 | `recordAuditLog(input, entityManager)`   | Active | 复用可传入 EntityManager 的事务内审计能力。                   |
| Admin UI                  | `apps/poms-admin/src/app/features/customer/customer-workspace.ts`                                                   | 客户档案 / 客户别名                      | Active | 复用 `CustomerAliasSummary.isPrimary` 与 `canWriteCustomer`。 |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md` / `docs/adr/014-design-execution-state-model-and-governance-gates.md` | item identity / G1                       | Active | 稳定 UUID item 使用一等资源路径，route 先登记再实现。         |

## 3. 本次 SSOT

| Concern                     | SSOT                                                       | Implementation Rule                                                                                |
| --------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Business semantics          | GitHub issue `#35` + 本基线                                | 仅错误的非主别名可删除；删除后立即退出运行时别名集合，历史操作由 audit 保留。                      |
| Public route canonical path | `DELETE /customer-aliases/{id}`                            | `CustomerAlias.id` 是全局稳定 UUID，不增加嵌套 item identity。                                     |
| Route / command naming      | `deleteCustomerAlias` / `CustomerService.deleteAlias`      | controller 只映射 alias ID、当前用户和 request ID；service 拥有业务保护、事务和审计。              |
| DTO / contract naming       | no request / response DTO                                  | 成功返回 `204 No Content`；generated client 不承载业务响应，Admin Store 对外返回 `Promise<void>`。 |
| Table / column naming       | existing `poms.customer_alias`                             | 使用 ORM remove 硬删除；不增加 soft-delete 字段或放宽现有唯一约束。                                |
| Date / time semantics       | runtime audit `occurredAt`                                 | 删除发生时间由后端生成 datetime；原 `createdAt` 只进入 before snapshot。                           |
| Identifier semantics        | `CustomerAlias.id` / `Customer.id` UUID                    | path ID 定位别名；审计以 `targetType=customer`、`targetId=customerId` 归入客户历史。               |
| Money / decimal semantics   | N/A                                                        | 本片不涉及金额。                                                                                   |
| Status machine              | `Customer.status` + `CustomerAlias.isPrimary`              | `merged` 客户不可修改别名；主别名不可删除；活动和停用客户的非主别名可删除。                        |
| Permission                  | existing `customer:write`                                  | route guard 与 UI 可见性复用同一权限；前端显隐不替代后端 guard。                                   |
| Audit                       | `RuntimeAuditService.recordAuditLog(input, entityManager)` | alias remove 与 audit entity persist 在同一 MikroORM transaction 中 flush；任一失败则整体回滚。    |

## 4. 命令与接口边界

| Route / Controller                        | Command / Service                  | Request DTO / Contract      | Response DTO / Contract | Guard / Permission | Design Source     | Result      |
| ----------------------------------------- | ---------------------------------- | --------------------------- | ----------------------- | ------------------ | ----------------- | ----------- |
| `DELETE /customer-aliases/{id}`           | `CustomerService.deleteAlias`      | path UUID `id`              | `204 No Content`        | `customer:write`   | B20 + issue `#35` | Implemented |
| internal `CustomerRepository` transaction | find alias/customer, remove, audit | alias ID + actor/request ID | N/A                     | service invariant  | this baseline     | Implemented |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route: `DELETE /customer-aliases/{id}`
- Current implemented route: `DELETE /customer-aliases/{id}`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-78A/FE-75` baseline
- Blocker / exception: 无。G2 必须保持一等 item identity，不得改为 `/customers/{customerId}/aliases/{aliasId}`。

### 4.2 响应与保护语义

| Condition                      | HTTP | Rule                                                           |
| ------------------------------ | ---- | -------------------------------------------------------------- |
| 非主别名删除成功               | 204  | response body 为空；事务提交后该别名不再参与读模型或名称匹配。 |
| 未认证                         | 401  | 复用全局 session guard。                                       |
| 缺少 `customer:write`          | 403  | 复用 permission guard；不得进入 service 删除路径。             |
| alias ID 不存在                | 404  | 不泄露其他资源信息；不写 success audit。                       |
| alias `isPrimary=true`         | 409  | 返回业务冲突；主别名必须保留。                                 |
| alias 所属客户不存在           | 404  | 视为数据完整性异常并阻断删除。                                 |
| alias 所属客户 `status=merged` | 409  | 合并后的客户主档不可再修改别名。                               |

### 4.3 审计快照

- `eventType`: `customer.alias.deleted`
- `targetType`: `customer`
- `targetId`: alias 所属 `customerId`
- `operatorId`: 当前用户 ID
- `requestId`: `x-request-id` / `x-correlation-id`
- `result`: `success`
- `beforeSnapshot`: `aliasId`, `aliasName`, `aliasType`, `normalizedName`, `isPrimary`, `createdAt`, `createdBy`
- `afterSnapshot`: `null`
- `metadata`: `{ sourceCommand: 'delete-customer-alias' }`

## 5. 读侧边界

| Query / View                        | Consumer                 | Fields                        | Filter / Sort                     | Permission Boundary | Design Source | Result    |
| ----------------------------------- | ------------------------ | ----------------------------- | --------------------------------- | ------------------- | ------------- | --------- |
| `GET /customers/{id}`               | Admin customer workspace | `CustomerDetailView.aliases`  | primary first, then creation time | `customer:read`     | EX-42         | Unchanged |
| `GET /customers/{id}/aliases`       | API consumer             | `CustomerAliasSummary[]`      | primary first, then creation time | `customer:read`     | EX-42         | Unchanged |
| entity audit history for `customer` | existing audit panel     | deleted alias before snapshot | occurredAt descending             | `customer:read`     | runtime audit | Reused    |

删除成功后 Admin store 必须重新加载当前客户详情，而不是只做乐观本地移除；这样 404/409/事务回滚时 UI 不会与服务端状态漂移。

## 6. 持久化边界

| Table                 | Migration | Entity / Repository                        | DDL / Freeze Source | Check Result |
| --------------------- | --------- | ------------------------------------------ | ------------------- | ------------ |
| `poms.customer_alias` | N/A       | existing `CustomerAlias` / add remove path | EX-42               | Reuse        |
| `poms.audit_log`      | N/A       | existing runtime audit service             | runtime audit       | Reuse        |

| Field / Model   | Design Type / Meaning                  | Migration / DDL | Entity                     | Shared Contract / OpenAPI | Result  |
| --------------- | -------------------------------------- | --------------- | -------------------------- | ------------------------- | ------- |
| alias path `id` | UUID, global customer-alias identity   | existing        | `CustomerAlias.id`         | OpenAPI path string/uuid  | Aligned |
| `customerId`    | UUID, audit grouping and owner lookup  | existing FK     | `CustomerAlias.customerId` | existing summary field    | Aligned |
| `isPrimary`     | boolean, immutable deletion protection | existing        | `CustomerAlias.isPrimary`  | existing summary field    | Aligned |
| audit snapshots | JSON business audit evidence           | existing jsonb  | `AuditLog`                 | existing audit read model | Reused  |

## 7. Admin 交互边界

1. 主别名显示“主名称”标识，不展示删除按钮。
2. 仅当 `canWriteCustomer()` 且客户不是 `merged` 时，为非主别名展示带可访问名称的危险操作按钮。
3. 确认文案明确包含别名文本，并说明“删除后不再用于客户名称匹配，操作不可撤销”。
4. `deletingAliasId` 只为当前项显示 loading 并阻止重复提交；既有新增 alias 流程保持可读。
5. 确认后调用 generated client；成功后 reload 当前客户详情，失败时保留原别名并显示可行动错误。
6. 前端不得允许通过手工 DOM 操作绕过后端主别名、merged 或 permission 保护。

## 8. 一致性结论

- Document -> code: 本基线把 EX-42 未覆盖的删除能力冻结为独立 issue-backed 切片。
- ADR-015 inventory -> route: B20 planned row 与 `DELETE /customer-aliases/{id}` identity anchor 一致。
- Migration -> entity: N/A；无 DDL/entity mapping change，migration-check 用于确认未引入 drift。
- Entity -> contract: 复用现有 `CustomerAliasSummary`；无新增 DTO，OpenAPI 仅新增 void delete operation。
- Route -> command: 独立 alias controller 映射到 customer domain service；业务保护不放进 controller。
- Query -> view: 删除后复用既有客户详情 reload；不新增读 route。
- Guard / permission: route 与 UI 复用 `customer:write`；直接 API 调用仍由 guard 保护。
- OpenAPI / generated client: 必须新增 delete operation 并通过 client check。
- Delete -> audit: 同一 EntityManager transaction remove alias + persist audit + flush，失败整体回滚。

## 9. 测试与校验

| Check                            | Required | Command / Evidence                                                                     | Result  | Gap / Reason        |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------- | ------- | ------------------- |
| API service tests                | Yes      | focused API 2 suites / 12 tests；full API 72 suites / 806 tests                        | Passed  |                     |
| API controller tests             | Yes      | route/actor/request ID 映射与 204 response                                             | Passed  |                     |
| Admin store/component tests      | Yes      | focused Admin 2 suites / 9 tests；full Admin 55 suites / 350 tests                     | Passed  |                     |
| API E2E                          | Yes      | session + CSRF：403、primary 409、204、查询移除、audit、重复删除 404；1 suite / 1 test | Passed  |                     |
| Browser verification             | Yes      | 测试环境新增临时非主别名、确认删除、刷新不回显、主别名无删除入口、审计历史可见         | Pending |                     |
| Lint                             | Yes      | `poms-api`, `poms-admin`, `admin-data-access`                                          | Passed  |                     |
| Build                            | Yes      | `poms-api`, `poms-admin`, `admin-data-access`, `shared-api-client`                     | Passed  |                     |
| OpenAPI generation / client diff | Yes      | `poms-api:openapi`, `shared-api-client:generate`, `shared-api-client:check`            | Passed  | client synchronized |
| Migration / schema check         | Yes      | `poms-api:migration-check`; no changes required, schema up-to-date                     | Passed  | no migration        |
| Deployment                       | Yes      | `deploy:build-test`, `deploy:preflight-test`, `deploy:push-test`, `deploy:verify-test` | Pending |                     |
| Docs / diff sanity               | Yes      | `pnpm run format:md`, `pnpm run format:md:check`, `git diff --check`                   | Pending |                     |

## 10. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                   |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------- |
| None         | N/A   | N/A   | N/A         | N/A           | N/A         | No exception requested. |

G2 风险:

1. 硬删除不能先返回成功再异步写审计；必须验证删除与审计的事务原子性。
2. UI 使用 alias 名称生成确认文案时必须按 Angular text binding 渲染，不能拼接为 HTML。
3. generated client 对 `204` 的空响应处理必须经过 Admin store 单测和真实 E2E 验证。
4. 测试环境验收创建的临时 alias 必须在同一验收链中删除，不遗留业务测试数据。

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: `Wang Zishi`
- Approved At: `2026-08-04`
- Conditions:
  1. 先同步 route inventory、tracker、progress 和 GitHub G1 comment，再开始 controller / OpenAPI / generated client 修改。
  2. 只允许删除非主别名；primary 与 merged 保护必须由后端测试覆盖。
  3. 删除与成功审计必须使用同一 EntityManager transaction。
  4. PR mode 承载 G3 证据，测试环境发布与真实交互验收通过后才进入 G4。

## 12. G3 Review Checkpoint

- Gate Status: `Pass`
- Reviewed At: `2026-08-04`
- Scope Review: 实现保持 G1 冻结范围；未新增 migration、权限 key、软删除、恢复、批量删除、别名编辑或主别名替换。
- Contract Review: B20 已由 `planned` 更新为 `aligned`；OpenAPI 与 generated client 已同步。OpenAPI Generator 将无 schema 的 `204` 方法生成为 `Observable<any>`，Admin Store 丢弃响应并对外收敛为 `Promise<void>`，业务语义仍为无响应体。
- Transaction Review: alias 查询、客户状态校验、ORM remove、runtime audit persist 与 flush 共用同一 transactional EntityManager；审计写失败不会提交删除。
- Verification Review: focused/full API 与 Admin 测试、API E2E、lint、build、OpenAPI/client check、migration check 均通过；browser 与 deployment 证据在测试环境发布后补录。
- Baseline Check: `check:enum-like-strings` 在当前分支和基线 `954b2273` 上均为 A1=34、A2=122、A3=897、A5=35，且 `external-org-sync` 的 `Record<string, string>` 均为 1 处；本片零新增命中，既有基线债务不在本片扩围处理。
- Drift / Exception: 无实现漂移，无本片例外。
