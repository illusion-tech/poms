# RUST-R2M 阶段集成验收基线

- Gate：G1 Candidate，待非作者 C 对本候选及输入清单审查；尚未执行本轮集成验收。
- Task：RUST-R2M / [#80](https://github.com/illusion-tech/poms/issues/80)，父 [#67](https://github.com/illusion-tech/poms/issues/67)，总体 [#57](https://github.com/illusion-tech/poms/issues/57)。用户于2026-10-31授权本批完整G0–G4；#57保持Open。
- 来源：main `9dcfb498b175e9fdaae7584aff1d5d3f93bf814f`；分支 `codex/poms-r2m-integration`，复用既有干净managed worktree，primary保留。沿用solo-worktree checkpoint，G3后提交/分支推送、独立固定提交复核、干净主区快进/main推送，再归档和在线G4。
- 类型：跨层高风险阶段验证及必要兼容补缺。当前计划新增公共操作0；工程验收工具/fixture与共享入口兼容修补按同一冻结范围控制，不机械归为docs-only。

## 1. 完成边界与依赖

当前R2A–L十二个原生子Issue均Closed/completed，108个操作唯一归属且与现行完整规范逐操作相同；#61的七参数/两lookup裁决已G4。#80仍Todo/G1候选准备，#67/#57仍Open。108/108为输入之一，R2阶段放行另需本批统一候选、非HTTP与外适配边界、集成验收、独立审查和完整收口。

本批核对继承交付、复用未变化路径的原有限证据，在当前统一候选上补共享认证/事务、J↔K、L真实消费及明确移交缺口；完成后满足各自条件才关闭#80/#67。#57、R3–R7、真实云租户启用、迁移接管、正式部署、备份恢复/切流与收益实测保持其原阶段，不新增性能闸口。

## 2. 正式输入与责任

[交付审计输入](rust-r2m/delivery-audit-input.md)、[审计机器输入](rust-r2m/delivery-audit-input.json)、[集成验收输入](rust-r2m/acceptance-input.md)、[验收机器输入](rust-r2m/acceptance-input.json)与本基线组成同一候选；[输入原字节/LF清单](rust-r2m/g1-input-manifest.json)固定具体来源。输入读级别区分完整审读、源码必要段落、自动集合比较和仅指纹，不把hash-only称为业务审核。

正式SSOT为Rust计划§1.1/1.2、§6–9，R2范围/依赖与操作归属，ADR-015/017/018，现行Native/共享Zod/完整OpenAPI、Rust当前实现，以及A–L冻结交付/独立决定和具名移交事项。历史99/104/Todo/Pending按原时点保留，当前状态取GitHub原生事实与currentDeliverySummary。证据复用必须给出来源到当前的影响分析；旧运行数量不能计成本轮实跑。

- Root：正式基线/GitHub与状态、共享router/auth和URI补缺、Cargo/公共接线、schema/环境/fixture总边界、统一生成/构建、实际HTTP/PG/UI执行、集成/保全/提交。主模型目标沿计划，由应用控制，不伪造独立生效证明。
- A `/root/r2m_delivery_audit`：独占delivery-audit输入及后续audit工具/归属和继承证据复核；不并发改产品或正式治理。
- B `/root/r2m_acceptance`：独占acceptance输入、新`tools/rust-r2m/acceptance*`与`scenario*`；Root拥有共享profile/owner/fixture接线，分配后才扩展独占文件。
- C `/root/r2m_review`：非作者G1/G3、固定提交/归档与终核；不写产品/fixture，不读旧private，不启动业务运行。普通格式、归档与小工具改动按实际风险复核，不逐小脚本另造Gate。
- 全部子代理显式请求`gpt-6.1-sol/max`、独立上下文；Fast无独立控制/运行证明，保持未核实。Root实际执行与C独立复核分开。

## 3. 契约与兼容SSOT

当前完整Native规范237 paths /291 operations /585 schemas；Rust已迁移集合96 paths /115 operations，含R1七项与R2 108项。本批从当前编译产物核完整集合、operationId/递归schema/security和实际dispatch。负向guard probe只证明入口/错误，不冒充各业务成功。

无新增route/DTO/schema/permission/DDL/生成接口提案；命名、UUID与业务号身份、金额string/number、日期/时区、nullable/missing、版本/current/supersedes、requestId和敏感审计继续各冻结来源。公共输入与guard不因测试便利加严、绕过或伪造。若产生超出此范围的真实新设计差异，保留实际失败并做corrective checkpoint，不倒写G1。

### 3.1 明确承接的 URI 差异 A-M-URI-01

原R2D `validation.knownP3` / `artifacts.malformedPath` 与closeout明确交#67/#80：无Cookie GET `/api/platform/users/%FF`、末尾裸`%`，Native400 decode error，Rust401 `session_missing`。原2358字节记录SHA-256 `ac1bc451d3fd026a92b53238087d8291dcc28594cb90e7a91f8fceb3bb884511`已只读核实，其余method/auth未证明。

先以当前Native真实globals记录GET/PATCH/PUT × absent/owned-valid/retained-expired session × 裸`%`/`%FF`/合法percent-encoded owned UUID，共27格/后端的原响应与副作用。计划格不是运行数；其他期望以被冻结原源码和实际Native为准。补最小静态未匹配路径、动态命令/合法编码、body解析和404/405顺序对照，以实际影响面收敛修补。

Root仅修已匹配动态路径的decode/guard兼容；不对全请求无差别predecode、不重写URI、不增alias、不改变合法URI结果，不从两条GET推断全部组合。修后重跑受影响格、共享入口与必要本轮链路。已存在的有限Unicode/OBS取消/SQL wire范围不与此真实移交项混同。

## 4. 本轮集中矩阵

M1–M5为20个逻辑用例/端，M0 URI27格/端，UI四旅程×四组合；请求/断言/skip/ignored和运行数由实际输出逐项产生，当前均0。逻辑用例内多请求不按计划数当实际通过；源码和行为变化后只补受影响项。

| 组      | 必要本轮验证                                                                                                                                                                |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0      | release导出完整115/96集合与原规范、full579 client一致；双端115有效形状入口/guard probe；URI已知差异与27格、未知路径/方法及错误顺序                                          |
| M1，4例 | auth/session→profile/navigation/todo，owned角色权限改动的当前会话投影，组织/owner与停用撤销，缺会话/CSRF/无权/到期的原错误和无成功副作用                                    |
| M2，4例 | org/role/user/membership/owner关联/CAS；dictionary/settings；audit/security actor/requestId/目标/脱敏；九scope内部编号的借用连接commit/rollback、独立分配/并发与UTC年       |
| M3，5例 | Contract reject/resubmit/approve；Payout final/retention中途flush/双snapshot；Adjustment决策/权限/CAS；公共summary/confirmation/todo同事务；非空Todo六类facts/nullable/time |
| M4，4例 | provider/default→upload/complete→version/final/center；原真实handover事实→checklist/package/ZIP字节；目标权限/版本/故障；受控OBS协议与default切换后的旧包读取               |
| M5，3例 | 受控身份/密文/连接/OAuth单次state/grant/ticket与会话；目录mapping/diff/apply→平台组织用户成员；timeout/error/stale/幂等与回滚                                               |
| UI      | 登录恢复/菜单/待办、平台或配置实际写及拒绝、审批待办、附件/final/移交包下载和取消；Linux managed Nest/Rust、Windows managed Nest、Windows external Rust                     |

原Nest API回归、双端foundation及适用原legacy UI按统一批次执行一次；route-mock、bridge、真实API/PG/UI分别标注。115条候选固定到候选，具名未迁R3–R5 producer/read-model固定到Native，不允许失败后动态fallback。UI必须断言实际网络状态/完整响应及业务结果，隐藏页面/吞异常不算成功；生产构建不含test bridge。

编号没有新公开API，不能把primitive probe冒称Rust合同/移交生产者接入。K只认证其真实只读移交facts和附件消费；L认证已交付Contract/Payout/Adjustment及final/retention消费闭包，不把未实现完整R3–R5生产者作为R2新门槛。上游用本轮真实Native生产者；prepared-source逐来源/参数/INSERT/outerCOMMIT/独立可见性证明且明示非生产者运行。

## 5. 环境、数据与外部适配

[新环境计划](rust-r2m/g1-environment-plan.json)固定全新marker与R2M namespace。Linux checkout `/home/wangzishi/projects/poms-rust-r2m`；state `/home/wangzishi/.local/share/poms-r2m`，新private0700/文件0600及objects/target；容器/卷`poms-r2m-pg15`/`poms-r2m-pg15-data`，库`poms_r2m_nest`/`poms_r2m_rust`，低权角色`poms_r2m_app`，fixture control schema只作隔离标识。

端口固定loopback PG20432→15432、Native10070、Rust10071、UI10080、受控Feishu10090、OBS10091；开场重新bind核对。PG15.12/UTF8/en_US.UTF-8/libc/Etc-GMT-8及原92migrations/显式seed只进新库，先核107表/1778列/207FK原完整catalog。可只读复用固定镜像/工具/编译缓存；新实例/卷/credentials/marker/旧private不可复用。禁止旧PG17或其他库的SQL/reset/drop/prune/stop，保留全部旧环境和证据；环境metadata仅只读。

本批已授权新隔离资源、owned API/UI/PG、精确fixture与故障/observer/cleanup、合成loopback真实HTTP/TLS适配器。受控外适配是协议兼容证据，不称真实租户；真实启用烟测仍随启用环境/R6，不制造生产租户新门槛。禁止复制deploy或旧private、接受ambient DB/PG/MIKRO/DATABASE_URL/NODE_OPTIONS、全局kill/重启或远程写入。

固定approver/readonly canonical definition仅逐名借用并比完整原行/凭据/角色/权限/成员；不改、不own、不删。精确fixture许可/表集合从选定场景来源导出后单一Root接线，不能用所有表或DTO/前缀adopt。所有新身份/credentials均本轮合成，公开记录脱敏。

具名只读借用清单固定为：`vp_owner`=`00000000-0000-4000-8000-000000000008`、`finance_mgr`=`00000000-0000-4000-8000-000000000014`；`poms.approval_summary_package_definition`三行：`68000000-0000-4000-8000-000000000001`（handover-confirmation / contract-handover-summary）、`68000000-0000-4000-8000-000000000002`（project-handover / project-handover-confirmation）、`69000000-0000-4000-8000-000000000003`（commission-gate-review / operating-signal-commission-gate-e2e）。来源为现L `fixture-core.SEED_ACTORS` / `fixture-commission-policy.canonicalDefinitions`及原seed。未列名对象不授予修改、ownership或delete权；确需额外只读依赖时，运行前形成具体table/id、原源码关系和完整只读快照的同范围admission，经非作者必要核对后使用，不另造普通Gate、不放宽guard。

## 6. 归属、cleanup与保全

每行/对象具namespace/marker/DB/role/run/case，写前intent、PK absence、真实INSERT/RETURNING或原SDK afterCreate、outer COMMIT及独立可见性；response ID或名字不能单独证明归属。未知commit/writer/引用先保留partial并恢复确证，禁止broad cleanup。

先关闭并核对本run browser/proxy/Native/Rust/adapter writer身份，排空后恢复本run观测/故障模式；fresh全107表及完整物理/逻辑引用预检、只删除该run已证明的行和精确对象key/version/hash。每DELETE恰一行，nullable循环边单独允许，借用行不变；独立零残留后再次cleanup须matched/changed/objects均0。失败/取消也入run ledger，最后停新owner/PG并保新卷与恢复journal，旧实例不动。

本轮当前source closure/编译产物只去重捕获一次，各run引用同一不可变capsule并保存各自实际结果和绑定；不重建/重复遍历旧L 123837件或K 49605件大树。Linux集中生成/核对清单，采用原生流式一次批量传输和独立逐成员/字节复核，Windows原件用小增量保全。所有旧失败/partial/stopped/uncertified、首份副本异常、原source07/08和原G1/G3时点不回写。

## 7. 检查与放行

统一候选执行Cargo fmt/check/test all-targets/Clippy deny warnings/release，完整OpenAPI和579生成树保护；适用Node API/admin及受影响lint-enabled项目lint/test/build按一次公共回归，库启动器替代如实单列。旧54ignored逐项关联实际替代或范围，不能计passed；无新增对应真实产品源码漂移时不机械重复所有旧深层矩阵。

新库只读migration-check/schema dump与前后catalog实际执行；原低权限CHECK可见性/comment差异仍Failed-with-existing-baseline-drift，不执行建议DDL。新增真实schema/契约/金额/日期/版本/权限差异必须修复或按正式流程处理，不能沿用旧分类遮盖。

G1：同一候选/input原件经C非作者通过、GitHub在线冻结后进入Doing。G3：交付审计、当前必要运行与补缺、源码/产物绑定、drift和cleanup/保全均完成，无未闭P0/P1/P2；本URI移交项须有结论。随后提交/分支推送→独立固定提交→干净主区FF/main推送→生命周期归档→在线与本地G4一致。仅在#80及父#67自身全部条件真实满足时关闭二者，#57持续Open、R2 checkbox按实际R2闭合更新，不关闭总体迁移。
