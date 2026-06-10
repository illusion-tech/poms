# FE-67 外部组织同步工作台实施基线

- Gate Status: `G1 Pass`
- Parent: `EX-72`
- Owner: `Codex`
- Slice Type: `frontend-only + navigation`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-10
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-67`

## 1. 范围

- 本次目标:
  - 在平台配置的组织架构域下新增外部组织同步工作台入口。
  - 新增 Admin data-access `ExternalOrgSyncStore`，消费 EX-72C/D 已生成的 `ExternalOrgSyncApi`。
  - 新增 `/platform/external-org-sync` 页面，支持 source 列表、source 创建 / 启停、部门映射查看、preview run 创建、diff items 查看和 apply。
  - 将导航中的“组织架构”调整为容器，下挂“组织单元”和“外部组织同步”两个叶子入口。
  - 回写导航设计 / route mapping / tracker / progress。
- 本次明确不做:
  - 不新增或修改后端 API、DTO、OpenAPI、generated client、migration 或权限 key。
  - 不实现可视化树拖拽、复杂映射编辑器、跨 source 冲突工作台或 E2E closeout。
  - 不重构企业协同接入页面；provider config 仍在 `/platform/identity-providers`。
  - 不自动创建用户、不自动赋权、不改变用户组织归属。

## 2. 正式输入

| Input Type        | Document / Source                                             | Section / Anchor                 | Status | Notes                                                  |
| ----------------- | ------------------------------------------------------------- | -------------------------------- | ------ | ------------------------------------------------------ |
| IA input          | `fe-66-platform-config-integration-navigation-ia-baseline.md` | 4.2 组织同步与部门映射后续关系   | Pass   | 组织同步属于组织架构工作流，不塞进企业协同接入配置页。 |
| Runtime input     | `ex-72c-external-org-sync-api-baseline.md`                    | B18 API shell / generated client | Pass   | FE 消费既有 B18 route surface。                        |
| Runtime input     | `ex-72d-external-org-sync-runtime-baseline.md`                | preview / apply runtime          | Pass   | preview / apply 已具备真实后端行为。                   |
| Current org UI    | `org-unit-list.ts`                                            | Organization management page     | Reuse  | 保持组织单元维护页不改路径、不改行为。                 |
| Navigation SSOT   | `navigation.constants.ts` + fallback `app.menu.ts`            | platform org group               | Update | “组织架构”从叶子变成容器。                             |
| Shared API client | `libs/shared/api-client/api/external-org-sync.service.ts`     | `ExternalOrgSyncApi`             | Reuse  | 本片不生成 API client，只消费已提交生成物。            |

## 3. 本次 SSOT

| Concern              | SSOT                  | Implementation Rule                                                                |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| Page route           | 本基线                | 新增 Admin route `/platform/external-org-sync`，guard 使用两个组织同步权限。       |
| Navigation placement | FE-66 + 本基线        | `platform.organization` 作为组织架构容器，保留组织单元入口并新增外部组织同步入口。 |
| Runtime behavior     | EX-72C/D              | UI 只调用 source / mapping / run / diff / apply API，不在前端重复实现 diff 规则。  |
| Visual style         | Poseidon + PrimeNG    | 使用现有 `.card` / table / dialog / button / tag / tabs，不做营销式页面。          |
| Interaction model    | Material M3 principle | 可扫描、分区明确、主动作贴近对象；危险/不可逆动作需要确认。                        |

## 4. UI 交付边界

| Area          | Behavior in FE-67                                                                   |
| ------------- | ----------------------------------------------------------------------------------- |
| Source panel  | 列出同步源，支持创建 Feishu source、选择 source、启停 source。                      |
| Mapping panel | 展示外部部门 ID、名称、父部门、映射 OrgUnit、状态、lastSeenAt。                     |
| Run panel     | 创建 preview run，展示最近一次 run 的状态、统计、错误摘要和 rowVersion。            |
| Diff panel    | 展示 diff action / status / external department / target org unit / error message。 |
| Apply action  | 默认应用 pending 非 conflict 项；支持勾选项后只应用选中项。                         |
| Empty states  | 没有 source / mapping / diff 时提供可执行的下一步动作。                             |

## 5. 导航与权限

| Route                         | Breadcrumb   | Required Permissions                                     | Navigation Key               | Result |
| ----------------------------- | ------------ | -------------------------------------------------------- | ---------------------------- | ------ |
| `/platform/org-units`         | 组织单元     | `platform:org-units:manage`                              | `platform.org-units`         | Reuse  |
| `/platform/external-org-sync` | 外部组织同步 | `platform:org-units:manage` + `platform:org-sync:manage` | `platform.external-org-sync` | Add    |

## 6. 测试与校验计划

| Check                        | Required | Command / Evidence                                                                            | Result  | Gap / Reason                                                                                                 |
| ---------------------------- | -------- | --------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| Admin focused tests          | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=external-org-sync-workbench` | Pass    | 4 tests passed，覆盖渲染、source 创建、preview run 和 apply 参数。                                           |
| Admin route focused tests    | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes.spec.ts`          | Pass    | 10 tests passed，覆盖 `/platform/external-org-sync` guard。                                                  |
| API navigation focused tests | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=navigation.service.spec.ts`    | Pass    | 17 tests passed，覆盖组织架构容器和双权限裁剪。                                                              |
| Admin lint                   | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                            | Pass    | 无新增 lint 问题；修正 app 层不得直接依赖 shared-api-client 的 Nx 边界。                                     |
| Admin data-access lint       | Yes      | `corepack pnpm nx lint admin-data-access --skip-nx-cache`                                     | Pass    | 新增 store 通过 lint。                                                                                       |
| API lint                     | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                              | Pass    | 导航 SSOT 变更通过 lint。                                                                                    |
| Admin build                  | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                                           | Pass    | 验证 generated API client 经 admin-data-access 转出后可消费。                                                |
| API build                    | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                             | Pass    | 验证导航常量变更可构建。                                                                                     |
| OpenAPI / generated client   | No       | `N/A`                                                                                         | N/A     | 不改 API surface。                                                                                           |
| Migration check              | No       | `N/A`                                                                                         | N/A     | 不改 schema。                                                                                                |
| Browser smoke                | Yes      | local API `3333` + Admin `4201`                                                               | Blocked | API/Admin dev server 均启动；`edb_v2` 当前缺少 `admin` 用户，`admin/admin123` 登录返回 invalid_credentials。 |
| Markdown format              | Yes      | `corepack pnpm run format:md:check`                                                           | Pending | 本片新增 Markdown，提交前必跑。                                                                              |
| Diff sanity                  | Yes      | `git diff --check`                                                                            | Pending | 提交前必跑。                                                                                                 |

## 7. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-10
- Conditions:
  - 不把 provider 连接配置移动到工作台；只提供跳转或选择 provider config。
  - 不在前端实现 diff 规则，前端只展示后端 diff 和触发 apply。
  - 导航容器变更必须同步 API navigation SSOT、Admin fallback 菜单、route spec 和导航设计文档。

## 8. G4 结论

- Gate Status: `Done`
- Completed By: `Codex`
- Completed At: 2026-06-10
- Delivered:
  - 新增 Admin `ExternalOrgSyncStore`，通过 `ExternalOrgSyncApi` 消费 source、mapping、run、diff 和 apply API。
  - 新增 `/platform/external-org-sync` 工作台，支持 source 创建 / 启停、部门映射查看、预览差异、勾选应用。
  - 将平台配置下的组织架构调整为容器，下挂组织单元和外部组织同步，并同步 API navigation SSOT、Admin fallback 菜单、route guard、导航设计和 route mapping。
- Known Exception:
  - 浏览器 smoke 的页面登录被本地 `edb_v2` 数据阻断：API 日志显示 `platform_user.username = admin` 查无结果。未运行全量 `DatabaseSeeder`，因为它会删除并重建大量演示数据。
