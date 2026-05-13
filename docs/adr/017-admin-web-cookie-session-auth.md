# ADR-017: Admin Web Cookie + HttpOnly 服务端会话认证

**状态**: 已接受 (Accepted)
**日期**: 2026-05-13

---

## 1. 背景 (Context)

`POMS` 当前管理端认证链路仍是典型的短期 `JWT access token` 模式：

- `POST /auth/login` 校验账号密码后返回 `accessToken`
- 飞书等外部登录通过一次性 ticket 最终也交换成同一类 `accessToken`
- Admin Web 把 token 存入 `localStorage` 的 `poms_access_token`
- Angular API client 通过 `Authorization: Bearer <token>` 调用后端
- 后端 `JwtModule` 当前签发 15 分钟有效期的 JWT，并由全局 `JwtAuthGuard` 校验

这个模式在开发期简单直接，但在真实管理后台里已经暴露出明显边界：

1. 页面长时间 AFK 后 token 过期，业务页面收到 `401` 后常表现为普通列表读取失败，用户无法直接判断是登录失效。
2. token 存在 `localStorage`，一旦页面发生 XSS，攻击者可以直接读取并转移 bearer token。
3. JWT 是自包含凭证，权限、账号禁用、管理员强制下线等变化无法天然做到即时失效，除非额外引入黑名单或短周期刷新。
4. 浏览器端第一方 Admin Web、自动化测试、外部 API / CLI / 第三方集成对认证机制的诉求不同，不应长期混成同一个 bearer token 方案。

因此，需要先通过 ADR 固定认证架构方向，再进入后续受控实现切片。

---

## 2. 决策驱动因素 (Decision Drivers)

- **安全边界**: 浏览器 JavaScript 不应持有可被直接转移的长期或短期访问凭证。
- **会话可控性**: 管理员禁用账号、角色权限变化、强制下线和异常登录处置应能尽快生效。
- **用户体验**: 会话过期必须有统一、可理解的引导，而不是让各业务列表分别报“读取失败”。
- **CSRF 可治理**: 使用 Cookie 后必须有明确的 CSRF 防护方案，不能只依赖默认 Cookie 行为。
- **外部接入分层**: Admin Web 的浏览器会话不应成为移动端、CLI、第三方系统或未来开放 API 的唯一认证方案。
- **测试可维护性**: E2E、API 测试和本地开发必须有清晰的登录辅助路径，而不是依赖读取浏览器 `localStorage` token。
- **SSO 扩展性**: 飞书、钉钉、企业微信等身份提供商只负责身份断言，POMS 仍应统一建立自己的本地会话。

---

## 3. 候选方案 (Considered Options)

### 方案 A: 保持 `localStorage JWT + Authorization header`

- **描述**:
  - 继续让登录接口返回 JWT
  - 前端继续保存到 `localStorage`
  - API 调用继续发送 `Authorization: Bearer`
- **优点**:
  - 改造成本最低
  - 对当前 generated client、E2E 和 API helper 影响最小
- **缺点**:
  - XSS 后 token 可被直接读取和转移
  - AFK 过期后需要每个页面各自处理 `401`
  - 即时撤销、权限刷新和强制下线都需要额外补丁
  - 不适合作为长期管理后台认证基线

### 方案 B: 把 JWT access token 放入 `HttpOnly Cookie`

- **描述**:
  - 登录后不再把 JWT 返回给前端 JavaScript
  - 服务端把 JWT 写入 `HttpOnly Cookie`
  - 后端从 Cookie 读取 JWT 并校验
- **优点**:
  - 前端脚本无法直接读取 token
  - 前端 API 调用不再显式拼 bearer header
- **缺点**:
  - 本质仍是自包含 token，会话撤销和权限实时变化仍不天然成立
  - Cookie 自动携带后必须完整处理 CSRF
  - 容易让系统误以为“换了存放位置就完成了会话安全升级”
  - 若再叠加 refresh token，会形成 Cookie JWT + refresh 的复杂双 token 生命周期

### 方案 C: `HttpOnly Cookie + 服务端 opaque session`

- **描述**:
  - 登录后服务端创建随机、高熵、不可解释的 session token
  - 浏览器只持有 `HttpOnly` session cookie
  - 服务端只保存 session token 的 hash 与会话状态
  - 后端每次请求通过 session store 解析当前用户和权限上下文
  - 前端通过 CSRF header 配合 Cookie 完成写操作保护
- **优点**:
  - 前端 JavaScript 不持有可转移 access token
  - 服务端可以即时 revoke session
  - 账号禁用、角色权限变化、强制下线和异常会话处置更直接
  - 更适合第一方管理后台和 SSO 登录后本地会话承接
  - 统一 `401` 处理后，用户体验可以集中治理
- **缺点**:
  - 需要新增 session store、CSRF 机制、Cookie 配置和测试辅助能力
  - generated client / E2E / API helper 需要从 bearer 默认假设迁移
  - 跨域开发环境必须显式配置 credentials 与 CORS

### 方案 D: 只依赖外部身份提供商会话

- **描述**:
  - POMS 不建立本地会话
  - 每次访问依赖飞书、钉钉、企业微信等外部 IdP session 或 token
- **优点**:
  - 理论上减少 POMS 自身认证状态
- **缺点**:
  - POMS 权限、角色、组织、审计和强制下线都无法只交给外部 IdP
  - 多 provider 语义不统一
  - 不适合 POMS 作为业务系统的本地授权与审计要求

---

## 4. 决策 (Decision)

**推荐选择：方案 C。**

`POMS Admin Web` 的长期认证基线固定为：

1. 第一方浏览器管理端使用 `HttpOnly Cookie + 服务端 opaque session`。
2. Admin Web 不再把 access token、refresh token 或 self-contained JWT 暴露给浏览器 JavaScript。
3. Admin Web 不再以 `localStorage / sessionStorage` 作为认证凭证存储位置。
4. Cookie session 必须配套 CSRF 防护，`SameSite` 只作为辅助防线。
5. 飞书、钉钉、企业微信等外部身份提供商只完成身份认证和账号绑定，POMS 在认证完成后统一建立自己的本地 session。
6. 外部 API、CLI、移动端或第三方系统集成不复用 Admin Web Cookie session 作为唯一方案；这些入口后续应使用单独的 bearer / OAuth / service token 机制治理。

由于当前产品尚未上线，Admin Web 认证链路不设置历史兼容期。进入实现时应按 direct cutover 清退浏览器侧 `localStorage` token 与 Admin Web bearer header 路径；若后续需要外部 API / CLI / 第三方 bearer 能力，应作为独立认证入口另行治理，不作为 Admin Web 兼容方案。

---

## 5. 详细约束 (Detailed Rules)

### 5.1 Session Cookie

Admin Web session cookie 必须满足：

1. `HttpOnly`: 浏览器 JavaScript 不可读取。
2. `Secure`: 非本地开发环境必须启用，只允许 HTTPS 发送。
3. `SameSite=Lax`: 作为默认值，兼容外部 IdP 顶层跳转 callback；只有确有跨站嵌入或跨站 POST 需求时，才允许评审后使用 `SameSite=None; Secure`。
4. `Path` 收敛到 API 所需范围，不使用过宽的 cookie 作用域。
5. session token 必须是高熵随机值，不承载用户信息、权限或业务数据。
6. session store 中只保存 session token hash，不保存明文 session token。

### 5.2 Session 生命周期

服务端 session 至少需要支持：

1. idle timeout: 一段时间无活动后过期，首版可沿用当前 15 分钟安全口径或在 G1 基线中明确配置值。
2. absolute timeout: 到达最长会话寿命后必须重新登录，不因持续请求无限续期。
3. revoke: 管理员强制下线、账号禁用、密码重置或安全事件触发时，可以立即撤销相关 session。
4. session rotation: 登录成功、权限敏感变化或风险事件后可轮换 session id，避免 session fixation。
5. logout: 用户登出时服务端撤销 session，并通过 `Set-Cookie` 清除浏览器 cookie。

### 5.3 CSRF 防护

Cookie 会自动随请求发送，因此所有非幂等写操作必须进入 CSRF 防护。

推荐首版采用以下模式：

1. 登录成功后，服务端同时下发与 session 绑定的 CSRF token。
2. CSRF token 可以通过非 `HttpOnly` 的专用 cookie 或专用读取端点暴露给前端。
3. 前端在 `POST / PUT / PATCH / DELETE` 等 unsafe method 上发送 `X-CSRF-Token`。
4. 后端校验 CSRF token 与当前 session 的绑定关系。
5. CSRF 校验失败返回结构化错误码，不得落成普通业务校验错误。

### 5.4 后端认证与授权

目标态后端应将当前 `JwtAuthGuard` 的浏览器会话职责迁移为 session guard：

1. guard 从 Cookie 解析 session id。
2. guard 查询 session store 并校验状态、过期时间、撤销状态和绑定用户。
3. guard 解析当前有效用户，并在必要时从平台用户事实源重新计算权限。
4. 权限 guard 继续以当前用户权限上下文作为输入，不直接信任浏览器提交的任何权限声明。
5. 认证失败返回 `401`，权限不足返回 `403`，两者必须在前端交互上区分。

### 5.5 前端状态模型

Admin Web 目标态前端不再以 `token()` 判断登录状态。

前端认证状态应收敛为：

1. `currentUser`: 当前用户资料和权限。
2. `sessionStatus`: `unknown / authenticated / anonymous / expired` 等会话状态。
3. `navigationTree / myTodos`: 继续由后端当前会话读取。

前端 API client 必须：

1. 对同源请求自动携带 Cookie。
2. 对跨域开发代理显式启用 credentials。
3. 对 unsafe method 自动附加 CSRF header。
4. 全局拦截 `401`，清理本地非敏感 UI 状态，并跳转登录页保留 `returnUrl`。
5. 登录页对会话过期显示明确提示，例如“登录已过期，请重新登录后继续”。

### 5.6 外部身份提供商

飞书等外部 IdP 的登录完成后，不应把 IdP token 或 POMS JWT 返回给浏览器。

目标态链路为：

1. Admin Web 跳转到 IdP 授权页。
2. IdP callback 回到 POMS 后端。
3. POMS 校验 state、code、tenant、绑定关系和一次性 ticket。
4. POMS 建立本地 session cookie。
5. Admin Web 只通过当前 POMS session 读取用户、导航和权限。

外部 IdP access token / refresh token 如需保存，只能作为后端授权资料进入 provider grant 存储，不进入浏览器会话。

---

## 6. API 与契约影响

本 ADR 冻结认证语义，不在本文件中最终冻结所有 route 名称。进入实现切片前，必须按 `ADR-015` 和 canonical route inventory 重新确认 route。

目标态契约原则如下：

1. 登录成功响应不再返回 `accessToken`，也不保留仅供 Admin Web 兼容旧 token flow 的响应字段。
2. 登录接口通过 `Set-Cookie` 建立 session，并返回当前会话视图或当前用户资料。
3. 外部登录 ticket 换取 POMS 会话时，同样通过 `Set-Cookie` 建立 session。
4. 登出接口必须同时撤销服务端 session 与清除 cookie。
5. 当前用户资料接口继续作为前端初始化依据，但其认证来源改为 session。
6. OpenAPI 需要区分 Admin Web cookie session security scheme 与未来外部 API bearer security scheme。

---

## 7. 测试与开发影响

本决策会改变测试习惯，但不应降低可测试性。

### 7.1 API / 后端测试

后端测试需要覆盖：

1. session 创建、读取、过期、撤销和 logout。
2. cookie flags: `HttpOnly`、`Secure`、`SameSite`、`Path`。
3. CSRF token 缺失、错误、过期和正确场景。
4. 账号禁用、权限变化、强制下线后的 session 行为。
5. 外部登录 callback / ticket 建立本地 session。

### 7.2 Admin E2E

Admin E2E 不应再通过读取 `localStorage.poms_access_token` 作为主要测试手段。

推荐测试方式：

1. 通过真实登录 UI 建立 session。
2. 或提供受控的测试登录 helper，由后端测试端点或 Playwright request context 建立 cookie。
3. 对会话过期、无权限和 CSRF 失败建立独立用例。
4. 保留 API helper 的 bearer 能力时，应明确标注它属于非 Admin Web 会话路径或过渡路径。

### 7.3 本地开发

本地开发需要明确：

1. 如果 Admin Web 与 API 同源，通过 dev proxy 简化 Cookie 和 CORS。
2. 如果跨 origin 直连 API，后端 CORS 必须允许精确 origin 和 credentials，不允许 `*`。
3. 本地 `Secure` cookie 例外必须只在开发环境生效，不能被带入生产配置。

---

## 8. 迁移方案 (Migration Plan)

本 ADR 已进入 `Accepted`，后续实现应按以下顺序拆分推进。

### Phase 1: G1 基线与 route / contract 冻结

1. 冻结 session 数据模型、cookie 名称、CSRF 策略、错误码和 OpenAPI security scheme。
2. 回写 canonical route inventory。
3. 明确非 Admin Web bearer 入口的隔离边界；Admin Web 不设置旧 bearer 兼容期。
4. 明确 E2E 登录 helper 的测试策略。

### Phase 2: 后端 session 与 CSRF 能力

1. 新增 session store 与 migration。
2. 新增 session service 和 session guard。
3. 登录、外部登录、登出、当前会话读取切到 session 语义。
4. 补齐 session 审计事件。
5. 保留或隔离 bearer guard 的非 Admin Web 用途。

### Phase 3: Admin Web 切换

1. `AuthStore` 从 token 状态切到 session / current user 状态。
2. API client 从 bearer header 切到 Cookie credentials + CSRF header。
3. 全局 `401` 处理统一跳转登录页，并显示会话过期提示。
4. 清退 `localStorage.poms_access_token`。

### Phase 4: 测试、清理与 G4 收口

1. 更新 Admin E2E 和 API helpers。
2. 验证 AFK 过期后的业务页面交互。
3. 验证登出、强制下线、账号禁用和权限变化。
4. 完成文档回写、tracker 回写和旧 bearer 浏览器路径清退。

---

## 9. 接受结果与实现门槛 (Acceptance Result and Gates)

本 ADR 于 2026-05-13 审阅通过并进入 `Accepted`。接受时已确认：

1. Admin Web 长期目标态为服务端 opaque session，而不是 JWT-in-cookie。
2. 产品尚未上线，Admin Web 认证升级按 direct cutover 推进，不为旧 `localStorage JWT + Authorization header` 浏览器路径设置历史兼容。
3. 外部 API / CLI / 第三方 bearer 入口与 Admin Web 浏览器会话分层治理。
4. 后续实现切片进入 `phase2-development-execution-tracker.md`，以 `EX-66` / `FE-62` 及其子切片承接。

实现切片进入 `Doing` 前，至少需要完成以下 G1 冻结：

1. CSRF 方案、Cookie flags、session 生命周期和撤销语义形成基线。
2. 新增、替换或删除的认证 public routes 已进入 canonical route inventory。
3. E2E、API helper 和本地开发登录方式有明确测试策略。
4. Admin Web direct cutover 的前后端顺序、失败回滚和验证矩阵已冻结。

后续实现切片进入 `Done / G4` 前，至少需要证明：

1. 登录响应不再向浏览器返回 access token。
2. Admin Web 不再写入或读取 `localStorage.poms_access_token`。
3. unsafe method 缺失 CSRF token 会被拒绝。
4. session 过期、撤销、账号禁用后业务页面出现统一重新登录引导。
5. 自动化测试能够不依赖 localStorage token 完成登录和鉴权验证。

---

## 10. 后果 (Consequences)

本 ADR 被接受后：

1. `POMS` Admin Web 的认证安全边界会从“前端持 token”升级为“服务端持会话状态”。
2. XSS 后直接窃取 bearer token 的风险会显著降低，但 XSS 仍可能代替用户发起请求，因此前端 XSS 防护仍必须继续治理。
3. 系统会引入 CSRF、session store、cookie flags、CORS credentials 等新的工程复杂度。
4. 测试与 API helper 需要分层，不能继续把 Admin Web 登录等同于“拿到 bearer token”。
5. 未来飞书、钉钉、企业微信等 provider 可以复用同一个 POMS 本地会话承接模型。

---

## 11. 当前结论

`POMS` 不应只把 access token 从 `localStorage` 搬到 `HttpOnly Cookie`，因为那只是减少前端读取面，并没有解决服务端会话撤销、权限新鲜度和管理后台统一过期体验问题。

当前接受的长期方向是：

- **Admin Web**: `HttpOnly Cookie + 服务端 opaque session + CSRF`
- **外部 API / CLI / 第三方接入**: 独立 bearer / OAuth / service token 体系，后续另行治理
- **外部身份提供商**: 只作为身份断言来源，最终统一落到 POMS 本地 session
