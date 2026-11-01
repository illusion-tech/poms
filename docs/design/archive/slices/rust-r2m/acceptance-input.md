# RUST-R2M 集成验收输入（G1 前只读候选）

基线为 `9dcfb498b175e9fdaae7584aff1d5d3f93bf814f`。本输入只为 [#80](https://github.com/illusion-tech/poms/issues/80) 的 G1 冻结提供候选；正式 gate、GitHub 状态和公共接线由 Root 单一写入。[机器输入](acceptance-input.json) 保存具体参数、逐项计划、原字节/LF 指纹及当前操作集。本文没有测试、数据库、HTTP、容器或浏览器通过声明：本代理只读源码、文档、Git 和监听 metadata，未读取旧 private。

采用仓库实施/GitHub 治理规则；模型显式 `gpt-6.1-sol` / `max`，Fast 未核实。R1E 的方法可复用：继承证据须绑定来源，当前共享组合与选定真实链路重新运行，UI 操作与 Angular bridge 分开，fixture 每 run 归属清晰并二次清理；不复制 R1E 的旧计数和曾排除的 R2 404。

## 1. 现有运行组成与完成边界

`main.rs` 在配置与 DB 初始化后调用 `http::router_with_runtime_settings`。同一 `Database`/`AuthHttpState` 贯穿全部模块；`ProviderSupport` 连接身份、目录与组织同步，`AttachmentStorage` 同时注入存储配置和附件服务，`ApprovalService` 使用同一数据库。

当前静态组成是 **96 paths / 115 operations = R1 七操作 + R2 108 操作**，完整 TS 规范仍为 **237 paths / 291 operations / 585 schemas**。M0 仍须从本轮构建产物导出 OpenAPI 并核对真实 dispatch，不能把本输入的 JSON 计数称为运行验收。

- R1 为 health/root 三操作与 Cookie auth 四操作；A–L 按既有互斥归属分别为 `3/8/8/11/6/4/16/18/6/19/5/4`。
- K 五操作在 `attachments/http.rs` 内注册，K/J OpenAPI 在该模块合并；不能漏掉它，也不能重复算成独立顶层 router。
- L 从完整规范选取四操作及递归 schema。Contract/Payout/Adjustment 的最小真实 handler 已交付，final/retention 中途 flush 与双快照须在当前组合复验，不再写成“handler 待实现”。整个 R3–R5 仍未因此迁移。
- 编号是内部服务，提供 `next` 与 `next_with_connection`；当前 `approval`/`approval_common` 未找到产品调用。R2M 用真实 PG 内部 probe 验证，不为验收新增 API，不宣称 Rust 合同/移交生产者已经接入。Native 原 EM 独立分配与 Rust 借用连接 primitive 的语义继续分列。
- `handover_facts` 是四类最小只读投影，不增加 confirmed/snapshot 门槛，不认证完整 Rust R4 写链。两项业务号 lookup 已切换契约但仍由 Native 提供，不增加 Rust 操作数。

## 2. 最小但真实的本轮矩阵

下面是计划，实跑数为 **0**。M1–M5 共 **20 个逻辑用例/后端**；每个逻辑用例可以含多次请求或事务，实际请求/断言/skip/ignored 数在运行后独立导出，不预填旧数量。

| 组                      | 当前候选必须实际验证的边界                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M0 统一入口             | 构建后完整 115 method/path/operationId、96 paths 与递归 schema/security 对齐；Nest/Rust 各一次全 115 有效形状 admission/guard probe；代表性未知路径/方法、编码冒号、malformed-body 顺序。负向 probe 不冒充成功业务覆盖。 |
| M1 认证/权限，4 例      | 匿名 session200、真实登录/恢复/退出与 profile/navigation/todos200；当前会话观察 owned 角色/权限变更；组织成员/owner 投影与停用撤销；缺会话/CSRF/无权/过期的原错误顺序且无成功副作用。                                    |
| M2 平台/审计/编号，4 例 | org→role→user→membership/owner 真实关联与 CAS；字典/设置值与版本；sync/route-denied→audit/security 的 actor/requestId/目标/脱敏；九 scope 编号、UTC 跨年、借用连接 commit/rollback、独立分配和并发，语义分别标注。       |
| M3 审批/待办，5 例      | 当前 Contract reject→resubmit→approve；Payout final/retention 中途 flush 与双 snapshot；Adjustment 实际决策/无权/CAS；公共 summary/confirmation/todo 同事务四变体；非空待办六类 facts、nullable due 与原时间文本。       |
| M4 附件/移交/存储，4 例 | provider/default→local upload/complete→version/final/center；真实 handover facts→checklist→package→ZIP 字节；目标授权/版本/流或审计故障；受控 OBS presigned PUT/读取/删除与 default 切换后原包可读。                     |
| M5 外适配，3 例         | 合成 provider/密文/连接/OAuth state-grant-ticket 单次消费与会话；目录 mapping→diff/apply→平台 org/user/member；supplier timeout/error、stale mapping 与幂等/回滚。                                                       |

M0 另冻结当前 R2D 未结 URI decode/auth 顺序：现有明确观察仅为无 Cookie 的 `GET /api/platform/users/%FF` 和末尾裸 `%`，Native 返回400，Rust返回401 `session_missing`。Root 独占共享 router/auth 修复；先用 Native **真实 globals** 捕获 GET（item read）/PATCH（item write，合法 JSON 与适用真实 CSRF）/PUT（unsupported-method 对照）× absent/owned-valid/retained-expired session × 裸 `%`/`%FF`/合法 percent-encoded owned UUID 对照，共27格/后端。其余格子的期望在 Native 观测前保持未定，不能从两个匿名 GET 推断。修后复跑受影响27格和共享入口回归；不放宽原 fixture/guard，不把 decode修复扩成未冻结 URI 重写。

M3 所需上游命令由本轮实际 Native 生产者创建；确需 prepared-source 时，明确来源与替换参数并给出 before-absence/INSERT/outer-COMMIT/独立可见性证明。不得把 prepared row 标作 Native 生产者，也不把 Native 准备步骤认领为 Rust R3–R5。

真实 UI 选 **4 个旅程 × 4 组合**：Linux managed Nest/Rust、Windows managed Nest、Windows external Rust（独立 Linux backend owner）。旅程为登录恢复/菜单/待办，平台或字典设置实际写与无权/CSRF，审批待办 reject/resubmit/approve，附件上传/final/移交包下载及取消。每项必须断言真实网络状态和业务结果；`catch []`、页面隐藏、`page.fetch` 或 APIRequest 不能替代已迁移接口或 Angular interceptor。

原页面若需要尚未迁移的 R3–R5 请求，使用 test-only **固定 method/path allowlist**：115 已迁移请求固定到候选；具名其余 producer/read-model 固定到 Native。不能候选 404/失败后再回退 Native。每请求标注实际后端，纯 lookup 仍是 Native；这不是全后端 Rust UI 认证。bridge 只允许固定动作/脱敏状态，不开放任意 URL，生产产物核查不含 bridge。

## 3. 哪些旧证据能继承

可继承 A–L 的冻结 G1、实际验收、独立 G3/G4、深层 DTO/Unicode/transport/故障/并发与原来源证明，条件是输入 hash 与当前差异逐项复核、范围没变，并以历史 evidence 标注。S2/S3 永久祖先、原生成器 baseline 和完整 spec/client 保护继续有效。

必须现候选实跑的是统一注册/真实路由、共享 Cargo 与受影响 TS、fresh PG15 参数/catalog、M1–M5 跨模块状态链、上述 UI、新 namespace fixture 的负向 admission/取消/二次清理，以及 source/binary/非作者复核。原 Nest full API、双后端 foundation 和 Nest legacy UI 保留并运行一轮；实际当前数量由运行输出产生，旧 route-mock/Cookie helper 保持原标签。

54 项历史 ignored、失败/stopped/partial/uncertified、L 四项 SQL-wire 覆盖限制、自然时钟/308、既有 CHECK/注释漂移、有限来源复用、受控外适配、prepared facts 均不能升级为新通过或更宽认证。schema 检查只读分类，不执行建议 SQL。

旧 L 的 123837 文件、K 的 49605 文件 runtime 树只通过不可变 manifest/tar 路径与 hash 引用；不重新复制或逐树遍历。新 R2M 只保存一份去重的当前 runtime source closure/产物，加每 run 原始结果、日志 hash 和小增量。Linux 生成原字节清单，集中校验后一次传输；不借旧运行文件拼成新执行证书。

## 4. 新隔离环境与受控 fixture 权限

建议固定：Linux checkout `/home/wangzishi/projects/poms-rust-r2m`；state `/home/wangzishi/.local/share/poms-r2m`，下设全新 `private/objects/target`；输出 `tmp/rust-r2m/<candidate>/<runId>`。PG 容器/卷为 `poms-r2m-pg15` / `poms-r2m-pg15-data`，标签 `org.poms.scope=rust-r2m`，库 `poms_r2m_nest/poms_r2m_rust`、低权角色 `poms_r2m_app`、owner-only `r2m_control.marker`。marker 由 Root 在 provisioning 前新建冻结，绝不继承 L。

Root 已采纳端口方案：loopback PG `20432→15432`、Nest `10070`、Rust `10071`、UI `10080`、Feishu `10090`、OBS `10091`。本次只读 Windows/Linux 监听列表未见这些端口，尚未预约，bind 前须重新核对。镜像可只读复用已冻结 digest，实例/卷/secret/private 不可复用；不把旧 L 已 stop 的 PG15 当新写场。

新库对齐 PG15.12、pgcrypto1.3、btree_gist1.7、UTF8、`en_US.UTF-8` libc 与 `Etc/GMT-8`。原 92 migrations/显式 seed 只进新库，先核 catalog。保留 PG17 的所有实例/数据/配置及所有旧环境、旧卷、旧证据。Root G1 应具体冻结创建这些新资源、运行本轮 owned HTTP/browser、合成 loopback Feishu/OBS 和精确 fixture/fault/cleanup 的权限；真实租户、部署、旧实例 reset/drop/prune、全局 kill/重启均不在范围。

private 目录0700、文件0600，不接受 symlink、默认 `.env`、deploy private 或 ambient DB/PG/MIKRO/DATABASE_URL/NODE_OPTIONS；新密钥/账户全部合成，token 经 stdin 立即 hash，公开日志不含凭证。若借用既有固定 approver/canonical definitions，须逐名冻结并比较整个用户/凭据/角色/权限/成员和 definition 原行，不修改或 adopt；条件允许时优先新建等价 owned 身份。

## 5. 本轮 owned cleanup

每个 row/object 的归属必须有 namespace/marker/数据库/角色/run/case 加写前 intent、PK 不存在、真实 INSERT/RETURNING 或 Native afterCreate、outer COMMIT ACK 与独立可见性；response ID、前缀或时间戳不能单独证明 ownership。未知 COMMIT 先恢复确证，不直接清理。

1. 关闭并证明所有本 run browser、UI proxy、Native、Rust、adapter writer 已结束；只按已登记身份停止 owned process tree，unknown writer 使 cleanup admission 失败。
2. writer drain 后恢复本 run fault/observer/transport 模式。
3. fresh catalog 与全107表、完整物理 FK/UUID/text/JSON 逻辑引用只读预检；unknown/outside reference、pending intent 或借用行变化均禁止 DML。保留 PG observer 的原写 envelope，不为 prepared Todo 源表扩大许可。
4. 事务内按引用顺序精确删除本 run row；每 DELETE 恰好一行，循环只用已审查 nullable 非 identity 边。对象只删除登记的精确 provider/key/version/hash，先校验解析后路径位于本轮根。
5. commit 后独立只读零残留与借用行不变检查；再次 cleanup 必须 matched=0、changed=0、objects=0。运行失败/取消也纳入完整 run ledger。
6. 停止身份匹配的 R2M owner/PG，核端口释放；新卷、journal/private recovery 和证据保留，旧实例不动。身份、COMMIT、引用或 writer 不确定时保留数据并报告真实 partial，禁止 broad reset/delete。

## 6. 工具复用与新增接线

`e-http-plan`、I/J case 输入、K scenarios、L producer recipes 可以按 hash 作为纯请求构造来源；它们未运行不算证据。G/H、K、L 的实际 runner、environment、managed-env、guard 固定旧 cwd/source/DB/marker/ports/private/output/binary，不能直接改环境变量去旧写场，也不能放宽旧 guard。

`tools/e2e/api-server.cjs` 当前 profile allowlist 仅至 `r2gh`。Root 应新增严格 R2M profile/fixture/owner/输出，或使用 external 模式加独立 owner；保持 external 不 build/spawn/seed/stop 的合同。旧 `node-regression.mjs` 固定 S3 scratch，不能作为当前命令直接重放。现锁工具命令可复用，依赖 lower 只读或临时 upper，实际启动器替换另记。

候选公共检查为 Cargo `fmt/clippy --locked/test --locked --all-targets/build --locked --release`；本轮 release `--openapi`；适用 Nx API/admin lint/test/build、完整 OpenAPI/client check；原 Nest E2E、foundation 双后端、原 legacy UI 与选定四组合。只运行一次共同检查，不按12片重复。JSON 中拟议 `tools/rust-r2m/run.mjs` 是待实现 CLI，**当前不存在且未执行**；Root 冻结后再补实现命令和真实结果。

## 7. G1/G3/G4 收口条件

Root 将本输入与交付审计线结果合并，核实时 GitHub A–L/#80/#67/#57，固定 marker/权限/候选命令后才能 G1。当前 header/历史 JSON 中的旧 Todo/Pending/99/104 计数保留当时时点；状态按最新 currentDeliverySummary 与 GitHub 原生事实读取。

G3 需当前必要检查、M0–M5、UI、二次清理、drift 分类及原始证据/source/binary 绑定完成，由非作者审查无未解决 P0/P1/P2。普通归档小增量不新增工程闸口。G4 在 exact commit 复核、集成推送、证据保全、生命周期归档及 Issue/checklist/comment/本地索引一致后成立；仅当各自完整条件都满足才关闭 #80/#67。总体 #57 保持 Open；不部署、不认领 R3–R7 完成或性能收益。
