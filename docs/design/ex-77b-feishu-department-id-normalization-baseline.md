# EX-77B / BUG-13 飞书候选部门 ID 类型纠偏实施基线包

- Gate Status: `Pass`
- Parent: GitHub issue `#33`
- Owner: `Codex`
- Slice Type: `query-only`
- G1 Reviewer: `Wang Zishi`
- G1 Date: `2026-07-13`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-77B / BUG-13`

## 1. 范围

- 本次目标:
  - 修复 `FeishuIdentityProviderAdapter` 将 `search/v1/user` 命中的 `department_ids` 错当作 `open_department_id` 的回归。
  - 仅以 `GET /contact/v3/users/batch` 在 `department_id_type=open_department_id` 下返回的 `department_ids` 解析部门名称。
  - 补齐“搜索命中 ID 类型与用户详情部门 ID 类型不同”时仍能成功返回候选资料的回归测试。
- 本次明确不做:
  - 不新增或变更 public route、DTO、OpenAPI、generated client、migration、权限 key 或 OAuth scope package。
  - 不改用户同步、身份绑定写命令、grant 生命周期、部门树同步、其他 OA adapter 或 Admin 页面。
- 下游可依赖的交付边界:
  - B13 候选资料查询不会把未声明 ID 类型的搜索命中部门 ID 传给要求 `open_department_id` 的部门批量接口。
  - 部门名称与邮箱、手机号一样来自受控的用户详情补全链路；详情未返回时沿用既有 `not-returned` 语义。
- 不允许下游依赖的留白:
  - 不承诺搜索响应 `department_ids` 的格式；它只用于身份发现，不能作为部门详情查询键。

## 2. 正式输入

| Input Type                | Document / Source                                                                                                   | Section / Anchor                        | Status | Notes                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Business defect           | GitHub issue `#33`                                                                                                  | 问题、目标、验收                        | Active | 测试环境真实回归：部门批量接口返回 `400 / 99992357`。                                  |
| Existing delivery         | PR `#32` / `EX-77A` archived baseline                                                                               | adapter enrichment design               | Active | 原设计已要求搜索命中与详情补全分层；本片收紧部门 ID 的类型来源。                       |
| Provider API contract     | [飞书批量获取用户信息](https://open.feishu.cn/document/contact-v3/user/batch?lang=zh-CN)                            | `department_id_type` / response         | Active | 传入 `open_department_id` 后，用户详情的 `department_ids` 才是部门批量查询的可信输入。 |
| Provider API contract     | [飞书批量获取部门信息](https://open.feishu.cn/document/contact-v3/department/batch?lang=zh-CN)                      | `department_ids` / `department_id_type` | Active | 参数类型须与 `department_id_type` 匹配；错误 ID 会返回 provider validation failure。   |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                                                      | existing B13 `searchExternalUsers`      | Active | `GET /platform/identity-providers/{id}/external-users` 保持不变。                      |
| Runtime evidence          | `poms-test` 2026-07-13 readonly probe                                                                               | `wangzishi` / `王子实`                  | Active | search 与 user batch 成功；search hit ID 失败，detail ID 成功。                        |
| Data model / table freeze | `poms.identity_provider_oauth_grant`                                                                                | existing EX-64 / EX-76A                 | N/A    | 仅沿用既有 grant 与 error audit，不改 entity、表或迁移。                               |
| ADR                       | `docs/adr/014-design-execution-state-model-and-governance-gates.md` / `docs/adr/015-api-route-canonical-grammar.md` | G1 / B13                                | Active | issue-first 治理；既有 canonical route 不变。                                          |

## 3. 本次 SSOT

| Concern                     | SSOT                                                                | Implementation Rule                                                                              |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Business semantics          | GitHub issue `#33` + 本基线                                         | 搜索命中只发现主体；候选部门名称必须从类型已确定的详情数据解析。                                 |
| Public route canonical path | Existing B13 `GET /platform/identity-providers/{id}/external-users` | 不变；不新增 inventory 行。                                                                      |
| Route / command naming      | Existing `IdentityProviderService.searchExternalUsers`              | 不变；修复仅在 Feishu adapter 内。                                                               |
| Provider identifier         | 飞书 `open_id` / `open_department_id`                               | `open_id` 识别用户；只有 user batch 在指定 ID 类型后返回的部门 ID 可作为 department batch 入参。 |
| Field availability          | Existing `ExternalUserCandidateFieldAvailability`                   | detail 缺失或未返回部门时保留 `not-returned`；不得用 search hit ID 兜底并触发错误。              |
| Date / time semantics       | Existing OAuth grant audit fields                                   | 无变化。                                                                                         |
| Status machine              | Existing `IdentityProviderOAuthGrantStatus`                         | 无变化；本片不改变授权、过期或错误状态机。                                                       |

## 4. 命令与接口边界

| Route / Controller                                                  | Command / Service                             | Request DTO / Contract   | Response DTO / Contract               | Guard / Permission      | Design Source   | Result  |
| ------------------------------------------------------------------- | --------------------------------------------- | ------------------------ | ------------------------------------- | ----------------------- | --------------- | ------- |
| Existing B13 `GET /platform/identity-providers/{id}/external-users` | `IdentityProviderService.searchExternalUsers` | Existing query unchanged | Existing candidate response unchanged | `platform:users:manage` | B13 / issue #33 | Reuse   |
| Internal Feishu adapter                                             | search hit -> user batch -> department batch  | Internal provider inputs | Existing provider-neutral candidate   | Existing admin grant    | issue #33       | Correct |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): Existing B13 `GET /platform/identity-providers/{id}/external-users`
- Current implemented route(s): Unchanged
- Inventory status: `aligned`
- Route governance source: `ADR-015` + existing B13 row
- Blocker / exception: 无；本片不触及 public route surface、DTO 或 OpenAPI。

## 5. 读侧边界

| Query / View                   | Consumer                   | Fields                                             | Filter / Sort                | Permission Boundary                     | Design Source             | Result  |
| ------------------------------ | -------------------------- | -------------------------------------------------- | ---------------------------- | --------------------------------------- | ------------------------- | ------- |
| Feishu user search             | identity discovery         | `open_id`、display name、search hit department IDs | Existing `q` / `limit`       | Existing `user_access_token` visibility | Existing B13 / issue #33  | Reuse   |
| Feishu user detail batch       | candidate enrichment       | email、mobile、typed `department_ids`              | bounded requested page       | Existing contact scopes and visibility  | 飞书 batch user API       | Correct |
| Feishu department detail batch | department name resolution | `open_department_id` -> name                       | unique detail department IDs | Existing contact scopes and visibility  | 飞书 batch department API | Correct |

## 6. 持久化边界

| Table                                | Migration | Entity / Repository               | DDL / Freeze Source | Check Result |
| ------------------------------------ | --------- | --------------------------------- | ------------------- | ------------ |
| `poms.identity_provider_oauth_grant` | N/A       | Existing grant repository/service | EX-64 / EX-76A      | Reuse        |

| Field / Model              | Design Type / Meaning                                         | Migration / DDL | Entity / Adapter / Contract | Shared Contract / OpenAPI | Result  |
| -------------------------- | ------------------------------------------------------------- | --------------- | --------------------------- | ------------------------- | ------- |
| search-hit `departmentIds` | Opaque provider search metadata; not a typed batch lookup key | N/A             | Feishu adapter internal     | Not exposed               | Correct |
| detail `department_ids`    | `open_department_id[]` after requested `department_id_type`   | N/A             | Feishu adapter internal     | Not exposed               | Correct |
| `departmentNames`          | Resolved display names                                        | N/A             | Existing candidate mapping  | Existing response         | Reuse   |

## 7. 一致性结论

- Document -> code: EX-77A 的“搜索命中 + 详情补全”边界保留；本片纠正搜索命中部门 ID 被误用的实现漂移。
- ADR-015 inventory -> route: aligned，B13 未改。
- Migration -> entity: N/A，无 DDL 或实体变化。
- Entity -> contract: N/A，外部响应不变。
- Route -> command: unchanged；service、guard 与 audit 不变。
- Query -> view: candidate response 结构与 Admin 消费方式不变。
- Guard / permission: unchanged；使用原有管理员 `user_access_token` 与 scope package。
- OpenAPI / generated client: N/A；无 contract 变动。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                    | Result  | Gap / Reason |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- | ------- | ------------ |
| API adapter tests                | Yes      | Feishu adapter：search-hit opaque department ID、detail `open_department_id`、department batch request and candidates | Pending |              |
| API service tests                | No       | Service orchestration and public error mapping remain unchanged                                                       | N/A     |              |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                                                                                      | Pending |              |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                                                                                     | Pending |              |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand --skip-nx-cache --testPathPatterns=feishu-identity-provider`              | Pending |              |
| API / integration tests          | Yes      | Existing B13 behavior retained; live readonly provider probe plus post-deploy user journey                            | Pending |              |
| E2E                              | No       | No UI or route behavior change; post-deploy manual binding search is required                                         | N/A     |              |
| OpenAPI generation / client diff | No       | No public contract change                                                                                             | N/A     |              |
| Migration / schema check         | No       | No persistence change                                                                                                 | N/A     |              |
| Markdown / diff sanity           | Yes      | `pnpm run format:md:check` and `git diff --check`                                                                     | Pending |              |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                   |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------- |
| None         | N/A   | N/A   | N/A         | N/A           | N/A         | No exception requested. |

Risks to validate during G2:

1. User detail can be absent for a valid search hit because of visibility; the adapter must keep `not-returned` semantics rather than use the untyped search ID.
2. Department batch requests must contain only de-duplicated `open_department_id` values from user detail and stay within the existing batch limit.
3. Error diagnostics must remain safe: no access token, raw encrypted secret or provider payload is returned to the client.

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Wang Zishi`
- Approved At: `2026-07-13`
- Conditions:
  - 修复限于 adapter 内部资料补全链路，不改 public contract。
  - 回归测试必须同时覆盖搜索命中非 open department ID 与详情返回 open department ID 的场景。
  - 合并前通过 focused adapter tests、poms-api lint/build、Markdown/diff sanity；合并后测试环境验证 `wangzishi` 与 `王子实`。
