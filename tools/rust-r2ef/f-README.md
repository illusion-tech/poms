# R2F 作者交接

F 只实现四条既有 runtime-audit 操作。正式冻结输入为 `docs/design/rust-r2ef-foundation-audit-baseline.md`；联合实际运行与 G3/G4 由 root 负责。

- 模块入口：`RuntimeAuditService::new(Database)`；`runtime_audit::http::router(auth, Arc<RuntimeAuditService>)`、`normalize_uri`、`openapi()`。
- 读侧模块为 `apps/poms-api-rust/src/runtime_audit/`。routeDenied handler 直接复用 `AuthService::record_security_event_with_session(event, session.pending_flush.as_ref())`，没有新 writer，也没有 E 依赖。
- GET 查询不新增 managed-session flush；实体 ID 为 JS trim 后的严格 varchar 等值。summary 只做原 service 的顶层投影，snapshot/details 成员保留。
- 原 node-postgres JSON.parse 会先采用 JS Number；读侧从 JSONB text 解码后保持相同数值语义，包括 unsafe integer rounding 与 JSON.stringify 的非有限数 null。该处理不删除对象字段，也不新增 response schema。
- 原 Zod 4.6.1 的字符串长度按 code point；请求字符串仍保留 UTF-16 载体及 lone surrogate。routeDenied scalar path 在 SQL text 编码时按 Node replacement；details 中无法形成合法 JSONB 的 lone surrogate 保留失败结果。
- 现行 router@2.2.0 在检查 method / Nest guards 前 decode 动态 capture；Nest Express adapter 将 URIError 映射为 BadRequestException。F normalizer 只对已冻结实体审计 shape 预检两个 capture，不解码固定段或二次解码目标值。

## 单向生成与纯 Node 检查

`f-export.mjs` 从未变原 TS/shared/完整 OpenAPI 生成 `f-authority.json`、`f-golden.json`、`f-behavior.json`、`f-openapi.json`、`f-source.json`。源头 guard 使用冻结 base 的只读 Git diff，生成物不反写 TS。依赖根默认是当前 checkout；作者 Windows 只读使用已安装的主 checkout 依赖：

```powershell
$env:POMS_R2EF_DEPENDENCY_ROOT = 'E:/projects/poms'
node tools/rust-r2ef/f-export.mjs --check
node --test tools/rust-r2ef/f-export.test.mjs tools/rust-r2ef/f-protocol.test.mjs
```

作者纯 Node 检查为 3 passed / 0 failed，Node 24.19.0、TypeScript 6.0.3、Zod 4.6.1；315 个 request schema cases、333 次九 target × 37 permission 原 service 探测。`f-behavior.json` 包含原 service projection/filter、request utils、Node simple query 和 JSON 解码语料，均明确为内存/纯源证据。Linux Node 24.16.0 仍由 root 执行再生检查。

Rust 单测分别写在 query、validation、store、service、http 模块内。作者未执行 Rust 编译、共享数据库或服务；fmt/check/clippy/unit/release 由 root 统一运行，不能把上述 Node 数量记作 HTTP、SQL 或 Rust 单测通过。

## 统一运行输入

`f-protocol.mjs` 导出 `fHttpPlan(fixture)`、`F_SQL_WITNESSES`、`F_FIXTURE_REQUIREMENTS` 和两类精确 summary key 集合。它是有限计划，不执行 I/O。root 的 fixture 负责 run 唯一身份、原 Nest/Rust 两库、actor aliases、会话/CSRF、写入前 intent、事件 adoption 和双次零残留复核。

fixture 输入为 `targetId`、`auditEventType`、`securityEventType`、`operatorId`、`actorId`、`inclusiveAt`、`routePath`。actor `adminOnly` 专指只有平台用户管理而无三种 coarse business read 权限的身份；`{onlyPermission: ...}` 是单 read 权限身份；`viewer` 已登录但无本片管理/read 权限。每个成功 routeDenied case 必须有独立 request ownership，正常注入 session-bound CSRF；omitCsrf 例外按用例声明执行。

root 应保留真实原 Nest query parser / malformed URI / 202 空体见证，以及 routeDenied pending success/no-pending/CAS-conflict/storage-failure 的 SQL 与副作用证据。GET 的 timestamp 边界用毫秒，PG 微秒用于排序；同时间未定义次序不增加人为 ID tie-breaker。未知 key、无效 parser、guard 拒绝和 service 二次权限拒绝分别验收，不能统一改写错误体。
