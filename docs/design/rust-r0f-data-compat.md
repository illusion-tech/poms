# RUST-R0F 数据、类型与事务兼容输入

**日期**：2026-10-26；**Issue**：[RUST-R0F #59](https://github.com/illusion-tech/poms/issues/59)；**范围**：[R0F G1](rust-r0f-compatibility-baseline.md) 内的离线样本。产品参考提交为 `033aedd028fc25ea990450a7854fc92c567cfb8a`，R0A–E 交付参考为 `08daaf45b12307bc4d53e01e509f23d265532de6`。

本文件冻结现有 TypeScript 的可观察值、R1 的 10 表 121 字段及事务输入，不实现 Rust 产品，不运行 migration/seed，不读取真实业务行，不连接 PG17、TEST 或隔离 PG15。R1 总体及子切片仍按[实施输入](rust-r1-foundation-baseline.md)验收。

## 1. 产物与执行

- [oracle.mjs](../../tools/rust-r0f/data-compat/oracle.mjs)：直接加载完整现有模块，或通过 TypeScript AST 原样摘取白名单方法/函数/常量；只对 repository 连接使用录制 double。
- [cases.json](../../tools/rust-r0f/data-compat/cases.json)：76 组合成输入；日期、`undefined`、负零均用显式标签，避免 JSON 自身丢失差异。
- [golden.json](../../tools/rust-r0f/data-compat/golden.json)：243 个返回/抛错/校验/录制观察值，以及来源指纹和枚举投影。输入组数不是业务场景或 HTTP 通过数。
- [r1-persistence.json](../../tools/rust-r0f/data-compat/r1-persistence.json)：逐字段 property/column、原始表达式、类型/nullable/default/version/关系、索引/迁移线索、R1 访问边界和事务输入。

在仓库根目录、已有锁定依赖的 Node 24.9+ 环境执行：

```text
node tools/rust-r0f/data-compat/oracle.mjs --check
```

省略参数也是 `--check`，不会刷新预期。显式 `--write` 只用于已审查后的重录；源文件相对 `033aedd0` 有差异、上游数据库清单指纹变化、未知依赖、现有测试向量不符时，`--write` 同样先失败。不能把“重录后相等”当作兼容通过。

## 2. 真实来源与提取边界

共执行 3 个完整现有模块、25 个原始类方法、2 个原始函数和 4 个原始常量，合计 34 条来源记录。完整模块包括 `core/date/business-date.utils.ts`、`libs/shared/contracts/src/lib/shared-contracts.ts` 及 `features/commission/commission-settlement-write-chain.ts`。金额方法分别来自 CommissionService、ProjectCostService、ContractFinanceService；另执行 ContractService 的日期方法及 AuthSessionRepository 的六个方法。源码文件、类名、方法名、行号与 AST 摘录 SHA 都在 `provenance.excerpts`。

摘录使用现有节点的 `node.getText()`，保留方法体；适配器只提供调用桥和声明的 repository 字段，不运行产品构造器、不初始化 Nest/ORM。`this` 引用只能指向同一白名单方法或显式 facade 字段；转译后还做自由词法名称检查，未知 import 立即拒绝。每次执行均包含“未执行分支中的未知词法变量”及“遗漏依赖方法”的负例，结果为拒绝，不能悄悄提供金额语义 stub。

真实依赖为锁文件对应的 TypeScript 6.0.3、Zod 4.6.1、Nest common 12.0.1。Zod schema、Nest 异常与 JavaScript Date/Intl/Number/toFixed 均调用实际库或运行时。源码和锁文件共 32 项相对产品参考提交检查；另绑定已在 Windows/Linux 复核的 R0 数据库 JSON 的 normalized SHA `4796b8a0eca31f6d59e7d36d3de5a2653ab2ab4dc5d818346c0ebe3de965cbc3`。该 artifact 纳入组合 manifest，因此 copied column/nullable 等衍生信息也有已审来源。

UTF8 读取时只做 `text.replace(/\r\n/g, '\n')`，再 parse、提取和 hash；BOM、裸 CR、Unicode、其它空白及源码显式转义不改。解码后的业务字符串不额外规范化。工具自身、样本、完整模块、AST 摘录和原 SQL 都沿用同一来源规则；`--check` 对 JSON 文本也只做上述换行规范化。

## 3. 样本覆盖与日期行为

| 输入组                   | 数量 | 执行证据                                                  |
| ------------------------ | ---- | --------------------------------------------------------- |
| Date/string/null 日期    | 17   | 实际 business-date、cost date、cost timestamp 三条投影    |
| 合同日期                 | 5    | 实际 normalizeDateOnly；区分 undefined/null/空字符串      |
| 已有保留款测试向量       | 4    | 直接调用现有完整模块，核对原测试标题与固定 expected       |
| 金额输入                 | 19   | 每项执行 8 条现有金额/比率/透传/校验投影                  |
| nullable decimal         | 5    | 实际 toNullableDecimal                                    |
| UUID/外部 ID/枚举 schema | 13   | 实际共享 Zod safeParse                                    |
| Session repository       | 10   | 六个实际方法发出的 SQL/参数与合成返回值                   |
| Session timestamp        | 3    | 原 toDate/applySessionWriteSnapshot 的 Date/string/非法值 |

`apps/poms-api/src/app/core/date/business-date.utils.ts:1` 固定业务时区为 `Asia/Hong_Kong`；Date 用该时区格式化，字符串直接 `slice(0, 10)`，falsy 返回 null。因此同一时刻 `2026-04-18T16:00:00.000Z`，作为 Date 得到 `2026-04-19`，作为字符串得到 `2026-04-18`。不能先把所有 date/string 强制解析成 UTC 日期再统一输出。

样本覆盖香港午夜前后、闰日、正负 offset、显式 UTC 参数、非法 Date、内部非法/短字符串，以及成本服务的 timestamp 输出。通常输入带明确 Z/offset 或为 ISO date-only，但 `2026-2-9` 这个内部短字符串会被旧 `new Date` 按本地时区解析。oracle 因此只在自身进程设置 `TZ=UTC`，同时核对 Intl 时区和本地日期构造结果；该执行条件记录在 provenance，不改变产品的香港业务日期规则。`ContractService.normalizeDateOnly` 位于 `features/contract/contract.service.ts:252`，保留 undefined/null，并对字符串截取日期；它与 business-date 工具不是完全相同的 null 策略。

保留款四项 expected 来自 `features/commission/commission-settlement-write-chain.spec.ts`：缺日期、业务日到达、午夜前 pending、Date 按业务日归一。对应既有单测实际执行通过，见第 8 节。内部 helper 处理非法字符串的结果不表示 DTO/HTTP 允许该输入。

## 4. 金额旧输出与 Rust 兼容要求

来源为 `features/commission/commission.service.ts:2459` 和 `:2506`、`features/project-cost/project-cost.service.ts:2832` 和 `:2870`、`features/contract-finance/contract-finance.service.ts:675`。Commission/Finance 金额输出 2 位；Commission 比率 4 位；Cost 金额 4 位、比率 6 位。许多路径先 `Number(...)` 再 `toFixed(...)`，而 string 透传路径保留原始小数位。

| 输入                    | 现有 Commission/Finance 金额字符串 | 兼容含义                                               |
| ----------------------- | ---------------------------------- | ------------------------------------------------------ |
| `"1.005"`               | `"1.00"`                           | JS 二进制数路径；不替换为十进制半分舍入                |
| `"2.675"`               | `"2.67"`                           | 同上                                                   |
| `"-1.005"`              | `"-1.00"`                          | 负数同样按现有 number 值                               |
| `"1.125"` / `"-1.125"`  | `"1.13"` / `"-1.13"`               | 精确二进制 tie 也要逐字兼容                            |
| number `-0`             | `"0.00"`                           | 与小负数舍入产生的 `"-0.00"` 有区别                    |
| `"9007199254740993.00"` | `"9007199254740992.00"`            | Number 转换已有精度损失；原字符串透传仍保留原值        |
| `"0001.2300"`           | `"1.23"`                           | stringifyDecimal 的 string 分支另保留 `"0001.2300"`    |
| `"1e21"`                | `"1e+21"`                          | helper 格式边界；超出部分业务列/DTO 范围，不宣称可写入 |

输出编码显式区分 NaN、无穷与负零，并记录真实 finite/正数校验的异常；空字符串、空白等仅用于展示 helper 与 DTO 分层，不能推导公开接口允许空金额。

R0E 独立 PG15 TEMP probe 已观察到 native `numeric(18,2)` 的 `1.005 → 1.01`、`2.675 → 2.68`，见[数据库环境说明](rust-r0e-database-notes.md)。该结果和这里的旧 JS 输出不同。现有行为是本次兼容 SSOT；改成 rust_decimal 的十进制计算、数据库舍入或 Rust 默认浮点格式都需要逐样本证明，差异作为独立规则问题处理。

R1B 应区分“持久化 decimal/string 原值”“旧 Number 计算/格式投影”“JSON wire string”。不要全局把 Decimal 显示、string 透传和旧 number 计算合并成一种路径。Rust 候选实现先消费 frozen golden 精确比较字符串、null/undefined 与错误；业务计算链、累加顺序、阈值和舍入时机仍在 R3–R5 验收。本节不是完整资金/成本/提成规则通过。R1 的下述 121 字段不含 numeric 金额列，本组是后续共用兼容库输入。

## 5. ID 与枚举来源

共享模块提供 37 个 `PERMISSION_KEYS` 及 `USER_ORG_UNIT_MEMBERSHIP_TYPES = ['primary', 'secondary']`，由工具执行原模块后投影。真实 Zod 样本区分内部 UUID、nullable/缺省组织 ID 和外部部门 ID：`dept_external_001` 不是内部 UUID，但外部 ID schema 可接受并 trim；不能把所有尾缀为 Id 的字段统一映射成 UUID。

AuthSessionStatusValue、AuthSessionRevokedReasonValue 来自 `core/auth/auth-session.entity.ts:6`，AuthSessionErrorCodeValue 来自 `core/auth/auth-session.service.ts:39`；它们是后端本地常量。撤销原因的 `account-disabled` 与错误码 `account_disabled` 不同。应通过机械导出或原来源核验给 Rust 使用，不独立手写第二套权威值。

`PlatformService.getUserPermissionKeys` 当前从 active assignments/roles 取值去重，`as PermissionKey` 只是类型断言，没有运行时对 37 项白名单再取交集。R1 若换成强枚举解析，需要明确处理持久化未知值，不能静默改变当前行为。此方法在来源冻结集合内，本工具尚未对其全聚合执行 golden；对应真实权限变化仍需 R1C 数据库场景。

## 6. R1 逐表字段与 ORM 责任

以下 10 表共 121 字段。所有字段的类型表达式、column、nullable、默认值、version、关系、索引及 migration 线索以 `r1-persistence.json.tables[*]` 为可复算逐项矩阵；每个 property/initializer 还与原实体 AST 顺序和文本匹配。R0 inventory 的已审 hash 固定解析结果，实体源 hash 固定产品输入；本轮没有查询实际产品 schema。

| 表                         | 字段数 | R1 访问范围                      |
| -------------------------- | ------ | -------------------------------- |
| auth_session               | 16     | 查询、创建、条件原子更新         |
| platform_user              | 16     | 认证/资料读取，管理写入归 R2     |
| local_credential           | 5      | 密码 hash 读取，不重哈希或改密码 |
| role                       | 12     | 有效角色读取                     |
| user_role_assignment       | 11     | 有效用户角色读取                 |
| role_permission_assignment | 11     | 有效角色权限读取                 |
| org_unit                   | 12     | 用户资料组织读取                 |
| user_org_membership        | 12     | 用户组织关系读取                 |
| audit_log                  | 12     | 最小必要 append；管理查询归 R2   |
| security_event             | 14     | 认证/权限拒绝等最小 append       |

- `auth_session`：id, token_hash, csrf_token_hash, user_id, status, idle_expires_at, absolute_expires_at, last_seen_at, revoked_at, revoked_reason, created_ip, last_ip, created_user_agent, row_version, created_at, updated_at。
- `platform_user`：id, username, display_name, email, email_verified, phone, phone_verified, avatar_url, is_active, primary_org_unit_id, last_login_at, row_version, created_at, created_by, updated_at, updated_by。
- `local_credential`：id, user_id, password_hash, created_at, updated_at。
- `role`：id, role_key, name, description, is_active, is_system_role, display_order, row_version, created_at, created_by, updated_at, updated_by。
- `user_role_assignment`：id, user_id, role_id, status, assigned_at, assigned_by, revoked_at, revoked_by, change_reason, created_at, created_by。
- `role_permission_assignment`：id, role_id, permission_key, status, assigned_at, assigned_by, revoked_at, revoked_by, change_reason, created_at, created_by。
- `org_unit`：id, name, code, description, parent_id, is_active, display_order, row_version, created_at, created_by, updated_at, updated_by。
- `user_org_membership`：id, user_id, org_unit_id, membership_type, status, assigned_at, assigned_by, revoked_at, revoked_by, change_reason, created_at, created_by。
- `audit_log`：id, event_type, target_type, target_id, operator_id, request_id, result, reason, before_snapshot, after_snapshot, metadata, occurred_at。
- `security_event`：id, event_type, severity, actor_id, principal, request_id, path, method, permission_key, result, ip, user_agent, details, occurred_at。

SQLx 必须显式承担 MikroORM 原先提供的 UUID/default、timestamptz Date 映射、null、mapToPk 外键、JSON、updatedAt hook、乐观 version 与约束失败映射。auth_session、platform_user、org_unit、role 有 version 字段，assignment/audit 没有通用自动 row_version；不能所有表统一加版本。原始 session SQL 自己增加 row_version/updated_at，不能再叠加 ORM 式 flush。

保留 active assignment 的部分唯一约束、每用户单个 active primary 组织关系、组织名称的 parent/coalesce/lower 约束、token 唯一性和既有外键 delete 规则。audit target_id 是多态目标字符串；审计 JSON 与 nullable 操作者/快照要逐字段保留。完整约束存在矩阵及 R0 SQL 线索中，离线投影不证明实际数据库约束已生效。

## 7. 事务、Session SQL 与逐连接时区

| 命令/读侧     | 现行边界与 R1 输入                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 密码登录      | verifyCredentials 读取账户/凭证/权限 → createSession save/flush → 设置 Cookie → 读取 profile；没有显式包住整条链的事务，后续 profile 失败可能已有 session，不能暗中改成全有全无 |
| 解析会话      | 查询状态/账户/权限；touch/expire/revoke 各是一个条件 UPDATE RETURNING；拒绝审计是后续独立 save，无共享外层事务                                                                  |
| 刷新 CSRF     | 先 resolve/touch，再条件 rotate；没有 RETURNING 行时重读最新快照分类；不能覆盖并发撤销/到期                                                                                     |
| 退出/批量撤销 | 单条 guarded UPDATE 原子执行；批量按返回行数计数；不额外 flush                                                                                                                  |
| 最小审计      | recordAuditLog(input, em) 仅 persist 入调用者事务；无 em 时 repository save/flush；recordSecurityEvent 走默认 save/flush                                                        |
| 当前用户资料  | 读取用户/组织/关系/角色聚合；检查过的登录路径没有写 last_login_at；dev fallback 需由认证样本单独标记                                                                            |

来源为 `core/auth/auth.controller.ts:214`、`core/auth/auth-session.service.ts:88`、`core/auth/auth-session.repository.ts:80`、`core/runtime-audit/runtime-audit.service.ts:55` 及 `features/platform/platform.service.ts`。存在命令拥有事务时，下游应显式传同一事务；当前源码没有共同事务的链不能以架构原则虚构原子保证。

repository 六方法的十次录制覆盖读取命中/缺失、touch 命中/零行、CSRF 命中/零行、expire、revoke、批量撤销两行/零行；SQL 文本/参数顺序直接来自原方法。touch 保留 active、throttle、idle/absolute 有效性条件、`least` 到期上限、IP coalesce、row_version/updated_at 增量；Date/string snapshot 由原函数归一。

连接 double 只记录 SQL 并返回明确声明的合成行，不计算 WHERE/锁/事务/触发器或实际行状态，也不证明 PG driver 解码。真实 R1C 必须验证过期边界、同时 touch/rotate/revoke、账户停用、权限变化、唯一/FK失败、rollback 和异常映射；credentials 的 bcrypt 及完整 Cookie/CSRF/error 实现由[认证样本](rust-r0f-auth-compat-baseline.md)界定。

SQLx 0.9.0 startup 会发送 UTC；R0E 实测见[环境说明](rust-r0e-database-notes.md)，实现来源为 [SQLx establish.rs](https://github.com/launchbadge/sqlx/blob/v0.9.0/sqlx-postgres/src/connection/establish.rs)。R1 使用 `PgPoolOptions::after_connect` 对每条新连接执行 `SET TIME ZONE 'Etc/GMT-8'` 并读回，不能只通过 pool 执行一次 SET。至少同时借出两个不同 PID、断线重连、初始化失败、取消/超时后 rollback/归还连接；本轮没有实现或执行该 pool。这与 `Asia/Hong_Kong` 业务日期规则分别固定，不能互相替代。

## 8. 指纹、检查与放行边界

| 项目                                      | 本轮证据                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| golden.json normalized SHA256             | `c8c58d1e49b848dc274b5ca6d4125bd67c3c0ec3797fac7700c4b7c2bea19329`                                                |
| r1-persistence.json normalized SHA256     | `8b6bb9af544ba4876e1847d22a4b5a2afff38ced13453b1ac206bf5be8eb691f`                                                |
| 32 源文件 + 1 上游 artifact 组合 manifest | `c62b089a7a2a86af77dd402a6ec603598fc16bcf494674924c2c76e1789034f1`                                                |
| 已有对应纯单测                            | 2 suites / 11 tests Pass；保留款 write-chain 与 auth-session repository，使用项目 Jest/ORM mock 配置              |
| 运行时                                    | Windows Node 24.19.0 / TypeScript 6.0.3 / Zod 4.6.1 / Nest common 12.0.1；Node patch 单独报告，不参与 golden 文本 |

现有单测执行命令：

```text
node --experimental-vm-modules node_modules/jest/bin/jest.js --config apps/poms-api/jest.config.js --runInBand --runTestsByPath apps/poms-api/src/app/features/commission/commission-settlement-write-chain.spec.ts apps/poms-api/src/app/core/auth/auth-session.repository.spec.ts
```

本轮差异保留在类型/数值/事务输入中，没有修复业务行为。来源审查发现的“未绑定上游数据库 JSON”已通过解析前 SHA guard、artifactInputs 和组合 manifest 修复。Windows 的工具 syntax、ESLint、Prettier、Markdown、`--check` 和外部初始 TZ=Pacific/Honolulu 的复算均通过；主代理另做最终集成和 Linux 复算，本文件不将 Windows 结果写成 Linux 认证。它们只证明 R0F 产物可审查/复算。Nest/Rust HTTP 对照、真实产品表、migration/seed、密码/会话跨后端、数据库并发、浏览器与完整金额业务规则仍是 R1 或后续域的必需验收，不由这些离线值替代。
