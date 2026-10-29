# RUST-R2K / R4 参数 G2 纠偏记录

本记录追加到已冻结的 G1 基线，不回写输入原件。#78、#83 仍为 Doing；联合
G3、主线集成及 G4 尚未完成，R2 计数仍为 99/108。

- 原 canonical 表格的既有格式漂移已经在 G1
  前单独保全和分类；后续仅以格式后表示比较两项 R4 参数裁决。
- R4 的三件原输入形成永久祖先 S2
  `ee0f4847cae292fe5cee1d1eec065b7194607683`。原生成器 write/check 均成功，579
  件输出仅目标 service 改变；不压缩或重写该输入提交。
- Rust candidate01 的两个实际单测失败分别来自 manifest 对正常 Unicode
  的多余转义、Zod 字符串长度检查顺序。candidate02 修复原语义，原 golden
  未变。随后修正旧 HTTP 测试的路径/操作数量断言；candidate03 实际为 205
  passed、0 failed、54 历史 ignored，fmt/check/严格 Clippy/release
  均通过。该结果不等于 K 业务验收完成。
- 独立夹具源审指出 selection 的 attachment_id 可合法变化、外部 SQL
  与元数据错配、原 recipe 的 INSERT/UPDATE 适配以及 K
  审计证明四项缺口。首次相应业务写入前均已修正；完整 107 表、207
  条外键的引用预检与原始提交证明要求保留。
- catalog 首次工具读取使用了错误的迁移表名，未执行 DML。第二次按原配置的
  poms_migrations 读取，双库 107 表、1778 列、107 个主键、207 条外键及 92
  条迁移均通过。
- Native alpha01 的 run UUID 入口登记、alpha02 的 Nest proxy 监听观察、alpha03
  的原 J 创建响应 201
  断言均作为失败原件保留。各次均真实清理两遍；不将这些尝试改记为通过。alpha04
  完成 18 次真实 HTTP、原 R4 confirm/freeze、真实上传和 K 本地
  ZIP/缺失文件观察，并保全运行输入和对象字节；它只认证原版观察。

## 临时 PG 提交观察器

G1 要求数据库生成的链接/包条目 ID 有真实 INSERT 与外层提交证明。当前 Rust
release HTTP 没有导出该证明；仅凭响应 DTO
或匹配查询不得收养数据。为此使用仅本批新 PG15 的七表 AFTER INSERT
工具观察器，不改变产品源码、业务行、约束或事务边界。

这项临时观测 DDL 在实施前单独分类和独立源审：固定新库/marker/角色、run-owned
根与 actor、严格 active case；事件和业务 INSERT
在同一事务，独立连接读取已提交事件。其 proof kind 明确为 PG 观察，不冒称
MikroORM 或 Rust WriteTrace。须实际验证 rollback/savepoint 反例、与 Native SDK
交叉校准、完整 OID/定义/ACL
还原和事件保全；卸除后才执行常规全表清理。未完成这些条件前不计入最终通过。

原 R4 producer 可以在每套本批隔离数据库上运行同一原 Nest 编译产物，随后 Rust
仅消费该数据库中的真实事实；这不交付 Rust R4
query/confirm/rebaseline，也不声称有公开 draft-create API。

引用保护负例也只在上述新隔离库内执行：另有独立创建证明的临时审计行故意保留未登记的文本/JSON
引用，以及控制 schema 的精确临时外键对象。原保护必须在 DML
前拒绝；负例仅按各自实际 INSERT/xmin 或 DDL/OID
证明回收，不收养成业务数据，不使用 CASCADE。恢复后再次核对完整 107
表及原拥有行不变。

分段失败验证使用另两份 run-owned prepared
handover。服务启动前安装只命中这些根/actor/request 的 NOT VALID 临时
CHECK，分别观察包落库失败后的文件残留、审计失败前已提交的包/条目。未提交的包不能凭
DTO 收养；其文件须有写前缺失、精确根目录与 handover 文件名、完整
ZIP/manifest/实际附件字节、package 路径及最终 SHA
证明后才能精确回收。首块读取错误仅将本次真实拥有文件换为有 SHA
的备份和空目录，finally 空目录移除并恢复原字节。停止服务后按原 OID/定义移除
CHECK 并核原完整约束集合，最终仍执行通常的全表清理。

## 原共享层的断连生命周期边界

受控 OBS 全 HTTP 断连观察发现：客户端读取 64 字节后断开，原 Nest controller
的上游仍活跃至 peer 的 20 秒 stall 截止，Rust 上游约 74ms 即关闭。两件 Rust
共享文件 binary_http.rs、attachment_storage/obs_s3.rs 已独立核对与 B
原字节相同；Drop 取消属于既有 I/J
能力，本批不为模拟原版延迟释放而削弱它。此项如实记为既有共享层下 K 端到端
post-disconnect 生命周期差异，不记零差异或性能收益；已连接字节/headers、失败后的
audit/counter 与断连后的资源状态分别认证。

首次 Native obs04 的小于 5
秒假设失败原件及对象恢复增量保留。后续延长的是有限观测/清理窗口，用于等待受控
peer 截止，不能回写首次结果。部分传输仅保存 prefix SHA 和接收字节数，不冒称完整
ZIP 下载。最终 G3 须包含该明确边界。

## 尚待完成

K 两端严格业务/存储/ZIP/失败与并发对照、原 K section
的机械薄宿主真实交互、最终源码保护、独立 G3、公开保全、固定提交检查和 G4。只有 K
五项真实收口后才能计为 104/108；L 四路由、R2M、整个 R4 与父 Issue 继续开放。

## 2026-10-30 G3 实际验收增量

上节保留 G2 时点。本次最终候选 C6 的 fmt/check/test/严格 Clippy/release
bins+examples 全部通过，211 passed、0 failed、54 历史 ignored，共 28 个 test
binaries。C5 的 JSONB hydrate 空白与 C6 的 K selection.source_refs 有序 JSON
脏检查修正分别保留旧输入、失败和新运行，不强制每次 refresh 都更新版本；gamma03
原 P2 已由 gamma05 的实际版本/PG 对照关闭。

gamma05 每端 69 次实际 HTTP，其中 K 请求 43 次。冻结严格比较器原结果仍为
uncertified：其余逐项检查无失败，四个 ZIP 委托由独立标准库 ZIP 检查与绑定原
archive hash 的组合增量补齐，不改写原报告。原生产者始终为实际 Nest
confirm/freeze；不认证 Rust R4 写链。

race02 的两条实际等待 UPDATE 在每端均为 200/200、selection
版本各加二、成功审计二条。它认证原 K 的预检与批量 CASE 更新时序，不能套用 L1
的单胜者 CAS 结论。race01 的失败与仅凭真实提交证书恢复数据/文件的增量全部保留。

受控 OBS 已验证真实 SigV4、生成包完整 ZIP、PUT
503、默认提供方切换后按原位置读取旧包及客户端 64 字节断连。Native obs04
的短超时失败、精确对象恢复与 obs05 有限截止观察分别保留；Rust obs04
仍立即释放上游，生命周期差异按上节分类。peer owner 的实际回执只证明 shutdown
ACK、拥有进程停止与端口释放，不补称缺失的 peer graceful-stop 回执。

ui04 两端均完成原 K section 机械薄宿主的八步真实浏览器交互，包括真实 ZIP 下载和
viewer 写入 403 反馈。ui01–03 的工具入口/locator 失败保留。ui-cancel01
两端另行验证真实初次 K GET 后的取消、browser/拥有 Windows 进程树关闭与 DB
双零；底层尝试仍是 fail/partial，不计为八步成功。

fault01 每端 25 次实际 HTTP：包 INSERT 约束失败返回 500
并留下已验证的文件，审计失败返回 500 但此前 ready
包与条目已提交，首块读取目录错误返回 400 且计数/审计先提交。Native
包失败实际只有一次 INSERT/23514，不声称两次保存均执行；500 普通 JSON 字段顺序的
raw SHA 可不同，按既有共享错误策略比较语义。所有临时 CHECK 的原
OID/定义集合与文件 inode/SHA 已恢复，再卸观察器、执行完整 107
表引用预检及通常清理。

最终只读审计覆盖 34 组 backend/run，登记数据和 local
对象归零、两条借用定义完整原字节未变，0 产品 DML。新 PG15
已停止、五端口释放，旧容器仍停止，Windows PG17 仍 Running/Auto。双库
migration-check 保留 exit 1 的既有 CHECK 可见性/注释漂移分类，readonly dump 均
0，未执行建议 SQL，92 迁移及 catalog 不变。联合 G3、公开保全、集成和 G4
由后续独立原件决定。
