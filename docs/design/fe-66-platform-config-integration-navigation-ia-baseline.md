# FE-66 平台配置集成与连接导航 IA 重组实施基线包

- Gate Status: `Pass`
- Parent: `FE-66`
- Owner: `Codex`
- Slice Type: `frontend-only + navigation SSOT docs`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-10
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-66`

## 1. 范围

- 本次目标:
  - 将平台配置从扁平菜单重组为面向管理员任务的分组 IA。
  - 冻结“集成与连接”作为飞书 / 钉钉 / 企业微信 / 文件存储等外部能力入口的导航分组。
  - 将现有“外部身份提供商”页面在用户可见导航和面包屑中重命名为“企业协同接入”。
  - 将现有“附件存储提供商”页面在用户可见导航和面包屑中重命名为“文件存储接入”。
  - 同步后端 `NAVIGATION_TREE`、Admin 静态 fallback 菜单、路由面包屑、导航设计与路由对照表。
- 本次明确不做:
  - 不新增外部 OA 接入后端抽象、表、API、OpenAPI 或 generated client。
  - 不实现飞书 / 钉钉 / 企业微信组织同步运行时、部门映射、差异预览或同步记录。
  - 不重构 OBS / local 附件存储运行时模型，也不把对象存储并入企业协同后端模型。
  - 不修改既有路由 path、权限 key、公共 API route surface 或数据库。
- 下游可依赖的交付边界:
  - 平台配置导航分组、展示名称和页面面包屑的第一版 IA。
  - `platform.identity-providers` 与 `platform.attachment-storage-providers` 仍是稳定导航 key。
  - 既有 `/platform/identity-providers` 与 `/platform/attachment-storage-providers` 路由保持可达。
- 不允许下游依赖的留白:
  - 不得认为 `企业协同接入` 已经具备组织同步模型。
  - 不得认为 `文件存储接入` 与飞书 / 钉钉配置共享同一后端 provider 抽象。
  - 不得依赖本片新增任何外部系统连接 CRUD API。

## 2. 正式输入

| Input Type                | Document / Source                                 | Section / Anchor                         | Status | Notes                                                     |
| ------------------------- | ------------------------------------------------- | ---------------------------------------- | ------ | --------------------------------------------------------- |
| Business design           | 本次用户确认的 IA 决策                            | 平台配置、集成与连接、组织同步与部门映射 | Pass   | 用户已同意先做 IA 与导航重组，不把 OBS 并入 OA 后端重构。 |
| Navigation design         | `platform-governance/navigation-design.md`        | 节点类型、权限过滤、路线对照             | Pass   | `collapsable` 已是契约类型，可用于中间层分组。            |
| Route mapping             | `platform-governance/navigation-route-mapping.md` | 第一阶段对照表                           | Pass   | 本片同步补齐现有平台配置叶子节点。                        |
| Current navigation SSOT   | `apps/poms-api/.../navigation.constants.ts`       | `NAVIGATION_TREE`                        | Active | 后端导航常量树是当前运行时 SSOT。                         |
| Current Admin routes      | `apps/poms-admin/src/app.routes.ts`               | `/platform/*`                            | Active | 本片只改面包屑，不改 path 或 guard。                      |
| DTO / OpenAPI design      | `NavigationItem` shared contract                  | `NavigationItemTypeValue.Collapsable`    | Reuse  | 契约已支持本片所需树形层级。                              |
| Route inventory / ADR-015 | `N/A`                                             | `N/A`                                    | N/A    | 不新增、变更或删除 public API route surface。             |
| Query boundary            | `N/A`                                             | `N/A`                                    | N/A    | 不新增查询模型。                                          |
| Data model / table freeze | `N/A`                                             | `N/A`                                    | N/A    | 不改持久化。                                              |
| Schema / DDL              | `N/A`                                             | `N/A`                                    | N/A    | 不改 schema。                                             |
| ADR                       | `ADR-003`、`ADR-009`                              | 导航 SSOT、父组可见性                    | Pass   | 继续遵循后端导航 SSOT 与任一子项可见则父组可见。          |

## 3. 本次 SSOT

| Concern                     | SSOT                                            | Implementation Rule                                                  |
| --------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| Business semantics          | 本 baseline + `navigation-design.md`            | 平台配置按用户任务分组，不再把新增平台能力全部平铺。                 |
| Public route canonical path | `N/A`                                           | 不改 public API route surface；Admin UI route path 也保持不变。      |
| Route / command naming      | `app.routes.ts` + `navigation-route-mapping.md` | 只改用户可见 breadcrumb / title，不改 route path 或 permission key。 |
| DTO / contract naming       | `NavigationItem` shared contract                | 复用 `group/basic/collapsable`，不新增契约字段。                     |
| Table / column naming       | `N/A`                                           | 不改表和字段。                                                       |
| Date / time semantics       | `N/A`                                           | 不涉及。                                                             |
| Identifier semantics        | 既有 navigation key                             | 叶子 key 稳定；新增中间层 key 只承担 IA 容器语义。                   |
| Money / decimal semantics   | `N/A`                                           | 不涉及。                                                             |
| Status machine              | `N/A`                                           | 不涉及。                                                             |

## 4. 平台配置目标 IA

```text
平台配置
├─ 人员与权限
│  ├─ 用户管理
│  └─ 角色与权限
├─ 组织架构
├─ 集成与连接
│  ├─ 企业协同接入
│  │  └─ 当前承接飞书身份认证、账号绑定和用户搜索配置；后续扩展组织同步能力
│  └─ 文件存储接入
│     └─ 当前承接本地存储和华为云 OBS 配置
├─ 业务配置
│  ├─ 业务字典
│  └─ 系统设置
└─ 系统治理
   └─ 导航菜单
```

### 4.1 名称与职责边界

| 导航语义     | 本次用户可见名称 | 当前承载                     | 后续扩展方向                        | 本片边界                         |
| ------------ | ---------------- | ---------------------------- | ----------------------------------- | -------------------------------- |
| 人员与权限   | 人员与权限       | 用户管理、角色与权限         | 账号生命周期、权限治理              | 仅新增容器，不改页面。           |
| 组织架构     | 组织架构         | 组织树 / 组织管理            | 外部组织同步入口可在后续进入此域    | 本片不实现组织同步。             |
| 集成与连接   | 集成与连接       | 企业协同接入、文件存储接入   | Feishu / DingTalk / WeCom / Storage | 只做导航分组，不做统一后端模型。 |
| 企业协同接入 | 企业协同接入     | 现有身份提供商配置页         | 基础连接、登录与账号、组织同步能力  | 本片保留旧 route 和 API。        |
| 文件存储接入 | 文件存储接入     | 现有附件存储 provider 配置页 | local / OBS / 默认存储策略          | 本片不重构上传或存储 provider。  |
| 业务配置     | 业务配置         | 业务字典、系统设置           | 业务可配置项、运行时设置            | 仅新增容器，不改设置模型。       |
| 系统治理     | 系统治理         | 导航菜单                     | 审计、导航治理、后续平台治理工具    | 仅调整层级。                     |

### 4.2 组织同步与部门映射后续关系

后续组织同步不应作为“企业协同接入”页面中的孤立按钮完成，而应在“组织架构 / 外部同步”工作流中承载：

- `组织同步` 是管理员执行的工作流能力：选择同步源、预览差异、确认应用、查看记录。
- `部门映射` 是组织同步中的配置数据：外部部门 ID 与 POMS `OrgUnit` 的关系、冲突状态和人工确认结果。
- 当同时存在飞书与钉钉时，应建模为多个 `ExternalOrgSource`，但默认一个 POMS 组织子树只能有一个权威同步源；跨源冲突进入人工处理队列。
- 企业协同接入页面负责连接和授权能力；组织架构页面负责业务组织事实的同步与治理。

## 5. 命令与接口边界

| Route / Controller                             | Command / Service       | Request DTO / Contract | Response DTO / Contract | Guard / Permission                             | Design Source          | Result |
| ---------------------------------------------- | ----------------------- | ---------------------- | ----------------------- | ---------------------------------------------- | ---------------------- | ------ |
| `GET /navigation`                              | 既有 navigation service | N/A                    | `NavigationItem[]`      | 当前用户权限                                   | `navigation-design.md` | Reuse  |
| `GET /platform/navigation-items`               | 既有 platform service   | N/A                    | `NavigationItem[]`      | `platform:navigation:manage`                   | `navigation-design.md` | Reuse  |
| Admin `/platform/identity-providers`           | N/A                     | N/A                    | N/A                     | `platform:identity-providers:manage`           | 本 baseline            | Reuse  |
| Admin `/platform/attachment-storage-providers` | N/A                     | N/A                    | N/A                     | `platform:attachment-storage-providers:manage` | 本 baseline            | Reuse  |

### 5.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `N/A`
- Canonical route(s): `N/A`
- Current implemented route(s): `N/A`
- Inventory status: `N/A`
- Route governance source: `N/A`
- Blocker / exception: 本片不触及 public API route surface；只改变导航树内容和 Admin 用户可见文案。

## 6. 读侧边界

| Query / View               | Consumer            | Fields                      | Filter / Sort                      | Permission Boundary                  | Design Source          | Result |
| -------------------------- | ------------------- | --------------------------- | ---------------------------------- | ------------------------------------ | ---------------------- | ------ |
| `NAVIGATION_TREE` filtered | Admin left menu     | title/icon/link/children    | `displayOrder` + permission filter | 既有 navigation permission filtering | `navigation-design.md` | Update |
| Static fallback menu       | Admin left menu     | label/icon/routerLink/items | source order                       | 仅 fallback，无权限过滤              | 本 baseline            | Update |
| Admin route breadcrumb     | Header / breadcrumb | breadcrumb                  | N/A                                | Route guard unchanged                | 本 baseline            | Update |

## 7. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
| N/A   | N/A       | N/A                 | N/A                 | 不改持久化。 |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result   |
| ----- | --------------------- | --------------- | ------ | ------------------------- | -------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | 不涉及。 |

## 8. 一致性结论

- Document -> code: 本片更新 baseline、导航设计、路由对照表、导航常量、fallback 菜单与路由面包屑。
- ADR-015 inventory -> route: 不触及 public API route surface，`N/A`。
- Migration -> entity: 不涉及。
- Entity -> contract: 不涉及。
- Route -> command: Admin route path 和 guard 保持不变。
- Query -> view: 导航返回树和 Admin 菜单层级同步调整。
- Guard / permission: 叶子权限 key 不变；新增容器不设置独立权限，继续由子节点派生可见性。
- OpenAPI / generated client: 契约字段不变，不需要生成。

## 9. 测试与校验

| Check                            | Required | Command / Evidence                                                                                              | Result | Gap / Reason                                                                                                                                                                                                           |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access` | Pass   | 三个 lint target 均通过；`poms-admin-e2e` 无 lint target。                                                                                                                                                             |
| Build                            | Yes      | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                          | Pass   | Admin build 首次因 `shared-contracts` d.ts 本地输出缺失触发 TS6305；执行 `corepack pnpm exec tsc -b libs/shared/contracts/tsconfig.lib.json --pretty false --force` 后重跑通过，归类为本地 cache / build output 问题。 |
| Unit tests                       | Yes      | Navigation service / Admin route, page and AuthStore focused specs                                              | Pass   | `navigation.service`、`app.routes`、`identity-provider-list`、`attachment-storage-provider-list`、`auth.store` focused specs 均通过。                                                                                  |
| API / integration tests          | No       | `N/A`                                                                                                           | N/A    | 不改 API 行为、命令或持久化。                                                                                                                                                                                          |
| E2E                              | No       | `N/A`                                                                                                           | N/A    | 本片只重组菜单 IA；若后续浏览器验收发现问题再补 smoke。                                                                                                                                                                |
| OpenAPI generation / client diff | No       | `N/A`                                                                                                           | N/A    | 不改 DTO schema 或 route surface。                                                                                                                                                                                     |
| Migration / schema check         | No       | `N/A`                                                                                                           | N/A    | 不改 schema。                                                                                                                                                                                                          |
| Markdown format                  | Yes      | `corepack pnpm run format:md:check`                                                                             | Pass   | Docs table formatting pass。                                                                                                                                                                                           |
| Diff sanity                      | Yes      | `git diff --check`                                                                                              | Pass   | No whitespace errors。                                                                                                                                                                                                 |

## 10. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 当前无例外。 |

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-10
- Conditions:
  - 代码实现不得修改 route path、permission key、OpenAPI、generated client、migration 或 OBS / Feishu 后端运行时模型。
  - G3 必须至少提供导航 focused tests、Admin focused tests、API/Admin lint/build、Markdown format check 与 diff check 结果。

## 12. G3 本地验证结果

| 检查                     | 命令 / 证据                                                                                                                | 结果 | 备注                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| API navigation focused   | `NX_DAEMON=false corepack pnpm nx test poms-api --runInBand --testPathPatterns=navigation.service.spec.ts`                 | Pass | 1 suite / 16 tests passed                          |
| Admin route focused      | `NX_DAEMON=false corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes.spec.ts`                       | Pass | 1 suite / 9 tests passed                           |
| Enterprise access page   | `NX_DAEMON=false corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list.spec.ts`           | Pass | 1 suite / 10 tests passed                          |
| File storage access page | `NX_DAEMON=false corepack pnpm nx test poms-admin --runInBand --testPathPatterns=attachment-storage-provider-list.spec.ts` | Pass | 1 suite / 10 tests passed                          |
| AuthStore menu adapter   | `NX_DAEMON=false corepack pnpm nx test poms-admin --runInBand --testPathPatterns=auth.store.spec.ts`                       | Pass | 1 suite / 10 tests passed                          |
| API lint                 | `NX_DAEMON=false corepack pnpm nx lint poms-api`                                                                           | Pass | No lint errors                                     |
| Admin lint               | `NX_DAEMON=false corepack pnpm nx lint poms-admin`                                                                         | Pass | No lint errors                                     |
| Data access lint         | `NX_DAEMON=false corepack pnpm nx lint admin-data-access`                                                                  | Pass | No lint errors                                     |
| Admin E2E lint target    | `NX_DAEMON=false corepack pnpm nx lint poms-admin-e2e`                                                                     | N/A  | Project has no lint target                         |
| API build                | `NX_DAEMON=false corepack pnpm nx build poms-api`                                                                          | Pass | Production API build passed                        |
| Admin build              | `NX_DAEMON=false corepack pnpm nx build poms-admin`                                                                        | Pass | Passed after forced `shared-contracts` tsc rebuild |
| Markdown format          | `corepack pnpm run format:md:check`                                                                                        | Pass | Docs table formatting pass                         |
| Diff sanity              | `git diff --check`                                                                                                         | Pass | No whitespace errors                               |

## 13. G3 结论

`FE-66` 已推进到本地 `G3 / Ready for Review`。本片完成平台配置导航 IA 重组、动态导航 SSOT、Admin fallback 菜单、路由面包屑、用户可见页面标题和配套设计 / 路由对照文档同步；叶子 route path、permission key、OpenAPI、generated client、database migration、OBS / Feishu 运行时模型均未改变。

后续组织同步、部门映射、多 OA 权威源与差异预览仍需独立 `cross-layer-high-risk` 或后端治理切片冻结后再实施。

## 14. G4 结论

- Gate Status: `Done`
- G4 Date: 2026-06-10
- Runtime Commit: 本提交
- Tracker Status: `Done`
- Delivered Boundary:
  - 动态导航 SSOT 已按平台配置新 IA 重组。
  - Admin fallback 菜单、路由面包屑、页面标题与测试断言已同步。
  - `navigation-design.md` 与 `navigation-route-mapping.md` 已补齐平台配置容器和现有平台叶子路由。
  - 既有 route path、permission key、OpenAPI、generated client、database migration、OBS / Feishu 运行时模型均未改变。
- Downstream Rule:
  - 下游可以依赖 `FE-66` 的导航 IA、用户可见命名和容器 key。
  - 下游不得把 `FE-66` 解释为组织同步、部门映射、多 OA 冲突处理或统一外部系统 provider 后端模型已经落地。
