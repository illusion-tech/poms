# FE-62B 会话过期、登出与登录页重新登录引导实施基线包

- Gate Status: `Pass`
- Parent: `FE-62`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-05-14`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-62B`

---

## 1. 范围

- 本次目标:
  1. 为 Admin Web 增加全局认证失效处理：识别后端结构化 `401` code `session_missing` / `session_expired` / `session_revoked` / `account_disabled`。
  2. 认证失效后清理 `AuthStore` 本地非敏感聚合状态，并跳转 `/auth/login`，携带安全 `returnUrl` 和登录失效原因。
  3. 登录页根据原因展示可读提示，避免 AFK 后业务页只显示“列表读取失败”。
  4. 登出继续清理本地状态；已在 `/auth/*` 路径时避免重复跳转。
  5. 补 focused tests 覆盖 interceptor、login notice 和核心 returnUrl sanitization。
- 本次明确不做:
  1. 不改后端 session lifecycle、错误 code、route、OpenAPI、generated client 或 migration。
  2. 不收口 Playwright / browser E2E helper 中的旧 token fixture；最终 E2E helper 与浏览器矩阵由 `EX-66E` 承接。
  3. 不把 `403 / permission_denied` 转成登录失效；权限不足仍走 `/auth/access` 或业务无权限反馈。
  4. 不对普通网络错误、业务 4xx/5xx 做全局重写。
- 下游可依赖的交付边界:
  1. 任意业务 API 返回认证失效结构化 401 时，用户会被引导回登录页并看到原因。
  2. returnUrl 必须是本应用内相对路径；外部 URL、协议相对 URL 和空值归一到 `/`。
  3. `FE-62B` 完成后 `EX-66E` 可基于此做浏览器级 AFK / session expired matrix。
- 不允许下游依赖的留白:
  1. 浏览器 E2E helper 仍不是最终 Cookie session 形态。
  2. 已在登录页或外部登录 callback 页发生的认证错误仍由页面局部错误文案处理。

## 2. 正式输入

| Input Type                | Document / Source                                  | Section / Anchor       | Status   | Notes                                                |
| ------------------------- | -------------------------------------------------- | ---------------------- | -------- | ---------------------------------------------------- |
| ADR                       | `docs/adr/017-admin-web-cookie-session-auth.md`    | accepted decision      | Accepted | Admin Web 采用 Cookie session + CSRF。               |
| Business design           | `ex-66a-admin-web-cookie-session-auth-baseline.md` | 8 / 10                 | Accepted | 已冻结错误 code 与前端行为期望。                     |
| Runtime contract          | `ex-66d-auth-csrf-credentials-runtime-closeout.md` | 1 / 2                  | Accepted | 后端已补齐结构化 auth / csrf / permission 错误。     |
| Frontend closeout         | `fe-62a-admin-cookie-session-client-closeout.md`   | 1 / 2 / 5              | Accepted | AuthStore / CSRF interceptor hardening 已完成。      |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                 | `B15` auth routes      | Accepted | 本片只消费既有 auth routes，不改 route surface。     |
| Command design            | `phase2-development-execution-tracker.md`          | `FE-62B`               | Accepted | 本片负责 AFK / session expired UX。                  |
| Query boundary            | Angular Router current URL + login query params    | `returnUrl` / `reason` | Accepted | 前端只传递 safe local returnUrl 和有限 reason code。 |
| Data model / table freeze | `N/A`                                              | `N/A`                  | N/A      | 无持久化变化。                                       |
| Schema / DDL              | `N/A`                                              | `N/A`                  | N/A      | 无 migration。                                       |

## 3. 本次 SSOT

| Concern                     | SSOT                                               | Implementation Rule                                               |
| --------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Auth expired codes          | EX-66A section 8                                   | 只处理 session/auth account codes，不处理 `invalid_credentials`。 |
| Login redirect route        | `/auth/login`                                      | 认证失效跳登录页，保留 safe `returnUrl`。                         |
| Return URL sanitization     | shared frontend auth return URL helper             | 只允许单斜杠开头的本应用相对路径，`//` 和外部 URL 归一到 `/`。    |
| Login reason display        | `reason` query param                               | 登录页把有限 reason 映射成中文提示，不展示原始后端文本。          |
| Local session cleanup       | `AuthStore.clearSessionState()`                    | 认证失效只清前端聚合状态和 CSRF token，不调用 logout 写侧。       |
| Permission denied           | `permission_denied` / `/auth/access`               | 不作为登录失效处理。                                              |
| Public route canonical path | `api-route-canonical-inventory.md` `B15`           | 本片不新增或重命名 route。                                        |
| Date / time semantics       | server `session_expired` judgement                 | 前端不自行计算 idle / absolute timeout。                          |
| Identifier semantics        | no session id exposed                              | 前端只基于错误 code 判断，不读取 session id。                     |
| Status machine              | `session_missing/expired/revoked/account_disabled` | 四类 code 均清本地状态；文案区分过期、退出、账号停用。            |

## 4. 命令与接口边界

| Route / Controller | Frontend Consumer                 | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source | Result |
| ------------------ | --------------------------------- | ---------------------- | ----------------------- | ------------------ | ------------- | ------ |
| All protected APIs | auth expired response interceptor | N/A                    | structured error body   | session guard      | EX-66A/D      | Reuse  |
| `/auth/login`      | login page notice / returnUrl     | query params           | N/A                     | public route       | FE-62B        | Reuse  |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `N/A`
- Current implemented route(s): no backend route change.
- Inventory status: `aligned`
- Route governance source: `EX-66A/D`
- Blocker / exception: `N/A`

## 5. 读侧边界

| Query / View        | Consumer         | Fields                 | Filter / Sort | Permission Boundary | Design Source | Result  |
| ------------------- | ---------------- | ---------------------- | ------------- | ------------------- | ------------- | ------- |
| `HttpErrorResponse` | auth interceptor | `status`, `error.code` | N/A           | client-side only    | EX-66A/D      | planned |
| `ActivatedRoute`    | login page       | `returnUrl`, `reason`  | N/A           | public route        | FE-62B        | planned |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result       |
| ----- | --------- | ------------------- | ------------------- | ------------------ |
| `N/A` | `N/A`     | `N/A`               | `N/A`               | 本片无持久化变更。 |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result           |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ---------------- |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | 本片无字段变更。 |

## 7. 一致性结论

- Document -> code: 按 `EX-66A/D` 冻结错误 code 实现前端全局认证失效 UX。
- ADR-015 inventory -> route: 本片不改 public API route surface。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: `N/A`。
- Query -> view: login 页只消费 safe query params。
- Guard / permission: route guard 继续负责未登录 direct URL；interceptor 负责已登录会话失效后的 API 401。
- OpenAPI / generated client: 不变更。

## 8. 测试与校验

| Check                    | Required | Command / Evidence                                                                                            | Result  | Gap / Reason                                |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------- |
| Lint                     | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache`; `corepack pnpm nx lint admin-data-access --skip-nx-cache` | Planned | interceptor/provider 触及 app + data-access |
| Build                    | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                           | Planned | 验证 production compile。                   |
| Focused unit tests       | Yes      | auth expired interceptor / login / auth returnUrl focused specs                                               | Planned | 覆盖跳转、清理、提示和 safe returnUrl。     |
| Full Admin tests         | Yes      | `corepack pnpm nx test poms-admin --skip-nx-cache`                                                            | Planned | 防止认证基础设施影响现有页面。              |
| API / integration tests  | No       | `N/A`                                                                                                         | N/A     | 后端行为已由 `EX-66D` 覆盖。                |
| E2E                      | No       | `N/A`                                                                                                         | N/A     | Browser matrix 留给 `EX-66E`。              |
| OpenAPI / client diff    | No       | `N/A`                                                                                                         | N/A     | 本片不改 OpenAPI。                          |
| Migration / schema check | No       | `N/A`                                                                                                         | N/A     | 无持久化变化。                              |
| Markdown / diff sanity   | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                                       | Planned | docs touched。                              |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes          |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | -------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 暂无开放例外。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-05-14`
- Conditions:
  1. 不得把 `invalid_credentials`、`permission_denied` 或普通业务错误改写为登录失效。
  2. 全局跳转必须使用 safe internal returnUrl。
  3. 已在 `/auth/*` 路径时不得因局部认证错误造成重复跳转循环。
