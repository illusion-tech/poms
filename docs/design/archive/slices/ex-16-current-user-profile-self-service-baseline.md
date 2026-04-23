# EX-16 Current User Profile Self-Service 实施基线包

- Gate Status: `Pass`
- Parent: `EX-16`
- Owner: `Codex`
- Slice Type: `api / command`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-21`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-16`

---

## 1. 范围

- 本次目标:
  1. 落地 `PATCH /auth/profile` 当前用户自助资料更新 route。
  2. 新增 `UpdateCurrentUserProfileRequest` shared contract / API DTO，并与 OpenAPI、generated client 对齐。
  3. 在写侧落实 `displayName / email / phone` 更新、联系方式变化触发 `emailVerified / phoneVerified` 重置、统一 audit 留痕。
  4. 补齐 backend unit / controller / E2E 覆盖，并回写 route inventory 与 tracker。
- 本次明确不做:
  1. 不开放 `avatarUrl` 自助编辑。
  2. 不实现邮箱 / 手机验证码发送、重新验证或密码修改流程。
  3. 不新增前端 `/profile` 编辑 UI；该部分仍留给 `FE-15`。
  4. 不改 fixture fallback 的 `GET /auth/profile` 兼容读侧策略。
- 下游可依赖的交付边界:
  1. 已登录真实平台用户可通过 `PATCH /auth/profile` 更新 `displayName / email / phone`。
  2. 响应统一返回最新 `SanitizedUserWithOrgUnits`，供前端刷新当前用户上下文。
  3. 真实平台用户的自助更新会形成 `platform.user.self-updated` 审计记录。
- 不允许下游依赖的留白:
  1. 不允许把 `PATCH /platform/users/{id}` 当作当前用户自助写侧替代。
  2. 不允许在前端本地推断 `emailVerified / phoneVerified` 重置语义。

---

## 2. 正式输入

| Input Type                | Document / Source                                                                                 | Section / Anchor                           | Status   | Notes                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------- | ------------------------------------------------------------------- |
| Business design           | `platform-governance/profile-self-service-design.md`                                              | `5.1` ~ `5.7`, `6`, `7`, `9`               | Accepted | 当前用户自助编辑边界、route、审计、前端刷新与测试要点已冻结         |
| Command design            | `interface-command-design.md`                                                                     | `5.1` 平台治理域普通更新边界               | Accepted | `PATCH /auth/profile` 是普通更新接口，不复用管理员更新语义          |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                                                 | `4` 普通更新接口 DTO 边界基线              | Accepted | 首版请求 DTO 仅允许 `displayName / email / phone`                   |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                                                                | `auth.updateCurrentUserProfile`            | Accepted | canonical route 已冻结为 `PATCH /auth/profile`                      |
| Query boundary            | `query-view-boundary-design.md`                                                                   | `CurrentUserProfileView`                   | Accepted | 继续复用 `GET /auth/profile` / `SanitizedUserWithOrgUnits` 读侧口径 |
| Data model / table freeze | `platform-governance/user-management-design.md`                                                   | `6.2`, `7`                                 | Accepted | 使用既有 `PlatformUser` 主数据，不新增新对象                        |
| Schema / DDL              | `schema-ddl-design.md` / `table-structure-freeze-design.md`                                       | `platform_user`, `audit_log`               | Accepted | 本切片不改 schema；仅消费现有 `platform_user`、`audit_log`          |
| ADR                       | `../adr/008-current-user-profile-output-contract.md`, `../adr/015-api-route-canonical-grammar.md` | `current user output`, `canonical grammar` | Accepted | 当前用户输出与公共 route grammar 均已有上游约束                     |

---

## 3. 本次 SSOT

| Concern                     | SSOT                                                                      | Implementation Rule                                                     |
| --------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Business semantics          | 当前登录用户对自身基础资料的普通更新                                      | 仅允许 `displayName / email / phone`，不进入角色 / 组织 / 启停 / 用户名 |
| Public route canonical path | `PATCH /auth/profile`                                                     | controller 必须直接落在 `AuthController` 下的 `auth/profile`            |
| Route / command naming      | `updateCurrentUserProfile` / `PlatformService.updateCurrentUserProfile`   | 不复用 `updateUser` 的管理员入口语义，但可复用底层字段归一化 helper     |
| DTO / contract naming       | `UpdateCurrentUserProfileRequest`                                         | 不复用 `UpdatePlatformUserRequest` 类型名                               |
| Table / column naming       | `poms.platform_user`、`poms.audit_log`                                    | 本切片不新增表 / 列                                                     |
| Date / time semantics       | `lastLoginAt` 继续保持 `datetime`；本切片不新增 date-only 业务字段        | 不引入新的日期语义                                                      |
| Identifier semantics        | 当前用户目标标识来自 JWT `sub`                                            | 不接受 path `id` / body `userId` override                               |
| Money / decimal semantics   | `N/A`                                                                     | 本切片不涉及金额                                                        |
| Status machine              | 联系方式变化 => 对应 verification flag 自动回退为 `false`；未变化不得误清 | `emailVerified / phoneVerified` 不允许直接由请求体写入                  |

---

## 4. 命令与接口边界

| Route / Controller          | Command / Service          | Request DTO / Contract            | Response DTO / Contract     | Guard / Permission      | Design Source                                                        | Result            |
| --------------------------- | -------------------------- | --------------------------------- | --------------------------- | ----------------------- | -------------------------------------------------------------------- | ----------------- |
| `PATCH /auth/profile`       | `updateCurrentUserProfile` | `UpdateCurrentUserProfileRequest` | `SanitizedUserWithOrgUnits` | `Authenticated()`       | `profile-self-service-design.md` / `interface-openapi-dto-design.md` | Pass              |
| `GET /auth/profile`         | `getSanitizedUserProfile`  | `N/A`                             | `SanitizedUserWithOrgUnits` | `Authenticated()`       | `ADR-008`                                                            | Reuse             |
| `PATCH /platform/users/:id` | `updateUser`               | `UpdatePlatformUserRequest`       | `PlatformUserDetail`        | `platform:users:manage` | `user-management-design.md` / `interface-openapi-dto-design.md`      | Reuse helper only |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `PATCH /auth/profile`
- Current implemented route(s): `PATCH /auth/profile`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `platform-governance/profile-self-service-design.md`
- Blocker / exception: `无`

---

## 5. 读侧边界

| Query / View             | Consumer                                         | Fields                                                                                                                               | Filter / Sort | Permission Boundary | Design Source                   | Result |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------- | ------------------------------- | ------ |
| `CurrentUserProfileView` | `poms-admin` `/profile`, `AuthStore.currentUser` | `id`、`username`、`displayName`、`email`、`phone`、`avatarUrl`、`emailVerified`、`phoneVerified`、`roles`、`permissions`、`orgUnits` | `N/A`         | 当前登录用户自身    | `query-view-boundary-design.md` | Reuse  |

---

## 6. 持久化边界

| Table                | Migration | Entity / Repository                                | DDL / Freeze Source                                                | Check Result |
| -------------------- | --------- | -------------------------------------------------- | ------------------------------------------------------------------ | ------------ |
| `poms.platform_user` | `N/A`     | `PlatformUser` / `PlatformRepository.findUserById` | `user-management-design.md`                                        | Pass         |
| `poms.audit_log`     | `N/A`     | `RuntimeAuditService.recordAuditLog`               | `Migration20260328120000_init_runtime_audit_and_security_event.ts` | Pass         |

| Field           | Design Type / Meaning           | Migration / DDL | Entity / Runtime             | Shared Contract / OpenAPI                     | Result |
| --------------- | ------------------------------- | --------------- | ---------------------------- | --------------------------------------------- | ------ |
| `displayName`   | 当前用户展示姓名，可更新        | `N/A`           | `PlatformUser.displayName`   | `UpdateCurrentUserProfileRequest.displayName` | Pass   |
| `email`         | 当前用户邮箱，可更新 / 可清空   | `N/A`           | `PlatformUser.email`         | `UpdateCurrentUserProfileRequest.email`       | Pass   |
| `phone`         | 当前用户手机号，可更新 / 可清空 | `N/A`           | `PlatformUser.phone`         | `UpdateCurrentUserProfileRequest.phone`       | Pass   |
| `emailVerified` | 联系方式变化时被动重置          | `N/A`           | `PlatformUser.emailVerified` | `SanitizedUserWithOrgUnits.emailVerified`     | Pass   |
| `phoneVerified` | 联系方式变化时被动重置          | `N/A`           | `PlatformUser.phoneVerified` | `SanitizedUserWithOrgUnits.phoneVerified`     | Pass   |

---

## 7. 一致性结论

- Document -> code: Pass
- ADR-015 inventory -> route: Pass
- Migration -> entity: `N/A`，本切片无 schema 变更
- Entity -> contract: Pass
- Route -> command: Pass
- Query -> view: Pass
- Guard / permission: Pass
- OpenAPI / generated client: Pass

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                                                | Result | Gap / Reason                                                          |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                                                                                                                                                  | Pass   | 本切片仅触达 `poms-api` / shared contract，未触达 `poms-admin` 源码   |
| Build                            | Yes      | `corepack pnpm nx build poms-api`；`corepack pnpm nx build poms-admin`                                                                                                            | Pass   | `poms-admin` 作为 generated client 下游消费方一并验证通过             |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`                                                                                                                                      | Pass   | 35 suites / 412 tests                                                 |
| API / integration tests          | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=platform.service.spec.ts`；`corepack pnpm nx test poms-api --runInBand --testPathPatterns=auth.controller.spec.ts` | Pass   | service / controller 目标断言已补齐，且包含在全量 run 中              |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPattern=platform-governance.e2e-spec.ts`                                                                             | Pass   | executor 实际跑完整个 `poms-api-e2e`，共 11 suites / 68 tests         |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`；`corepack pnpm nx run shared-api-client:generate`；`corepack pnpm nx run shared-api-client:check`                                        | Pass   | `shared-api-client:check` 首次并行运行产生假阳性，串行重跑后通过      |
| Migration / schema check         | No       | `corepack pnpm nx run poms-api:seeder-run`                                                                                                                                        | Pass   | 本切片不改 schema；用 seeder 校验现有 schema / fixture 与新增命令兼容 |

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                 |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 不接受通过管理员 route 放宽权限来替代当前用户自助写侧 |

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-21`
- Conditions:
  1. `PATCH /auth/profile` 只承载当前用户自助更新，不得混入 path/body target override。
  2. `UpdateCurrentUserProfileRequest` 与 `UpdatePlatformUserRequest` 分离命名，即使字段局部重叠。
  3. 联系方式变化时必须由写侧统一回退 verification flag，并在审计中留下可解释 before/after 证据。
