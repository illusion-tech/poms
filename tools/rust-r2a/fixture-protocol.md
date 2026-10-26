# R2A 受限 fixture 协议

真实 Nest witness、双后端 HTTP 和浏览器共用 `fixture-protocol.cjs` / `.d.cts`。调用者通过 `fixtureCommand()` 取得固定 executable/args/cwd/env，`shell:false` 启动，单个 UTF8 JSON 对象仅经 stdin 传入；不继承父进程 DB/PG/ORM/JWT/Node 配置，不把 token 放入 argv、环境、日志或 journal。CLI 仅支持新 R2A 两库，先 owner 只读核 marker，再以低权角色执行受限操作。

请求精确字段：`{formatVersion:1,runId,backend,action,account,sessionToken?}`。runId 为小写 UUID，backend 仅 nest/rust，未知字段/动作拒绝。prepare/cleanup 的 account=none；其余为 admin/viewer。

- prepare：创建本 run 的两名合成用户及各自角色/组织；账号密码从 `fixtureCredentials(runId,account)` 取得。
- admin 初始拥有被冻结的全部37权限；viewer 初始为 `nav:dashboard:view` 与 `platform:org-units:manage`，缺少 AND 菜单所需的 org-sync 权限。
- permissions-none / permissions-and-partial / permissions-and-full：固定权限档案；full 为 viewer 初始两项加 `platform:org-sync:manage`。不接受调用者自选权限字符串。
- restore：启用账号并恢复该 account 的初始权限；disable：仅停用该合成账号。
- session-due / session-non-due：必须传真实 Cookie token，仅 hash+对应 run 用户定位 active session；把 lastSeenAt 设置为当前毫秒时间减61秒/当前时间，版本+1，不修改有效期或伪造业务会话。
- expire-idle / expire-absolute / revoke：同样要求精确当前 token；只修改对应合成会话。
- snapshot：同样要求 token；返回该会话的9个安全字段，及本 run **两个账号**的导航审计/安全事件。审计保留12列的 camelCase 对应字段、null/空 requestId、毫秒时间；拒绝未知审计 payload 字段。任何输出均不含 token/hash/password/IP/User-Agent。
- cleanup：只按 journal 拥有的 UUID 清理本 run；没有 targetId 或空/null requestId 全删路径。

所有普通成功响应均为精确7字段：`{formatVersion,runId,backend,action,matched,changed,state}`；snapshot 仅额外增加 `snapshot:{session,audits,securityEvents}`。完整字段类型见 `.d.cts`。错误只有固定 code，不反射 SQL、驱动异常或输入值。

调用者应始终使用 `fixtureRequestIdentity(runId)` 的 requestId/User-Agent。测试 null/empty/超长 requestId 时仍保留独立的该 run User-Agent；浏览器上下文也设置此 User-Agent。它用于精确识别没有 actor_id 的认证失败安全事件。audit 清理只按两个合成 operator UUID；安全事件按合成 actor UUID、确知的非空 run requestId 或精确 run User-Agent。

journal 先 fsync planned intent，再低权事务写入。每 run 的 session advisory lock 覆盖事务 COMMIT 与最终 journal fsync，最后才 unlock/断开。cleanup 先锁定拥有的用户/角色/组织并拒绝外部 FK/SET NULL 引用。中断或超时不能假定 Linux 子进程已退出；CLI 有45秒独立期限，保留 journal，由主代理显式重跑同 run cleanup。已 cleaned 的 run 不允许重新 prepare。

Linux 浏览器容器需要挂载新 state/private 至 `/r2a-private`，以及固定的 `/run/secrets/r2a-owner-password` / `r2a-app-password`。Windows helper 固定通过 WSL Debian、普通用户 wangzishi、新 Linux checkout 的 `fixture.sh` 启动，同样只透传 stdin。fixture 独立审查通过前不要执行；本工具不代替真实 HTTP/ORM 业务 writer。
