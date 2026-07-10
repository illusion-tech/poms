# EX-76A OAuth Callback 响应契约纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: GitHub issue `#28` / PR `#29`
- Owner: `Codex`
- Slice Type: `api-contract-corrective`
- G3 Reviewer: `Copilot`
- Checkpoint Date: `2026-07-10`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-76A`

## 1. 触发背景与范围

- 触发原因: 浏览器 OAuth callback 已按 `Accept` 内容协商重定向回 POMS，但 OpenAPI 仅声明 `200 application/json`，遗漏实际存在的 `302 Location` 响应，导致 API 文档与运行时协议不一致。
- 本次目标:
  - 将 callback 的双响应模式冻结为明确契约：非浏览器 / JSON 调用返回 `200` 授权摘要；仅当 `Accept` 包含 `text/html` 且不包含 `application/json` 时返回 `302` 并通过 `Location` 回到 POMS 用户管理页。
  - 让 controller 显式使用 `HttpStatus.FOUND`，不依赖 HTTP adapter 的 redirect 默认状态。
  - 生成 OpenAPI 并验证 generated client 继续只消费 JSON API 模式。
- 本次明确不做:
  - 不新增或拆分 callback route，不修改飞书 Redirect URI、callback query DTO、grant persistence、权限 key、migration 或 Admin 路由。
  - 不把浏览器跳转建模为 generated Angular client 调用，也不改变 `Accept: application/json` 的错误透传行为。
- 本次纠偏后可恢复的可信边界: `GET /platform/identity-provider-oauth-grants:callback` 的 JSON 与浏览器回跳响应均由 OpenAPI 明确描述，运行时状态码与测试断言一致。
- 仍不允许下游依赖的留白: 飞书 provider 的回调参数和错误语义仍由既有 state 验证与 service 诊断承接；本片不扩展 provider capability 或用户同步。

## 2. 正式输入

| Input Type                | Document / Source                                                             | Section / Anchor                | Status | Notes                                                     |
| ------------------------- | ----------------------------------------------------------------------------- | ------------------------------- | ------ | --------------------------------------------------------- |
| Business design           | GitHub issue `#28`                                                            | callback 不展示裸 JSON          | Active | 浏览器完成授权后必须回到可继续绑定的 POMS 页面。          |
| Command design            | `docs/design/archive/slices/ex-76a-feishu-capability-driven-auth-baseline.md` | 4 callback route                | Active | 复用既有 callback，不新增 route。                         |
| DTO / OpenAPI design      | `IdentityProviderOAuthGrantDto` / Nest Swagger decorators                     | callback responses              | Active | JSON 返回摘要；浏览器返回 redirect，不新增 response DTO。 |
| Query boundary            | `IdentityProviderOAuthGrantController`                                        | `shouldRedirectBrowserCallback` | Active | `Accept` 是响应模式唯一判定输入。                         |
| Data model / table freeze | `identity_provider_oauth_grant`                                               | existing EX-64 persistence      | N/A    | 本片不读写新增字段。                                      |
| Schema / DDL              | Existing migrations                                                           | N/A                             | N/A    | 本片无 DDL。                                              |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md` / B13 route inventory           | `platform-identity` callback    | Active | canonical path 已存在且保持不变。                         |

## 3. Drift 清单与本次 SSOT

| Concern                   | Drift / SSOT                                                             | Corrective Rule                                                                |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Business semantics        | 浏览器授权结束需要返回 POMS，API 客户端需要可读取 grant 摘要。           | 同一路由通过 `Accept` 协商两种已声明的响应模式。                               |
| Route / command naming    | B13 callback path 与 controller route 已对齐。                           | 保持既有 `GET /platform/identity-provider-oauth-grants:callback`。             |
| DTO / contract naming     | OpenAPI 只输出 `200` summary，遗漏浏览器 `302 Location`。                | `200` 仅描述 JSON；`302` 描述 HTML 浏览器回跳和 `Location` header。            |
| Table / column naming     | N/A                                                                      | 不改 persistence。                                                             |
| Date / time semantics     | N/A                                                                      | 不涉及。                                                                       |
| Identifier semantics      | redirect query 包含 provider config UUID，仅供 POMS 页面状态提示。       | 维持现有 URL 参数，不新增 identifier。                                         |
| Money / decimal semantics | N/A                                                                      | 不涉及。                                                                       |
| Status machine            | 原实现依赖 adapter 默认 redirect 状态，文档未表达浏览器成功 / 失败回跳。 | controller 显式 `302`；成功 / 失败均回跳，JSON 调用保留 service 原结果或异常。 |

## 4. 当前阻断结论

- Current Gate: `G3 / Ready for review`; the OpenAPI response contract and runtime status are aligned.
- Blocking Findings:
  1. API 文档把 callback 错误地表述为永远返回 `200 application/json`。
  2. 浏览器 redirect 状态依赖 HTTP adapter 默认行为，无法作为稳定对外契约验证。
- Why parent task cannot be closed: EX-76A 承诺 browser callback 不展示裸 JSON；若 OpenAPI 未记录真实响应，外部回调协议仍不可作为下游调试与维护输入。

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. controller 显式 `HttpStatus.FOUND` redirect，Swagger 记录 `200 JSON` 与 `302 Location` 内容协商响应。
  2. focused controller tests、OpenAPI / client consistency、G3 checkpoint 与 tracker / progress 回写。
- 本批未修复范围:
  1. 不改变 callback path、query request contract、grant summary schema 或 generated client 方法签名。
  2. 不增加真实飞书浏览器 E2E；provider-hosted OAuth 仍以 controller behavior 和 OpenAPI generation 验证。

| Concern                 | Before                                       | After                                         | Result |
| ----------------------- | -------------------------------------------- | --------------------------------------------- | ------ |
| Browser callback status | adapter 默认 redirect，未显式声明            | runtime 显式 `302 Found`                      | Pass   |
| OpenAPI response        | 仅 `200 application/json`                    | `200` JSON 与 `302 Location` 均有文档说明     | Pass   |
| JSON client behavior    | JSON summary / error 行为存在但未与 302 区分 | 保持 JSON 行为，generated client 仅消费该模式 | Pass   |

## 6. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                            | Result | Gap / Reason                                               |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------- |
| API lint                         | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                              | Pass   |                                                            |
| API focused tests                | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=identity-provider-oauth-grant.controller.spec --skip-nx-cache` | Pass   | 9 passed; explicit 302 success / failure and JSON behavior |
| API build                        | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                             | Pass   | Swagger decorator compilation                              |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi --skip-nx-cache`; `corepack pnpm nx run shared-api-client:check --skip-nx-cache`       | Pass   | response contract and generated client consistent          |
| Admin lint / build               | No       | N/A                                                                                                                           | N/A    | no Admin runtime change                                    |
| Migration / schema check         | No       | N/A                                                                                                                           | N/A    | no persistence / DDL change                                |
| E2E                              | No       | N/A                                                                                                                           | N/A    | provider-hosted OAuth; controller contract is covered      |
| Markdown / diff sanity           | Yes      | `pnpm run format:md:check`; `git diff --check`                                                                                | Pass   |                                                            |

## 7. 残余阻断与后续切片

- 已解除的阻断: controller 已显式返回 302，OpenAPI 同时描述 JSON 与浏览器响应，API focused tests / lint / build / client check 均已通过。
- 仍存在的阻断:
  1. Copilot review of the callback contract correction.
- 后续子切片:
  1. 无；本 checkpoint 通过后继续 PR `#29` review，随后执行 EX-76A G4 closeout。

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes    |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | -------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 无例外。 |

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Pass`
- Approved By: Codex local G3 validation; Copilot review pending.
- Approved At: `2026-07-10`
- Conditions: OpenAPI 明确同时包含 JSON `200` 和 browser `302`，PR `#29` review 无未解决 callback contract 评论。
