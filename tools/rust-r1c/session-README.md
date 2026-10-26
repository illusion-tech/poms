# R1C 旧会话服务与 PG15 互通桥

`node tools/rust-r1c/session-bridge.mjs --check` 只读源码，复核冻结来源和工具指纹，不连接数据库。`--write` 仅显式重录 `session-source.json`；不刷新 R0F 的 119 个 golden，也不执行 migration、seed 或 reset。输入绑定 `1013afef266602e7c98eb433bd0f14483be3d7fd`，同时拒绝工作区、index 和未跟踪来源漂移；文本只规范化 UTF-8 CRLF 为 LF。

桥加载完整旧 `AuthSessionService`、`AuthSessionRepository`、`PlatformRepository` 及 10 个实体模块。平台服务使用六个原样 AST 方法：凭证检查、活动账户解析、权限读取、已清理 profile、聚合上下文和多组织投影。DI 构造胶水不作业务决策；`loadValidatedEnv` 是固定合成环境边界。未知词法名称、导入、`this` 依赖或额外方法会拒绝。数据库执行使用真实 MikroORM `EntityManager`、entity metadata、repository、`create/persist/flush` 和 PostgreSQL driver；会话 SQL 由原仓储实际执行。

`--execute` 从 stdin 读单个合成动作，显式要求 `POMS_R1C_DATABASE_TEST=1` 和 `POMS_R1C_DATABASE_TEST_URL`。仅接受 `poms_r1c_app`、`127.0.0.1:15432`、两个专用库 `poms_r1c_nest` / `poms_r1c_rust`，且拒绝 `PGOPTIONS` 和 MikroORM 环境覆盖。任何产品操作前核验 PG `150012`、实例 GUC、当前库、session/current role 与非管理员权限，包含 `rolreplication=false` 和直接角色成员数为零，避免 `NOINHERIT` 后再 `SET ROLE`；ORM pool 另核连接身份、时区、search_path、replication 与成员数。持久 `r1c_control.marker` 由主运行器以 owner 在前置只读步骤核验，app 不获 marker 权限。

`tests/auth_database.rs` 的显式 ignored 验收由主代理 `check.sh db` 串行运行，直接 `--ignored` 缺参数会失败。它先作 URL / 身份验证，再为本次 run 生成合成 UUID 和行，只精确清理自己创建的用户、角色、组织和 request_id；断言失败也尝试清理，不 TRUNCATE 或修改已有业务数据。原服务桥验证旧 ORM 创建 → SQLx 读取/轮换 → 旧 ORM 撤销，以及 SQLx 创建 → 旧 ORM 读取/续期/轮换 → SQLx 验证/撤销 → 旧服务失效；另对照真实 bcrypt、未知权限、多组织、失活组织和未知 membership 字符串的 profile。

CP05 的真实 ORM 写入观察区分 raw SQL 和后续 managed flush。公共 GET 的失效写入单独提交，版本由 1 变 2；受保护请求写安全事件时，原 `persist(...).flush()` 在同一事务先 INSERT 事件，再按当前版本 2 对 dirty session 乐观 UPDATE，运行 `updatedAt.onUpdate` 并产生版本 3。Rust 的 sealed `SessionFlush` 只随本次 `AuthError` / `ResolvedSession` 传递，不放入共享服务；只有相应审计边界执行额外事务。仅版本字段变化不视为 dirty。INSERT 失败或 CAS 失配都回滚本次 flush，保留此前 raw 写入；公共 GET 和无审计的成功 logout 不统一加版本。

11 个真实 DB 用例还覆盖 test-only `guarded_route`：default-deny 无事件、all/any 不足有事件、metadata override、生效权限及错误方法不读取/续期会话；以及 managed flush 的成功、插入失败、并发撤销导致 CAS 失败、touch dirty 和只有 version 变化。没有新增产品路由。`http-database.mjs --check` 只离线载入原 Controller/guards/DTO/审计及 CORS builder；`--execute` 由同一隔离入口运行两个真实 HTTP 服务、真实 MikroORM RequestContext 和 SQLx。29 个场景/服务比较响应、完整 Cookie 属性、已核验的随机 token/期限、匹配 Origin 的 CORS 与 preflight、实际行状态/版本和安全事件；额外锁定 due-touch 后 CSRF 审计、due-touch 的成功 logout 和受保护过期审计失败。原框架指纹、连接头及动态时间不作为业务差异；动态值先校验形状、SQL hash 和实际 DB 期限关系再归一。清理完两库本轮事件、会话和用户均为零后才输出成功。

权限序列另按 `accepted-db-specific-difference` 留证：原仓储查询未指定 `ORDER BY`，服务按数据库返回顺序执行 filter/map/Set。不同库的物理页、索引和统计可产生不同序列，不构成字典序合同。运行器必须捕获实际旧 ORM SELECT 并确认没有 ORDER BY，且两端先检查纯字符串、唯一性、合成场景的完整原始权限集合（含未知键）、顶层与 profile 在归一前逐项相等，再仅对比较副本的 `body.permissions` / `body.user.permissions` 归一。原始两端序列与分类写入实际结果；产品查询和输出不变。源码出现 ORDER BY 会阻断验收，不能沿用此分类。

组织序列是独立的 `accepted-db-specific-difference`：`platform.repository.ts:102–103` 的 `findActiveUserOrgMemberships` 没有 orderBy，`platform.service.ts:1030–1048` 按成员关系查询的顺序 filter/flatMap。`findAllOrgUnits` 的显式排序只构建查找 Map，不决定 profile 数组，也没有 primary 优先规则；成员实体未设默认排序。Rust `store.rs` 同样逐项投影未排序的成员查询。运行器记录实际旧 ORM 成员 SELECT 并要求无 ORDER BY；归一前核验唯一组织 id 和全部五个字段的完整合成对象，包括 description 为 null、未知 `future-membership` 以及仍应出现的失活 secondary 组织。仅比较副本的 `body.user.orgUnits` 按 id 排序，不去重、不删除字段，两端原始对象及顺序留证。此前成功运行中的随机 UUID 恰好同序不构成排序保证。

其余数组仍按原样逐项比较。角色来源 `platform.repository.ts:98–99` 同样没有 orderBy；`platform.service.ts:914–922` 遍历 assignments 追加名称，已排序的 role Map 不改变数组顺序。此 HTTP 合成样本只有一个活动角色 assignment，运行器明确断言 `roles` 完整等于该单元素数组并记录实际 SELECT，不归一角色，也不认证多角色在两个物理库之间的排序。安全事件、Cookie 及状态数组保持原验收比较。

工具输出不含数据库连接串、密码、凭证或已存储 token/CSRF hash；互通所需的临时合成 token 仅在受控子进程 JSON 通道返回。持久化与 HTTP 证据分别计数。桥不认证任意旧业务方法、生产数据、外部 provider、通用 E2E 或 migration 接管。
