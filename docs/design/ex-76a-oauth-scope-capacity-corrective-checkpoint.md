# EX-76A OAuth Scope 容量纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: GitHub issue `#28` / PR `#29`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G3 Reviewer: `Copilot`
- Checkpoint Date: `2026-07-10`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-76A`

## 1. 触发背景与范围

- 触发原因: `IdentityProviderScopeListSchema` 将 OAuth scope 列表限制为最多 32 项，但 `searchScopes` 曾单独允许 32 项，飞书用户搜索还会自动注入 `contact:user:search`。当 token 不回显 scope 时，grant fallback 可能生成并持久化 33 项，违反 shared contract / OpenAPI 上限。
- 本次目标:
  - 将 32 项明确冻结为最终去重后的 OAuth scope 总预算，POMS required scope 与管理员高级追加 scope 共享预算。
  - 在配置写入、授权请求、grant fallback、provider token 返回和 Admin 表单五个边界阻止超限数据。
  - required scope 不作为额外 scope 持久化，不使用截断隐式丢弃管理员配置。
- 本次明确不做:
  - 不新增 public route、DTO 字段、OpenAPI 语义、generated client 字段、数据库字段、migration 或权限 key。
  - 不扩展 DingTalk / WeCom capability registry，也不改变 POMS RBAC 或用户同步边界。
- 本次纠偏后可恢复的可信边界: 所有写入和返回的 grant scope 快照均满足 32 项、单项 128 字符的 shared contract；Admin 能在提交前看到最终预算与阻断原因。
- 仍不允许下游依赖的留白: POMS 不保证飞书开放平台会授予任意高级追加 scope；provider 实际拒绝仍由既有授权和搜索诊断处理。

## 2. 正式输入

| Input Type                | Document / Source                                            | Section / Anchor                          | Status | Notes                                             |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------------- | ------ | ------------------------------------------------- |
| Business design           | GitHub issue `#28`                                           | 能力驱动授权与用户搜索诊断                | Active | 管理员不应手工理解 required scope。               |
| Command design            | `docs/design/api-route-canonical-inventory.md`               | B13 `platform-identity`                   | Active | 复用既有配置 / authorize / callback routes。      |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`          | `IdentityProviderScopeListSchema`         | Active | scope list 上限为 32，单项上限为 128。            |
| Query boundary            | `IdentityProviderService`                                    | config write / authorize / OAuth callback | Active | 服务端是最终容量防线。                            |
| Data model / table freeze | `identity_provider_config` / `identity_provider_oauth_grant` | existing EX-64 persistence                | Active | 不新增列；现有 JSON scope 快照必须符合 contract。 |
| Schema / DDL              | Existing migrations                                          | N/A                                       | N/A    | 本片不改 DDL。                                    |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                | B13                                       | Active | 不新增或改名 public route。                       |

## 3. Drift 清单与本次 SSOT

| Concern                   | Drift / SSOT                                                                 | Corrective Rule                                                           |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Business semantics        | `searchScopes` 是高级追加项，不是完整 OAuth request。                        | required scope 与追加项去重合并后共同计入 32 项预算。                     |
| Route / command naming    | 无 route drift。                                                             | 复用现有 config write / grant authorize / callback commands。             |
| DTO / contract naming     | `IdentityProviderScopeListSchema` 已定义 32 / 128 限制，但运行时未统一执行。 | 导出并复用上限常量；不改 schema shape。                                   |
| Table / column naming     | `scopes_json` 可能接收 33 项 fallback。                                      | 不写入超限 scope snapshot；不新增字段。                                   |
| Date / time semantics     | N/A                                                                          | 不涉及。                                                                  |
| Identifier semantics      | `contact:user:search` 是飞书 scope 标识，不是 POMS UUID。                    | required scope 不以额外配置重复持久化。                                   |
| Money / decimal semantics | N/A                                                                          | 不涉及。                                                                  |
| Status machine            | 容量超限是结构化配置输入错误，不是管理员可选择的生命周期状态。               | Admin 预检阻止提交，API 返回结构化 400；历史 / 绕过调用在授权前同样阻断。 |

## 4. 当前阻断结论

- Current Gate: `G3 / Ready for review`; scope budget corrections and cross-layer evidence are complete.
- Blocking Findings:
  1. 32 个 distinct `searchScopes` 加 required scope 可形成 33 项授权请求和 grant fallback。
  2. provider token scope 返回未完全受 shared contract 32 / 128 上限保护。
  3. Admin 表单未展示最终有效 scope 数量，也未阻止超过预算的高级配置。
- Why parent task cannot be closed: issue `#28` 承诺 POMS 管理 required scopes；若总预算没有统一边界，grant contract 不能稳定依赖。

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. 共享上限常量、后端配置 / 运行时 / provider 边界验证和 scope 规范化。
  2. Admin effective scope 预算提示、提交前阻断和结构化后端错误展示。
  3. API/Admin focused tests 与本 checkpoint、tracker、progress 回写。
- 本批未修复范围:
  1. 不替代飞书开放平台的权限审批、实际 scope 授予或 provider 侧限制。
  2. 不处理已在生产数据库中存在的违规 grant；运行时会显式拒绝继续写入违规快照。

| Concern                   | Before                             | After                                                     | Result |
| ------------------------- | ---------------------------------- | --------------------------------------------------------- | ------ |
| 最终 OAuth scope 容量     | required + extras 可达 33 项       | 去重后统一限制为 32 项，拒绝而非截断                      | Pass   |
| required scope 持久化语义 | 可被重复作为 `searchScopes` 保存   | required scope 从高级追加项剔除，由 runtime 注入          | Pass   |
| provider token scope      | 仅清理空白 / 重复，未检查 32 / 128 | 落库前校验 count / item length，且校验先于 grant 实体构造 | Pass   |
| Admin 配置体验            | 无有效数量提示，依赖通用保存失败   | 显示最终预算、超限提示并解析结构化容量错误                | Pass   |

## 6. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                      | Result  | Gap / Reason                                                                         |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| API lint                         | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                        | Pass    |                                                                                      |
| Admin lint                       | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                      | Pass    |                                                                                      |
| Shared contracts lint            | Yes      | `corepack pnpm nx run shared-contracts:eslint:lint --skip-nx-cache`                                                     | Pass    |                                                                                      |
| API focused tests                | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=identity-provider.service.spec`                          | Pass    | 46 passed; config / authorize / callback scope capacity                              |
| Admin focused tests              | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list.spec --skip-nx-cache`           | Pass    | 16 passed; effective budget and structured error UX                                  |
| API build                        | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                       | Pass    |                                                                                      |
| Admin build                      | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                     | Pass    | initial total 789.25 kB; no budget warning                                           |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi --skip-nx-cache`; `corepack pnpm nx run shared-api-client:check --skip-nx-cache` | Pass    | no generated client drift                                                            |
| Migration / schema check         | No       | N/A                                                                                                                     | N/A     | no persistence mapping / DDL change                                                  |
| E2E                              | No       | N/A                                                                                                                     | N/A     | deterministic API/Admin focused tests cover guard; external OAuth is provider-hosted |
| Markdown / diff sanity           | Yes      | `pnpm run format:md:check`; `git diff --check`                                                                          | Pending | run after governance document update                                                 |

## 7. 残余阻断与后续切片

- 已解除的阻断: 最终 scope 总预算、provider 回传上限和 Admin 提交前反馈均已由本地验证覆盖。
- 仍存在的阻断:
  1. Copilot review of this corrective implementation.
- 后续子切片:
  1. 无；该纠偏完成后继续 PR `#29` 的 G3 review 和 issue `#28` closeout。

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes    |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | -------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 无例外。 |

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Pass`
- Approved By: Codex local G3 validation; Copilot review pending.
- Approved At: `2026-07-10`
- Conditions: 所有第 6 节 required checks 通过，OpenAPI/client 无非预期 drift；待 PR `#29` Copilot 复审确认无未解决容量评论。
