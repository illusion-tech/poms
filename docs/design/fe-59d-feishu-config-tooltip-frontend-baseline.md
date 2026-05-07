# FE-59D 飞书配置提示浮层实施基线包

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-59D`

## 1. 范围

本片负责在外部身份提供商配置表单中补齐飞书配置说明，降低管理员填写 AppID、AppSecret、Redirect URI 和 scopes 的成本。

Included:

1. 在飞书 provider 配置表单关键 label 旁增加圆形问号图标。
2. 鼠标悬浮或键盘 focus 时展示配置说明 tooltip。
3. 覆盖 Client ID / Client Secret / Redirect URI / Login scopes / Search scopes / 搜索授权模式 / Tenant allowlist。
4. Tooltip 文案明确 AppID -> Client ID、AppSecret -> Client Secret，以及 Redirect URI 需与飞书开放平台白名单完全一致。
5. 补 focused component test，确认提示入口可被渲染和访问。

Out of scope:

1. 不新增、修改或删除后端 public API route。
2. 不改 provider config DTO、OpenAPI、generated client、migration 或持久化字段。
3. 不拆分登录 callback 和管理员搜索授权 callback；这个既有回调字段限制仍由 `EX-64F` 收口评估。
4. 不接入真实飞书开放平台文档抓取或动态 scope 推荐。

## 2. 正式输入

| Input Type       | Document / Source                                   | Status | Notes                                           |
| ---------------- | --------------------------------------------------- | ------ | ----------------------------------------------- |
| User request     | Conversation                                        | Pass   | 配置项需要鼠标悬浮问号提示                      |
| Existing UI      | `features/platform/identity-provider-list.ts`       | Active | provider 配置表单已存在                         |
| Provider runtime | `EX-64B` / `EX-64E` closeout                        | G4     | client id、secret、redirect URI、scope 语义稳定 |
| Tracker          | `phase2-development-execution-tracker.md` / `FE-59` | Active | 作为 FE-59 后续 UX 小切片                       |

## 3. SSOT

| Concern               | SSOT                               | Implementation Rule                                |
| --------------------- | ---------------------------------- | -------------------------------------------------- |
| App credential naming | Feishu Open Platform user input    | AppID 映射 Client ID；AppSecret 映射 Client Secret |
| Tooltip behavior      | PrimeNG `TooltipModule`            | 使用 `pTooltip`，hover / focus 触发                |
| Accessibility         | Angular template aria labels       | 问号图标按钮必须有明确 `aria-label`                |
| Persistence boundary  | Existing provider config contracts | tooltip 只改 UI，不改变保存请求或 DTO              |

## 4. 测试与校验

| Check                     | Required | Command / Evidence                                                                       | Result     |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------- | ---------- |
| Provider list tests       | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list` | Pending G3 |
| Admin lint                | Yes      | `corepack pnpm nx lint poms-admin`                                                       | Pending G3 |
| Admin build               | Yes      | `corepack pnpm nx build poms-admin`                                                      | Pending G3 |
| Markdown                  | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                  | Pending G3 |
| API / OpenAPI / migration | No       | N/A                                                                                      | N/A        |

## 5. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Conditions:
  - 只改 Admin UI 文案与 tooltip 行为。
  - 不改变 provider config 保存契约。
  - 真实飞书 callback 字段拆分不在本片处理。
