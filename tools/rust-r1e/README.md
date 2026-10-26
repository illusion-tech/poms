# R1E 专用环境与有限 fixture

本目录服务于 [R1E 冻结基线](../../docs/design/archive/slices/rust-r1e-stage-acceptance-baseline.md)。它使用已有 PG15.12 隔离容器的 `15432`，仅允许新库 `poms_r1e_nest` / `poms_r1e_rust`、运行角色 `poms_r1e_app` 和 `r1e_control.marker=9c658fe8-bdde-4d12-84a7-8fb5f157f645`。不连接 PG17 / TEST，不修改旧验收库，不提供 drop/reset、任意 SQL 或任意用户操作。

## 环境准备

主代理在普通 WSL 用户 `wangzishi` 的专用 checkout 执行 `bash tools/rust-r1e/environment.sh provision|migrate|env|seed|catalog|status`。具体输入冻结于 `70482a77091e0288e4708fbdf6a4fec5b5d51427`，92 个历史 migration 和原 `DatabaseSeeder` 的工作区、index、untracked 均独立检查。两库分别执行原迁移和 seed，不复制旧验收库的可变数据。运行端口为 Nest `4900` / Rust `4901`，CORS origin 为 `http://127.0.0.1:5000`。

`tools/e2e/api-server.cjs` 仅在显式 `POMS_E2E_ENV_PROFILE=r1e` 时选择本目录的 `managed-environment.cjs`。未设置保持 R1D，未知值或大小写别名拒绝。external 模式仍在读取环境文件和加载 managed guard 之前返回；独立 fixture 调用不赋予 external 后端的进程所有权。managed 模式只读取显式合成环境文件，不接受根 `.env` 或 `deploy/private`，不继承 PG/DB/Node 覆盖。

## Fixture 协议

复用 `fixture-protocol.cjs` 及 `.d.cts` 的 `fixtureCredentials` / `fixtureCommand`。每次仅通过 stdin 输入一个 UTF-8 JSON 对象，最大 16 KiB；禁止额外字段和 argv 参数：

```json
{"formatVersion":1,"runId":"62ebf92e-c623-4e31-9080-c5dbf01beb7d","backend":"rust","action":"prepare","account":"none"}
```

`backend` 仅 `nest|rust`。`prepare` / `cleanup` 的 `account` 必须为 `none`，操作本 run 的两个账户；其余动作必须为 `admin|viewer`。动作 `expire-idle` / `expire-absolute` / `revoke` 必须携带 `sessionToken`，只能来自该浏览器实际收到的 session Cookie。token 立即转换为 SHA-256，后续只按摘要与 journal 用户 UUID 的联合条件定位；不进入 argv、环境、journal 或输出。其他动作禁止携带 token。

`disable` 仅停用该 run 账户。`permission` 清空该账户自有角色的权限。`restore` 启用账户并恢复该角色原权限，不恢复旧的 expired/revoked 会话。admin 权限来源是受指纹保护的 R1B `PERMISSION_KEYS` 全部 37 项，viewer 仅 `project:read`；没有第二套权限清单。账户合成凭据由 `fixtureCredentials(runId, account)` 生成，fixture bcrypt 成本为 4，仅用于测试账户。每个账户有独立的 run-owned 角色、组织和 primary membership。测试状态 DML 是明确的 fixture 操作，不作为旧 ORM 或产品认证实现的 oracle。

成功 stdout 只有一行：

```json
{"formatVersion":1,"runId":"62ebf92e-c623-4e31-9080-c5dbf01beb7d","backend":"rust","action":"prepare","matched":2,"changed":2,"state":"prepared"}
```

`matched` / `changed` 为固定动作的非敏感行数摘要，不承诺不同动作之间同一计数单位；`prepare` 统计账户，`cleanup` 累计清理的用户/角色/组织/会话/事件/审计。错误 stdout 为空，stderr 只有固定 `formatVersion/code`，不序列化 pg error、查询参数、连接串或堆栈。UI 每个 run 添加 `x-request-id: r1e:<runId>`，使匿名安全事件也能被精确清理。

Windows 的 `fixtureCommand` 固定调用 `wsl.exe --distribution Debian --user wangzishi --cd /home/wangzishi/projects/poms-rust-r1e -- bash tools/rust-r1e/fixture.sh`。shell 仅运行固定镜像的短容器，stdin 原样透传，诊断送 stderr，不接受命令选择参数。Linux 浏览器容器直接运行 Node CLI，无须容器内 podman/wsl。两者子环境只复制系统路径/临时目录/locale 白名单，不能传入 DB/JWT/PG/Node 配置。

Linux 容器必须挂载本 checkout 为 `/workspace`、专用 private 目录为 `/r1e-private`，挂载秘密 `poms-r0e-owner-password` 到 `/run/secrets/r1e-owner-password`、`poms-r1e-app-password` 到 `/run/secrets/r1e-app-password`，并使用 `--network=container:poms-r0e-pg15`。Node CLI 不接受 URL、数据库或秘密路径参数。

## 验真、事务与中断恢复

CLI 先拒绝环境覆盖，再检查冻结 source/index/untracked 和 R1B manifest 的规范化 UTF-8 SHA。owner 连接只用于 `BEGIN READ ONLY`：验证 PG150012、15432、隔离 GUC、库名/owner/session/current identity 和唯一 marker，随后 rollback 并关闭。另开 app 连接只读检查同一身份、全部高权 flags 为 false（含 replication）、role membership 为 0、无数据库/产品 schema CREATE、无 marker schema 权限；通过后才进入写事务。

每个 backend/run 使用 session advisory lock，覆盖写事务、COMMIT 与最终 journal fsync，最后才解锁或关闭专用连接；重复并发操作拒绝。`/r1e-private/runs/<backend>-<runId>.json` 仅包含 run 标识、状态与预生成 UUID/fixture 名称，权限为 0600、目录 0700。禁止 symlink、错误目标/字段/UUID 或未知 journal 状态。`planned` journal 在 DML 提交之前原子写入并 fsync；事务回滚后它仍可用来清理，中断时不会丢失已规划的 UUID。提交后更新为 `prepared` 或 `cleaned`。清理前锁定本 run 的用户/角色/组织行、核对 UUID 与完整 fixture 名称，并拒绝其他用户的角色/组织引用及全部已冻结 SET NULL 外部引用（primary org、子组织、customer、follow-up、外部部门映射和 org sync）。检查这些引用只读计数，不写入对应业务表。

cleanup 只删除 journal 用户及其级联会话/凭据/分配、本 run 角色/组织，以及 actor/operator 为这些用户或 requestId 精确等于本 run 的安全/审计记录。清理后再次查询本 run 的用户/会话/角色/组织/事件/审计数，必须全部为 0。保留 `cleaned` journal，重复 cleanup 可验证零残留；已 cleaned 的 run 不再 prepare。UI 必须在 finally 执行 cleanup；失败或中断则用原 runId/backend 显式重试 cleanup，不执行全库清空。

CLI 自身总 deadline 为 45 秒，连接 timeout 5 秒、query timeout 10 秒，写事务 statement timeout 5 秒。杀死 Windows/WSL 前端不证明 Linux 后代或服务器查询立即停止；CLI deadline、服务器 statement timeout、事务连接关闭和 retained journal 共同限制中断后的影响。最终零残留需由成功 cleanup 的查询结果证明。

## 离线检查与证据边界

```text
node --test tools/rust-r1e/fixture.test.mjs tools/rust-r1e/managed-environment.test.cjs tools/e2e/api-server.test.cjs
```

这些测试验证输入拒绝、source/index 分别防护、身份/marker/role 判定、只读前置顺序、journal、精确 session/user 联合条件和 profile 的外部模式边界。它们不连接数据库、不冒充真实 PG/browser 通过；Windows 不要求 symlink 特权，symlink 负例标注跳过后由 Linux 实跑。真实准备、fixture 与四组合浏览器结果由主代理独立执行并归档。
