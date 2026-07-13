# EX-77A / FE-74 飞书绑定候选资料补全与结果表可读性实施基线包

- Gate Status: `Pass`
- Parent: GitHub issue `#30`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Wang Zishi`
- G1 Date: `2026-07-13`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-77A / FE-74`

## 1. 范围

- 本次目标:
  - 将飞书用户绑定候选搜索从单一 `search/v1/user` 调用收口为“搜索命中 + 受控资料补全”。
  - 基于搜索命中的 `open_id`、`department_ids` 补全管理员可见的部门名称、邮箱和手机号；POMS 自动申请并诊断该能力所需的 OAuth scopes。
  - 在既有用户详情的绑定弹窗中，以稳定列宽、技术标识渐进披露、操作列不换行和横向兜底交付可读结果表。
- 本次明确不做:
  - 不新增 public route、数据库表、migration、长期通讯录镜像或缓存表。
  - 不做用户同步、POMS 用户自动创建、角色或组织映射、外部身份绑定写命令重构。
  - 不接入钉钉、企业微信或其他 OA adapter；不修改外部组织同步运行时。
- 下游可依赖的交付边界:
  - B13 `searchExternalUsers` 返回的候选人资料来源、字段可用性和展示语义稳定；用户绑定管理员无需手填飞书 scope。
- 不允许下游依赖的留白:
  - 不保证飞书未配置、当前管理员不可见或资料本身为空的字段存在；这些情况必须以结构化字段状态或诊断呈现，不能伪装为“无数据”。

## 2. 正式输入

| Input Type                | Document / Source                                                                                                   | Section / Anchor                          | Status | Notes                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| Business design           | GitHub issue `#30`                                                                                                  | 背景、目标、验收清单                      | Active | 真实飞书测试发现候选人资料缺失与结果表断行。                                 |
| Command design            | `apps/poms-api/src/app/features/identity-provider/identity-provider.service.ts`                                     | `searchExternalUsers`                     | Active | 复用当前管理员 grant、审计和 B13 command。                                   |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`                                                                 | `ExternalUserCandidateSchema`             | Active | 既有查询响应扩展字段语义；不新增 endpoint。                                  |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                                                      | `platform-identity / searchExternalUsers` | Active | canonical route 已登记且保持不变。                                           |
| Provider API contract     | [飞书搜索用户](https://open.feishu.cn/document/server-docs/contact-v3/user/search-users?lang=zh-CN)                 | response example                          | Active | 搜索只返回 `department_ids`，不返回邮箱或手机号。                            |
| Provider API contract     | [飞书获取单个用户信息](https://open.feishu.cn/document/server-docs/contact-v3/user/get)                             | response、field scopes                    | Active | 资料补全使用 `open_id` 和 `user_access_token`，字段受 scope 与可见范围限制。 |
| Provider scopes           | [飞书 API 权限列表](https://open.feishu.cn/document/server-docs/application-scope/scope-list)                       | 通讯录 scope                              | Active | scope key 与字段能力以官方权限列表为准。                                     |
| Query boundary            | `apps/poms-admin/src/app/features/user-management/user-external-identity-panel.ts`                                  | 绑定弹窗候选结果表                        | Active | 同一用户旅程收口内容层级、空值语义和响应式布局。                             |
| Data model / table freeze | `poms.identity_provider_oauth_grant` / `poms.external_identity`                                                     | existing EX-64 persistence                | N/A    | 只读取和更新既有 grant 使用/错误审计，不新增字段或表。                       |
| Schema / DDL              | Existing migrations                                                                                                 | N/A                                       | N/A    | 本片无 DDL。                                                                 |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md` / `docs/adr/014-design-execution-state-model-and-governance-gates.md` | B13 / G1                                  | Active | 既有路径保持 canonical；GitHub issue-first 承载任务状态。                    |

## 3. 本次 SSOT

| Concern                     | SSOT                                                                            | Implementation Rule                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Business semantics          | GitHub issue `#30` + 本基线                                                     | 候选资料是绑定前核验信息，不是通讯录同步或 POMS 用户资料来源。                                                             |
| Public route canonical path | `GET /platform/identity-providers/{id}/external-users`                          | 路径、method、guard 和 query 参数保持不变；只扩展既有 response DTO。                                                       |
| Route / command naming      | `searchExternalUsers`                                                           | 保持命名；内部拆分 search hit、profile enrichment 与 department resolution，不暴露 provider-specific command。             |
| DTO / contract naming       | `ExternalUserCandidate`                                                         | 保留已有字段；新增资料可用性字段必须区分 `available`、`not-provided`、`not-returned`，不把未读取说成无数据。               |
| Provider identifier         | 飞书 `open_id`、`open_department_id`                                            | `open_id` 是搜索命中和用户详情的应用内外部标识；部门 ID 仅在 adapter 内用于解析名称，不能误写为 POMS UUID。                |
| Scope semantics             | provider capability registry                                                    | 管理员只启用“用户绑定候选资料补全”能力；POMS 负责合并、去重、上限校验、OAuth 请求与缺失诊断，不暴露必需 scope 手填。       |
| Field privacy semantics     | 飞书 detail response + capability grant + caller visibility                     | 用户可见范围、应用权限和字段为空须分别处理；detail 请求未成功时不能落空值冒充真实资料。                                    |
| Date / time semantics       | Existing OAuth grant fields                                                     | 仅复用 `lastUsedAt`、`lastError` 等既有 datetime 审计语义。                                                                |
| Status machine              | Existing `IdentityProviderOAuthGrantStatus` and new candidate availability enum | grant 不满足能力时阻断搜索并引导重新授权；候选资料 limited 不影响已返回 search hit 的选择，除非无法保证 subject identity。 |

## 4. 命令与接口边界

| Route / Controller                                     | Command / Service                                        | Request DTO / Contract         | Response DTO / Contract                                       | Guard / Permission                | Design Source               | Result |
| ------------------------------------------------------ | -------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------- | --------------------------------- | --------------------------- | ------ |
| `GET /platform/identity-providers/{id}/external-users` | `IdentityProviderService.searchExternalUsers`            | `ExternalUserSearchQuery`      | extended `ExternalUserSearchResult` / `ExternalUserCandidate` | `platform:users:manage`           | B13 + issue `#30`           | Active |
| internal provider adapter                              | Feishu search hit + profile enrichment + department name | internal typed provider inputs | provider-neutral candidate with availability                  | current admin `user_access_token` | 飞书 official API contracts | Active |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route: `GET /platform/identity-providers/{id}/external-users`
- Current implemented route: `GET /platform/identity-providers/{id}/external-users`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + existing B13 inventory row
- Blocker / exception: 无。该 slice 不新增或改名 route；OpenAPI / generated client 必须随 response contract 同步。

## 5. 读侧边界

| Query / View                      | Consumer                         | Fields                                                                                                         | Filter / Sort                        | Permission Boundary                                                                                        | Design Source    | Result |
| --------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| Feishu user search                | adapter search-hit stage         | `open_id`、`user_id`、`name`、avatar、`department_ids`                                                         | existing `q` / `limit` (1..50)       | `contact:user:search` + current admin visibility                                                           | 飞书搜索用户     | Active |
| Feishu user detail batch          | adapter profile-enrichment stage | email、mobile、`department_ids`、头像、display name                                                            | bounded by search page size          | `contact:contact.base:readonly` plus user department/email/phone field scopes and current admin visibility | 飞书获取用户信息 | Active |
| Feishu department name resolution | adapter department resolver      | `open_department_id` -> department name                                                                        | unique IDs only; request-local cache | `contact:department.base:readonly` + current admin visibility                                              | 飞书部门 API     | Active |
| Admin binding result table        | `UserExternalIdentityPanel`      | primary name, department, contact fields, Subject ID progressive disclosure, availability/diagnostic semantics | no client-side data fabrication      | inherits B13 `platform:users:manage`; never exposes access/refresh tokens                                  | issue `#30`      | Active |

### 5.1 Provider capability package

The default Feishu capability package for binding-candidate enrichment is the deduplicated union of:

1. `contact:user:search`
2. `contact:contact.base:readonly`
3. `contact:user.department:readonly`
4. `contact:department.base:readonly`
5. `contact:user.email:readonly`
6. `contact:user.phone:readonly`

POMS must present these as product capabilities and authorization readiness, not editable mandatory scope text. Existing advanced extra scopes remain additive only and share the existing total scope capacity rule.

### 5.2 Enrichment and availability rules

1. Search hits are authoritative only for identity discovery. The adapter reads `department_ids`; it must not read undocumented `department_names` as the primary source.
2. Detail enrichment is bounded to one requested search page, uses bulk provider calls where supported, and otherwise uses deduplicated IDs, bounded concurrency, and request-local caching. No unbounded per-row provider calls.
3. A valid detail response with a supplied empty/null value is `not-provided`; a field omitted by provider response is `not-returned`; a required capability missing is a blocking authorization diagnostic, not a synthetic null candidate field.
4. A provider detail/department visibility failure produces a limited candidate diagnostic without exposing provider tokens or raw secret-bearing payloads. Search hits stay usable only when their subject ID remains validated.
5. The UI labels `not-provided` as “未提供”, `not-returned` as “飞书未返回”, and blocking authorization/visibility as an actionable diagnostic. It must not use “无邮箱 / 无手机 / 未返回” for all three conditions.

## 6. 持久化边界

| Table                                | Migration | Entity / Repository               | DDL / Freeze Source | Check Result |
| ------------------------------------ | --------- | --------------------------------- | ------------------- | ------------ |
| `poms.identity_provider_oauth_grant` | N/A       | existing grant repository/service | EX-64 / EX-76A      | Reuse        |
| `poms.external_identity`             | N/A       | existing bind command             | EX-64               | Reuse        |

| Field / Model                         | Design Type / Meaning                                              | Migration / DDL | Entity / Adapter / Contract                   | Shared Contract / OpenAPI                  | Result |
| ------------------------------------- | ------------------------------------------------------------------ | --------------- | --------------------------------------------- | ------------------------------------------ | ------ |
| `departmentIds` internal provider hit | `string[]`, external `open_department_id` values                   | N/A             | adapter internal only                         | not persisted                              | Active |
| `departmentNames`                     | `string[]`, resolved display names; max 16                         | N/A             | provider-neutral candidate                    | existing field, semantic correction        | Active |
| candidate availability                | explicit enum / field-set status; no token or raw provider payload | N/A             | service maps provider outcomes                | additive DTO/OpenAPI field                 | Active |
| `email` / `mobile`                    | nullable detail data only after successful enrichment              | N/A             | adapter reads documented user detail response | existing fields, corrected source boundary | Active |

## 7. 一致性结论

- Document -> code: existing adapter test fixture assumes undocumented search fields; EX-77A corrects it to the official search-hit contract and adds detail enrichment fixtures.
- ADR-015 inventory -> route: aligned; existing B13 route remains unchanged.
- Migration -> entity: N/A; no persistence schema change.
- Entity -> contract: only existing grant audit updates; candidate DTO is a read contract and must update OpenAPI/generated client.
- Route -> command: controller remains a thin mapper to `searchExternalUsers`; service owns readiness, audit and provider orchestration.
- Query -> view: view consumes field availability rather than interpreting `null` as “not provided”.
- Guard / permission: B13 `platform:users:manage` unchanged; provider visibility derives from the authorizing administrator's `user_access_token` and must not be elevated silently.
- OpenAPI / generated client: required because `ExternalUserCandidate` changes.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                            | Result  | Gap / Reason |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- | ------- | ------------ |
| API adapter tests                | Yes      | Feishu search returns `department_ids`; user/department enrichment, missing field, visibility and error cases | Pending |              |
| API service tests                | Yes      | capability scope union, grant diagnostics, audit and candidate mapping                                        | Pending |              |
| Admin component tests            | Yes      | availability labels, stable action, long ID and table layout classes                                          | Pending |              |
| Browser verification             | Yes      | desktop and narrow viewport: long ID, multi-department, empty data and authorization diagnostics              | Pending |              |
| Lint                             | Yes      | `poms-api`, `poms-admin`, affected data-access / contracts projects                                           | Pending |              |
| Build                            | Yes      | `poms-api`, `poms-admin`                                                                                      | Pending |              |
| Unit tests                       | Yes      | focused API/Admin tests; broaden if shared adapter regression requires it                                     | Pending |              |
| API / integration tests          | Yes      | controller response contract and permission guard regression                                                  | Pending |              |
| E2E                              | Yes      | explicit browser smoke decision and evidence                                                                  | Pending |              |
| OpenAPI generation / client diff | Yes      | `poms-api:openapi`, `shared-api-client:check`                                                                 | Pending |              |
| Migration / schema check         | No       | no table/entity DDL change                                                                                    | N/A     |              |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                   |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------- |
| None         | N/A   | N/A   | N/A         | N/A           | N/A         | No exception requested. |

Risks to validate during G2:

1. The Feishu application must publish the added field scopes before administrators can grant them; POMS must make this a clear authorization diagnostic.
2. `user_access_token` reads remain constrained by the authorizing administrator's organization visibility; POMS must not fall back to tenant access token because that would silently widen data access.
3. Department name resolution must be bulked or bounded/cached; no unbounded N+1 calls for a 50-item search page.

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Wang Zishi`
- Approved At: `2026-07-13`
- Conditions:
  1. Keep B13 path and permission unchanged; treat the response extension as an OpenAPI/generated-client change.
  2. Implement capability-driven required scopes for the full candidate-information contract; do not reintroduce mandatory scope hand-entry.
  3. Do not convert provider omissions into `null` values without availability semantics.
  4. No code begins until this baseline, route alignment and GitHub G1 comment are synchronized.
