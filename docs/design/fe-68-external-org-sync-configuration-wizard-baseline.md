# FE-68 外部组织同步配置向导实施基线

- Gate Status: `G3 Ready for Review`
- Parent: `#8`
- GitHub Issue: `#9`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-16
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-68`

## 1. 范围

- 本次目标:
  - 将外部组织同步“新建同步源”从单页字段表单收口为面向管理员任务的配置向导。
  - 向导覆盖选择平台、选择企业协同接入、组织同步可用性诊断、同步范围配置、保存草稿 / 保存并生成预览。
  - 无可用接入配置、草稿 / 配置异常 / 未启用 / secret 缺失等状态必须在向导内直接阻断或提示修复入口。
  - 保存并生成预览时复用既有 create source、activate source、create preview run 链路，不在前端复制后端 readiness 判断。
- 本次明确不做:
  - 不新增或修改后端 API、DTO、OpenAPI、generated client、migration 或权限 key。
  - 不实现同步运行历史、诊断详情抽屉或运行列表；这些由 `#12` 承接。
  - 不实现部门映射冲突处理、忽略 / 恢复和 per-row mapping command；这些由 `#10` 承接。
  - 不实现 DingTalk / WeCom 组织同步、用户同步、权限同步或配置自动发现。
- 下游可依赖的交付边界:
  - 首次新建 Feishu 同步源时，管理员按向导完成配置并能直接触发预览。
  - 不可用接入配置不会成为正常可选路径；管理员能从向导跳转企业协同接入修复。
  - 编辑已有同步源仍复用当前配置编辑边界，不改变 source lifecycle command 语义。
- 不允许下游依赖的留白:
  - 不应依赖本片提供历史运行追溯或诊断复制能力。
  - 不应依赖本片修改预览失败的后端诊断字段。
  - 不应依赖本片把同步范围配置升级为权限申请自动化。

## 2. 正式输入

| Input Type                | Document / Source                                                                      | Section / Anchor                  | Status | Notes                                                 |
| ------------------------- | -------------------------------------------------------------------------------------- | --------------------------------- | ------ | ----------------------------------------------------- |
| Business design           | GitHub issue `#9`                                                                      | Scope / acceptance criteria       | Pass   | 明确配置向导、接入诊断、保存后预览和无可用配置阻断。  |
| Prior frontend baseline   | `docs/design/archive/slices/fe-67-external-org-sync-workbench-baseline.md`             | Workbench route / UI boundary     | Pass   | 复用当前 `/platform/external-org-sync` 页面和 store。 |
| Lifecycle command input   | `docs/design/archive/slices/ex-73b-external-org-source-lifecycle-actions-baseline.md`  | Source create / activate commands | Pass   | 新建先草稿，启用必须走 activate command。             |
| Readiness diagnostic      | `docs/design/archive/slices/ex-73d-identity-provider-org-sync-diagnostics-baseline.md` | External org sync capability      | Pass   | `testConnection` 是组织同步 readiness SSOT。          |
| Integration readiness     | `docs/design/archive/slices/ex-73a-platform-integration-readiness-baseline.md`         | provider config ready guard       | Pass   | 不可用 config 需禁用并展示原因。                      |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                         | B13 / B18 existing rows           | Pass   | 本片不新增 public route。                             |
| Current implementation    | `external-org-sync-workbench.ts` / `.spec.ts`                                          | source dialog, save, diagnostics  | Rework | 保留已有 store/API 调用，替换新建交互形态。           |

## 3. 本次 SSOT

| Concern                     | SSOT                              | Implementation Rule                                                                    |
| --------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| Business semantics          | `#9` + 本基线                     | 新建同步源是任务向导，不是字段表单；状态由动作表达。                                   |
| Public route canonical path | B13 / B18 route inventory         | 不新增 route，不改 controller / OpenAPI / generated client。                           |
| Route / command naming      | Existing generated client methods | `createSource` -> optional `activateSource` -> optional `createPreviewRun`。           |
| DTO / contract naming       | Existing generated client         | 只消费现有 request/response；不新增字段。                                              |
| Table / column naming       | N/A                               | 不改持久化。                                                                           |
| Date / time semantics       | N/A                               | 不新增日期字段。                                                                       |
| Identifier semantics        | Existing source/provider ids      | provider config id、org unit id 仍为 POMS UUID；external root department id 是字符串。 |
| Money / decimal semantics   | N/A                               | 不涉及金额。                                                                           |
| Status machine              | EX-73B / EX-73D                   | Draft / active 由 create/activate 表达；diagnostic success 才允许保存并生成预览。      |

## 4. UI 与交互边界

| Area                   | FE-68 Behavior                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Entry                  | 顶部“新建同步源”打开配置向导；保留编辑已有 source 的配置弹窗路径。                                |
| Step 1 platform        | 默认 Feishu；DingTalk / WeCom 显示为暂不支持组织同步，不允许继续启用路径。                        |
| Step 2 provider config | 展示 Feishu 企业协同接入候选；不可用 config disabled，并展示原因和“前往企业协同接入”。            |
| Step 3 readiness       | 选择 config 或修改根部门后触发 EX-73D 诊断；诊断失败不能保存并生成预览。                          |
| Step 4 scope / review  | 配置名称、外部租户、根部门、权威组织、同步范围；汇总草稿 / 启用 / 预览动作的结果。                |
| Save draft             | 允许保存 Feishu 草稿；如果绑定企业协同接入，仍需满足 provider/providerConfig 兼容性。             |
| Save and preview       | 创建 source，诊断通过后 activate，再立即 create preview run；失败时保留错误 toast 与当前 run UI。 |
| Empty / no config      | 无可用企业协同接入时，向导不让用户误走保存并启用路径，并提供修复入口。                            |

## 5. 命令与接口边界

| Route / Controller                                             | Admin Call                              | Request DTO / Contract | Response DTO / Contract | Guard / Permission                                       | Result |
| -------------------------------------------------------------- | --------------------------------------- | ---------------------- | ----------------------- | -------------------------------------------------------- | ------ |
| `GET /platform/identity-providers`                             | `IdentityProviderStore.loadConfigs`     | unchanged              | unchanged               | existing identity provider permission                    | reused |
| `POST /platform/identity-providers/{id}:testConnection`        | `IdentityProviderStore.testConnection`  | unchanged              | unchanged               | existing identity provider permission                    | reused |
| `POST /platform/external-org-sources`                          | `ExternalOrgSyncStore.createSource`     | unchanged              | unchanged               | `platform:org-units:manage` + `platform:org-sync:manage` | reused |
| `POST /platform/external-org-sources/{id}:activate`            | `ExternalOrgSyncStore.activateSource`   | unchanged              | unchanged               | same                                                     | reused |
| `POST /platform/external-org-sources/{sourceId}/org-sync-runs` | `ExternalOrgSyncStore.createPreviewRun` | unchanged              | unchanged               | same                                                     | reused |

### 5.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): B13 `testConnection`, B18 source create / activate / preview run routes.
- Current implemented route(s): same.
- Inventory status: `aligned`
- Route governance source: `ADR-015` + EX-72 / EX-73 baselines.
- Blocker / exception: none; no route-surface change.

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result     |
| ----- | --------- | ------------------- | ------------------- | ---------------- |
| N/A   | N/A       | N/A                 | N/A                 | no schema change |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result             |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------------------ |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | no contract change |

## 7. 一致性结论

- Document -> code: 本片消费 `#9` 和 EX-73D 诊断契约，重做新建 source 的 Admin 交互。
- ADR-015 inventory -> route: 不新增 public route，B13/B18 保持 aligned。
- Migration -> entity: N/A。
- Entity -> contract: N/A。
- Route -> command: 仅按既有 store 调用 create / activate / preview。
- Query -> view: 企业协同接入 config list 和诊断结果只在 Admin 展示，不作为新 wire contract。
- Guard / permission: 不新增权限；沿用工作台 route guard。
- OpenAPI / generated client: 不需要生成。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                            | Result  | Gap / Reason                                                                                   |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| Admin focused tests              | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=external-org-sync-workbench --skip-nx-cache` | Pass    | 23 tests，覆盖向导、无配置、异常配置、不可用配置草稿阻断、保存启用与保存生成预览。             |
| Admin lint                       | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                            | Pass    | 无 lint 问题。                                                                                 |
| Admin build                      | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                           | Pass    | Angular template / PrimeNG 编译通过；仍有既有 initial bundle budget warning，超出 495 bytes。  |
| Browser / interaction smoke      | Decision | local Admin `4201` + API `3333`                                                                               | Blocked | API health 通过；本地 `edb_v2` 使用 `admin/admin123` 登录返回“用户名或密码错误”，未运行 seed。 |
| OpenAPI generation / client diff | No       | N/A                                                                                                           | N/A     | 不改 API surface。                                                                             |
| Migration / schema check         | No       | N/A                                                                                                           | N/A     | 不改 persistence。                                                                             |
| Markdown format                  | Yes      | `corepack pnpm run format:md:check`                                                                           | Pass    | 本片新增 Markdown 已格式化。                                                                   |
| Diff sanity                      | Yes      | `git diff --check`                                                                                            | Pass    | 无尾随空白或 patch 格式问题。                                                                  |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes      |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 暂无例外。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-16
- Conditions:
  - 不新增后端 route、DTO、OpenAPI、generated client 或 migration。
  - 保存并生成预览必须复用 EX-73D readiness 诊断；不得在前端复制飞书权限判断。
  - 运行历史、诊断详情复制和部门冲突处理保持在 `#12` / `#10`，不得扩边。

## 11. G3 结论

- Gate Status: `Ready for Review`
- Reviewer: `Codex`
- Reviewed At: 2026-06-16
- Delivered:
  - 新建同步源已改为四步任务向导：平台、接入、范围、预览。
  - DingTalk / WeCom 作为暂未支持平台展示，不进入可启用路径。
  - 企业协同接入不可用时在下拉项和向导内展示阻断原因，并提供企业协同接入入口。
  - 保存草稿允许不绑定接入配置；一旦绑定配置，前端必须确认配置可用于组织同步，避免草稿 / 异常配置被误带入。
  - 保存并生成预览复用 create source -> activate source -> create preview run，不新增前后端契约。
- Remaining / Transfer:
  - 浏览器 smoke 被本地账号数据阻断；已确认 API health 可用，登录失败为本地 `edb_v2` 账号口径问题。
  - 同步运行历史仍由 `#12` 承接；部门映射冲突处理仍由 `#10` 承接。
