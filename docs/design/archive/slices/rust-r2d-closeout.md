# RUST-R2D 用户、owner-reference 与个人资料收口

- Slice：[#71](https://github.com/illusion-tech/poms/issues/71)，父 [R2 #67](https://github.com/illusion-tech/poms/issues/67) / [#57](https://github.com/illusion-tech/poms/issues/57)。
- 类型：`cross-layer-high-risk`；独立 managed worktree / solo checkpoint；起点 `a22cba7360346242cb7709740b7eb954b92d1fd4`。
- 输入：[G1 基线](rust-r2d-users-profile-baseline.md)、[纠偏记录](rust-r2d-corrective-checkpoint.md)。原 G1 字节保全为 `tmp/rust-r2d/g1-frozen-baseline.md`，SHA256 `f638206dc317d6fac66cd0aed26d95255a89c94f60502558dee93cbca4b1e455`。
- 当前：完整非作者G3 Pass，未关闭P1/P2为0；实现`9302fd7149257aa40584fc500fd76dd0c766b80d`已集成推送，归档前8步/26项适配器/1747来源静态检查实跑通过；G4随归档提交推送与Issue同步生效。
- 主代理负责环境、fixture、公共接线、实际验收和治理；A 负责契约/HTTP，B 负责持久化/服务/PG，C 为非产品作者；C 编写的取证工具另由 A/B 审查。

## 1. 交付范围与兼容边界

迁移既有11操作：8个 platform users、1个 owner-reference、GET/PATCH auth/profile。Rust 候选累计30路径、37操作，隐式 HEAD 不增加 OpenAPI 操作。原 TypeScript 单向拥有契约、完整 OpenAPI 与579个生成客户端；92份产品 migration 不变，无产品 DDL、密码 API、部署或正式写入权切换。

保留六类原 DTO 的 strict/剥离、nullable/缺失、原始 UUID、UTF-16 与有限 URL 语料行为。create 不接受 avatarUrl，不写 local_credential；组织替换 primaryOrgUnitId 必填非 null；原服务未使用的 expectedVersion 不加严。列表/detail 的 roleNames、profile/PUT 的 roles 都是角色显示名；PUT 的 permissions 为空。owner-reference 保留五权限任一授权和最小字段，profile 仅要求 authenticated。

原无关系 create 实际201、16键 raw entity，完整 spec 仍声明200；带 primary org 或初始角色的六种已观察形状在关系 SQL 前失败并回滚。Rust 保留原行为，不提前分配 UUID 修复兼容目标。保留请求内用户/角色快照、nullable hydration、no-op 审计、用户/session CAS，以及 nativeDelete、业务 flush、audit 的分段提交。停用遵从后续认证路径，不新增批量 session revoke。

列表保留 PG created_at DESC 微秒顺序；比较器只在同一次 PG 事实证明完全同微秒、连续的用户组内按逻辑身份整理比较副本，完整字段、成员和组边界仍严格比较；原数组不改，其他关系数组保序。HEAD 引用独立真实 GET。final05 两端 transport 统一输入 X-Forwarded-For: 192.0.2.25，仍严格比较存储 IP；这不证明未带来源头或其他代理配置相同。parser:safe-ignored 已按实际 list 操作重新采集 PG 事实，旧轮缺证不补造。

## 2. 实际验收

| 检查             | 结果与证据边界                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Rust             | Rust1.99.1；fmt、locked/offline all-targets check、clippy零warning、125普通测试及release通过。默认50 ignored单列，不当作已运行。             |
| 本片PG           | 11项显式PG测试通过、0ignored；每个owned run清理后再次0/0。                                                                                   |
| 原Nest见证       | 五份原报告覆盖73唯一计划case，SQL/事务/查询相位见证完整；各原件保留partial-observation状态，不与差分混计。                                   |
| 原schema         | 759项纯比较：753 JSON wire候选与6 own-undefined非wire；实际HTTP采用375原失败raw wire，其中18先被parser拒绝、357进入DTO。不是753raw全量HTTP。 |
| final05顺序HTTP  | 每端566项完整observed；正式严格比较566 Pass；双owner真实Pass且已停止。                                                                       |
| final05受控并发  | 每端16固定调度observed，正式严格比较16 Pass；仅声明的username/roles对称结果允许转换。                                                        |
| 合法编码URI补例  | 每端4项独立GET/HEAD/PATCH/viewer403，正式比较4 Pass；各另1项setup POST，不增加566或11操作计数。                                              |
| 原Angular页面    | Windows/Linux × Nest/Rust四组合各3通过，共12，0skip/flaky；Windows Rust使用Linux API，不宣称原生Windows Rust服务。                           |
| 基础认证         | 同四组合各13通过，共52，0skip；owner与二次清理已核。                                                                                         |
| TS/Angular及静态 | 原9个mocked unit suites共126测试、production build、26适配器测试、浏览器tsc、六个Nx lint target及来源检查通过，无新增lint warning。          |
| 最终工具纯测     | Linux Node24.16.0 pure06：184/184、0skip；119来源前后不变，独审Pass；旧epoch不重复加总。                                                     |
| schema           | 两库migration:check均exit1，只读schema:update --dump均exit0；existing-baseline-drift，未执行DDL，不能称schema clean。                        |
| 最终清理         | 81登记run各连续两次0/0；1374来源bytes/modes及81journal listing/bytes/modes前后不变。两未初始化失败run另有独立只读证据，不伪造cleanup回执。   |
| 主机收口         | Windows/Debian 5500、5501、5600、5700无listener；PG17服务Running/Auto，仅查服务元数据。                                                      |

正式差分及清理原件位于 `tmp/rust-r2d/`：`http-parity-final05.json` SHA256 `5083bafd126993374bdaa82c1e299d0e73c21d4454112fa7fb75a70b16c313d7`、`concurrency-parity-final05.json` SHA256 `7a36fcbb4e83818086fd4e0e7d316e7548053dc554640263647058c60ba1dc27`、`valid-uri-parity-final05.json` SHA256 `ea0933e7e108df244b480ee11ff5098b66d5ee83f57054607acd7e1e78082b76`。完整来源、原字节hash、命令exit、owner及独审引用由正式机器验收绑定。

schema 实际107表/1778列/515约束/504索引/92迁移/0用户trigger前后相同。调用锁定MikroORM7.0.11相同CLI/参数，未运行Nx启动层；168项CHECK提议匹配历史同名约束及低权introspection可见性，另有既有注释差异，不声称逐项表达式等价。NUL内部SQLSTATE为SQLx22021与原pg08P01，公开响应与提交边界由有限HTTP差分确认。

## 3. 历史失败与剩余范围

final01的parser null误分类、final02的跨块UTF-8解码、final03的未匹配HEAD长度假设、final04补例错误要求updated_by=admin均保留原失败报告、owner与118/119份来源档案。final04虽完成部分566/16观测，整体仍失败；只有全新final05作为最终差分。旧无XFF loopback文本差异、同微秒tie、safe-ignored缺PG事实均保留。

页面locator、multiselect焦点、隔离浏览器缓存、Windows transport超时的失败轮次保留。两个未成功prepare的Windows/Rust run分别以两个只读连接扫描107表、精确标识0匹配及journal不存在证明not-initialized-readonly-confirmed，不能改写为UI Pass或cleanup0/0。最终审计逐run引用其证据。

已知P3继承差异：无cookie GET users/%FF和末尾裸%时，Nest400 Failed to decode param，Rust401 session_missing；其他method/auth组合尚未证明。共享route/guard解析次序由父#67 / R2M [#80](https://github.com/illusion-tech/poms/issues/80)在阶段验收前定案，不宣称全URI等价。

截图仍有Invalid PrimeUI License，390px列表保留内部横滚；无全站响应式或视觉修复结论。外部身份面板的原接口呈现不代表R2G绑定/解绑交付。原R1/R2A/B/C全部历史矩阵未重跑，不用本轮适用回归替代。没有性能结论。

## 4. G3、集成与G4

完整非作者[G3审查](https://github.com/illusion-tech/poms/issues/71#issuecomment-6457908041)已Pass，回执c-g3-final-review01.json SHA256 `4315b302aba6a2bc7277bc463887b2459d448a2f461edede53f33f87b1fa759e`，未关闭P1/P2为0；实现`9302fd7149257aa40584fc500fd76dd0c766b80d`已集成推送，归档前集成静态检查实跑通过；G4随归档提交推送与Issue同步生效，届时仅关闭#71。R2累计30/108，剩余78操作与R2M验收，父#67/#57保持Open，R2E–M及#61边界不变。

送C审查的validation最终原字节冻结为tmp/rust-r2d/g3-reviewed-validation02.json，SHA256 `6c45acd70bf814f2d924624baa9d3f630ea97a1d18513d879da48cf5b788c420`；先前读到的中间汇总保留为g3-reviewed-validation.json并明确superseded，差异由g3-input-freeze02.json记录，不作为最终G3输入。正式机器验收在其后追加已核Gate/closure元数据。原G3受审currentSourceManifest为1747项真实来源union，包括原baseline与实际tmp脚本，manifest SHA256 `3d5bb92cdafd037c6e5ee57630fb7be2a678057b934cf78b9eeeac7ef2933059`。先保全同路径证据，归档前集成检查逐项核对main/Linux全union，不删除docs/tmp条目规避检查。

集成检查通过后，三份lifecycle MD迁至docs/design/archive/slices/，仅重定位相对链接及追加收口状态。G1原件与G3受审原件保留；closure单列pre-G4检查时点、manifest hash与旧/新路径及hash映射，文档迁移核验不冒称新runtime。Windows报告、截图、失败原件及Linux-only不同epoch证据先逐文件复制并校验；Linux checkout、private journals、二进制、PG15与旧环境保留，PG17实例和数据保留。两端证据保全及集成回执、路径/hash迁移映射由设计根机器验收closure绑定；G4随归档提交推送与Issue同步生效。


归档前集成来源对齐只涉及两份已被Windows静态检查验证的UI类型配置：Linux旧browser-tsconfig原字节保全为tmp/rust-r2d/c-audit-linux-browser-tsconfig-final01.json（SHA256 `02f717a1b82fefc98ac38a38e6e9fb5dcee9582832e6faef98b47d1eecc58b11`），再复制现版browser-tsconfig与此前仅Windows存在的tsconfig-ui-check。preintegration-source-alignment01.json记录实际变化；这只服务后续全union静态核对，不重标旧审计来源，也不宣称新增Linux tsc或runtime运行。


提交前暂存检查额外覆盖此前未跟踪的新文件，发现oracle第106行末一个ASCII空格。只去该空格并更新users-source中对应helper hash，旧两文件原字节保全，五份其他生成JSON逐字节不变，C增量独审与export --check通过。此前差分、PG、UI及审计仍引用原epoch；正式currentSourceManifest追加这两项静态格式来源，1747项最终hash为`6086c966fc882df27755bab06a3296a1e653e65a3c27466c58c331ead577b950`。完整G3原件与其旧hash不改，git diff --cached --check新回执exit0；此修正不产生新runtime结论。
