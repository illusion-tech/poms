# RUST-R1C 实施纠偏 Checkpoint

- Checkpoint Status: `Pass`（G3 最终冻结复验通过，G4 待提交归档）
- Parent: [R1C #64](https://github.com/illusion-tech/poms/issues/64)；[G1 基线](rust-r1c-auth-session-baseline.md)
- Owner: 主代理；G3 Reviewer: 非作者子代理交叉审查
- Slice Type: `cross-layer-high-risk`；日期: 2026-10-26

本记录保留实施期间发现的偏差及 G3 阻断；原 TypeScript、冻结 schema/OpenAPI 和真实 Nest 行为仍为兼容依据，不重写 G1 输入。纠偏仅覆盖 R1C 和必要 R1A 回归。R1D/E、完整平台、业务域、部署仍在本切片之外，父 R1 继续 Doing。

## 1. 偏差与处理

| 编号     | 分类                           | 证据与处理                                                                                                                                                                                                                                                                                                                        | 复验状态                                        |
| -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| R1C-CP01 | `existing-baseline-drift`      | 原 Nest HTTP bootstrap 使用 `setGlobalPrefix('api')`；实际未匹配路径/方法落入 Express finalhandler，返回 HTML 404，R1A 以独立异常 filter 形状推定 JSON 404 不成立。以本轮原 HTTP oracle 的状态、正文及 CSP/nosniff/Content-Type 为准修正 Rust fallback，查询字符串不回显，encodeurl 安全字符保留；保留历史 R1A 证据及其当时范围。 | Pass：原 HTTP75、真实 HTTP29×2 与 R1A78 断言    |
| R1C-CP02 | `new-real-drift`（提交前修复） | 验收 secret 格式断言可能在无效输入时回显输入；改为固定错误文本并通过实际函数负例检查。已连接的验收 app role 检查补齐 replication 和任意 role membership，拒绝通过 SET ROLE 获得额外权限；projection DB 测试复用统一先验身份 guard。                                                                                               | Pass：secret 负例、两库身份、20 项真实 DB 回归  |
| R1C-CP03 | `new-real-drift`（提交前修复） | 显式传入的审计时间需保留原 JS Date 的毫秒精度，Rust 初稿保留了额外亚毫秒；统一经过毫秒 TimeClip。所有应用连接继续沿用 R1A Etc/GMT-8 初始化。                                                                                                                                                                                      | Pass：审计毫秒、双向 session 和最终真实 DB 回归 |
| R1C-CP04 | `new-real-drift`（提交前修复） | bcrypt 引入已运行的 `spawn_blocking` 任务；Tokio runtime 隐式 Drop 会无限等待，可能超过 R1A 退出期限。主程序改用显式 runtime，HTTP/数据库 lifecycle 完成或期限耗尽后不追加等待；这不宣称取消阻塞任务。依据本轮固定 Tokio1.54.1 源码及官方说明，另以真实子进程、已开始的合成阻塞 worker 和 SIGTERM 验证退出。                      | Pass：实际子进程、阻塞 worker 与 R1A78 断言     |

### R1C-CP05 会话与审计 flush

分类为 `new-real-drift`。双后端真实 HTTP 的 26 个场景在最后比较时发现：Rust 过期/账户停用会话 `row_version=2`，原 Nest 为 `3`；其他响应、Cookie、CORS、会话状态及安全事件未见差异。原 MikroORM managed entity 在 raw UPDATE 后应用 snapshot，后续安全事件 flush 会再写入 dirty 会话；实际 SQL trace 和独立 request EntityManager 已确认公共路径没有这次额外更新。

修复以 sealed、无 Serialize、脱敏 Debug 的请求局部 `SessionFlush` 承载变更字段与预期版本，不在共享服务保存状态。后续审计按原顺序 INSERT event → session CAS UPDATE → COMMIT；插入或并发 CAS 失败显式回滚整次 flush，先前 raw 会话更新保留。只有版本变化不视为 dirty；公共查询不额外写入。真实 PG15 已通过原始更新、成功 flush、22001 插入失败、并发撤销/CAS 失败及 touch flush 回归；29 个 HTTP 场景中版本/状态/审计/Cookie 对比一致，集合遍历顺序按 CP07 单独处理；最终 29×2 场景及 558 项断言全部通过。

这些修正没有变更现有 TypeScript/OpenAPI、共享定义或产品 migration，不扩大 R1C 路由或业务范围。

### R1C-CP06 HTTP 字符串与解析边界

分类为 `new-real-drift`（提交前修复）。非作者检查发现根数组前 JSON 空白、原始无效转义后孤立 surrogate、多字段 form object 合并分类、logout strict 未知键的 UTF-16 错误消息与扩展年份格式存在差异。按原管线修正：先验证原 JSON 转义，再保留 JS 码元；复用 R1B 的 JS ISO 格式；错误正文不二次转义。最终 oracle 固定 75 个场景，其中 37 个 parser/DTO 负例由 Rust 测试逐项消费，另直接消费 strict logout surrogate 样本。固定镜像下最终 81 项普通 Rust tests、75 个原 HTTP 场景和真实 HTTP 对照已通过。此证据不宣称穷举 V8/body-parser/qs 的全部输入。

### R1C-CP07 无显式顺序的数据库集合

分类为 `accepted-db-specific-difference`。原 `PlatformRepository.findActiveRolePermissionAssignments()` 与 `findActiveUserOrgMemberships()` 没有 `orderBy`；原服务分别按查询遍历顺序构造去重权限和组织成员列表。组织基础表按 displayOrder/createdAt 查询后只构造 ID Map，并不规定响应成员列表顺序。Rust 保留相同查询及映射语义；两个独立 PG15 数据副本的物理计划与扫描顺序不能作为兼容合同。PostgreSQL15 的[排序文档](https://www.postgresql.org/docs/15/queries-order.html)也明确，无显式排序时输出次序不保证。

验证器捕获实际原 ORM SELECT，并拒绝把含 ORDER BY 的查询归为此例外。仅在比较副本中对 `body.permissions`、`body.user.permissions` 与 `body.user.orgUnits` 按 key/ID 对齐，保留双方原始响应和 SQL。权限先断言字符串、无重复、完整期望集合、同响应两处原始数组一致；组织先断言唯一 ID 与完整期望对象（包括可空字段、未知成员关系、失活组织仍被返回），不去重、不丢字段。其它数组与会话/事件顺序继续严格比较，产品没有新增排序。本条是数据库不保证顺序的证据处理，不允许忽略有显式排序的差异。

角色响应同样由无序 assignment 查询驱动；本 HTTP 数据样本仅有一个有效角色，仍保持原数组严格比较，不宣称完成多个持久化角色在两库间的顺序认证。

### R1C-CP08 跨平台 gzip 样本

分类为 `tool-noise`。同一 gzip 明文在 Windows/Linux 生成的压缩头 OS byte 分别为 0A/03，导致固定样本检查失败；独立捕获确认 75 个输入的语义和原服务观察值完全一致。将两条 gzip 请求固定为公开合成字节，并校验解压明文；两平台不再自行生成不同头。仅 generator 来源哈希相应更新，原响应观察值不变；最终 Linux Node24.16 与 Windows Node24.19 检查分别执行。保留此前失败结果，不把平台噪声标成产品失败或篡改旧 R0F/R1B golden。

## 2. 当前结论

G3 为 Pass。CP01–06 已按原行为修复并通过最终复验；CP07 的无序集合规则由实际 SQL 与独立正负断言支持；CP08 以固定公开 gzip 字节解除跨平台工具噪声。最终证据见 [机器验收记录](rust-r1c-validation.json)及 [G3 矩阵](rust-r1c-auth-session-baseline.md#7-g3-最终验收)。无 gate 绕过、未修复 P1/P2 或延后补验项；G4 等待实现提交、推送和归档。

## 3. 验证与切片边界

执行 `check.sh check/oracles/crypto-roundtrip/db/http-db/foundation-db/foundation-system/openapi`，另核对隔离 catalog、七操作规范、Debian12 ABI、工具 lint/格式和本轮 Markdown 链接。普通 `cargo test` 中显式 ignored 的 DB 验收不计通过；专用入口实跑结果另列。退出测试中的 ignored 子进程 fixture 由父测试显式启动，不按独立普通测试计数。

现有 TypeScript、完整 OpenAPI、共享类型与既有产品 migration 不变；其原实现只作为对照执行。无关 Angular build、通用双后端客户端/E2E 与真实浏览器综合验收不属于本切片，后两项由 R1D/E 承接。现有 PG17 服务和数据不参与本次验证；合成输入只写已校验的 PG15 专用库，逐轮清理限定本轮 UUID。
