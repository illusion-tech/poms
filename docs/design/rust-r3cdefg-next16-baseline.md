# RUST-R3C–G 联合16操作实施基线

本原件为签署前候选，**G1 Pending，产品实施未开始**。只有本文件、输入manifest、非作者C独立Pass及五子项同源线上冻结绑定后才进入G2；冻结后原件不回写。当前R3已交付14/58，本批各自实际G4后才计30/58。父#85/总体#57始终保持Open，余28及完整非HTTP/审批/阶段验收不提前完成。

## 1. 身份、来源与范围

- 共同base：`0fced204c917a37b84a2ad50838e722e764b8f78`；Windows worktree `E:/projects/worktrees/poms-r3cdefg-next16/poms`，Linux `/home/wangzishi/projects/poms-rust-r3cdefg`，分支 `codex/poms-r3cdefg-next16`。
- Slice type：`cross-layer-high-risk`；延续 solo worktree 的提交、分支推送、固定提交独审、主区FF/main推送和集成后核验。
- R3C #88 技术成本3项；R3D #89 商务竞标3项；R3E #90 客户联系人3项；R3F #91 销售跟进4项；R3G #92 报价评审3项，均为父#85原生子项。
- 根[当前归属](rust-r3-operation-slices.json)58项互斥；联系人仅从原情报13中拆3，其他10留后续。已有客户/项目14已G4；#61/#84不重复计Rust业务交付。
- 当前原生controller/spec/canonical已逐项aligned，所有16个operationId不改；Native完整237 paths/291 operations/585 schemas、579 client、共享契约/机械生成枚举与原92迁移保留。无产品DDL/Native语义改写。

三项目域各为版本列表GET、创建POST、workspace GET：`/api/projects/{projectId}/technical-cost-packages` / `technical-cost-workspace`、`bid-commercial-processes` / `bid-commercial-workspace`、`pricing-margin-reviews` / `pricing-margin-workspace`。联系人GET/POST `/api/customer-contacts`、PATCH `/{id}`；跟进GET/POST `/api/sales-follow-up-records`、POST `/{id}:replace` / `/{id}:void`。原path无UUID pipe处不补400或提前改变错误次序。

## 2. 形式输入及唯一权威

[输入来源映射](rust-r3cdefg/g1-input-origin-map.json)逐字节保留三作者全部原件、所读元数据base副本及Root Native原件。A/B/D报告与矩阵是静态输入，含42/86/91组定义，不相加冒实际HTTP次数。旧预测不覆盖，不将原件not-run改Pass。

优先级为：来源固定的实际Native controller/service/mapper/schema/DDL与Root原Native实测 → 本主基线明确的合并裁决 → 作者静态输入。Native/schema/spec既有不一致逐项分类，迁移不擅自增加约束或改成另一套业务结果。当前公开输入`native/original-observations01.json`24项和`additional-observations02.json`21项是**结构化Native语义观测**，不是Rust验收、完整raw-wire覆盖或G1自签。初次不完整SQL提取原件保留，`SQL-order-authority02.json`及`additional-SQL-authority03.json`提供实际SQL形状权威；完整原始stdout/stderr只在本轮private。SQLSTATE原日志未输出则保持未观察，不凭类别编造；实际ERROR约束名及只读index定义见`original-error-classification03.json`。精确numeric/scale只用`exact-numeric-text-and-audit03.json`显式`::text`查询，不用to_jsonb经JS解析的数字宣称精度。

作者报告读取后Root的G0状态/计划/归属变更属于当前治理元数据，`base-source/`与origin map解析其精确0fced原字节；Native业务/DTO/DDL来源872项均没有变化。普通内部命名/编译桥与归档小修由Root集中处理，不逐脚本另建Gate。

## 3. DTO、数据与guard

完整字段/default/undefined/null/strip/refinement/错误顺序以各作者正式输入和原共享schema为准。Zod4.6.1字符串min/max按code point（trim按ECMAScript）；Todo截断、contact审计length等显式JS `length/slice`按UTF-16，不能互相替换。UUID保留原请求拼写；PG解析大小写等价不代表业务字符串比较可归一。日期保留原z.iso接受/拒绝、UTC与业务日期、Date.toISOString精度及原ORM时间捕获顺序。

money ASCII模式为`^\d+(\.\d{1,2})?$`，quantity/unitPrice最多4位，taxRate最多8位，grossMarginRate允许原有负号/8位。金额沿JS Number/binary64、原输入数组顺序reduce和`toFixed(2)`，复用现`compat::scalars::{legacy_number,js_to_fixed}`；不改为SQL SUM或更精确的十进制新规则。不得用PG numeric precision替DTO新加max。POST即时字符串与GET原numeric文本/scale可不同，保留leading-zero输入的既有归一时点；不重算原毛利/税额。

C/D/G的GET为`project:read`，POST为`project:write`，原方法无业务audit、无敏感投影/读安全事件，不因已有公共敏感框架新增mask。E为`customer:read/write`。F沿原`HasAnyPermissions(customer|lead|project read/write)`的OR语义。继承现会话、CSRF、权限、安全拒绝、原URI和requestId机制。原路径/重复query/HEAD/错误method/畸形JSON和URI的顺序在实际双端验收覆盖。

## 4. 已实测的关键合并裁决

### 4.1 成本、竞标与报价

- 首版实际201，version1/effective；普通读workspace金额可见、安全事件0。
- **原Native当前第二版本C/D/G均500**：实际先INSERT新parent命中原partial-current unique后ROLLBACK，未UPDATE旧parent，DB旧V1完整保留。这是已确认`existing-baseline-drift`；Rust保持其可观察操作/错误/持久化边界，不将替代成功当本片迁移结果。并发首版原实际两个锁等待者，一201一500、唯一有效V1。合法历史版本可作只读事实预置，不能冒成HTTP替代成功。
- 原parent/children/旧版persist图及session flush须按来源和实测实现，不按数组顺序猜CAS、不增加请求expectedVersion或锁。子表插入失败保持原回滚面；实际失败在何条写入之前、何条之后要分列，不把未发生写入说成已回滚写入。
- 项目只拒原status=closed或非原签约前stage，不追加其他状态禁写；workspace行动沿其原更细isClosed/stage/permission条件。成本每子项币种和三金额一致性、原0.0001阈值、风险与总额、scope/risk/cost返回完整移植。
- 竞标mode/decision/result三元组与材料/时间线完整移植，不新增当前旧模型未做的审批/decision/阻断校验。`shortlisted`不是原result合法成功值，只能作DTO负例。
- 报价必须匹配本项目当前有效cost的**UUID原文**，币种一致；适用bid引用同样原文匹配。upper-case合法UUID在此原实际400，不归一成成功。bid路径拒lost/cancelled/not-applicable；direct且无bid引用原实际可绕过当前lost/no-bid等，不追加限制。released/conditional/escalation等仅保留原字符串引用完整性，不能把引用存在冒成真实domain审批处理器运行。

### 4.2 联系人

- 原POST controller漏转发已通过DTO的gender，HTTP实际创建为unknown；PATCH保留其原gender处理，不把schema/service能力倒灌为POST新行为。
- 联系人只要求客户存在；F创建才要求active。inactive客户原联系人201、F创建400，保持不同入口规则。
- E PATCH audit、pending session、contact业务更新原同事务；audit INSERT先失败时只证contact未变，额外contact UPDATE拒绝实测已先写audit再ROLLBACK，实际audit0。普通no-op/变化字段、脱敏与UTF-16 length按来源矩阵核。
- email原DTO无max，263长度实际到DB varchar255报500；不替原DTO追加400长度限制。原500、无业务变更及实际audit计数均有原件。

### 4.3 销售跟进与真实Todo生产者

- create复用原active客户规则，replace/void的原anchor只查存在性；owner缺省/null/组织回退、字典、版本检查次序沿D输入和原Native。expectedVersion在replace/void必填positive int；旧状态只有active/superseded/voided，不造inactive成功历史行。
- 原同flush事务顺序已见证：Todo INSERT → 新followup INSERT → pending session UPDATE → 旧Todo UPDATE → 旧followup CAS UPDATE → COMMIT。双向self-FK、todo来源/target/assignee/优先级/日期/标题/summary全部实际持久化；不把记录CRUD冒真实提醒完成。
- **同owner/target替换时旧Todo最终completed**，即使新next为空也如此：cancel的managed改动未先落库，后续按DB open/processing查到同一旧行并被stream循环覆盖completed。换owner或owner=null时旧Todo canceled；new create owner=null直接return，旧stream仍open。Rust不能先SQL落cancel再查stream而改变这一结果。
- stream先完成其他source的open/processing提醒，再判断next；无next不建新提醒但仍清流；owner为空提前返回不清流。
- 业务flush后audit是另一个提交。原void/replace后置audit失败实际HTTP500，但业务已voided/superseded、新记录/提醒已提交；不将其强并为一个原子事务。原已成功business flush不再重复flush同一session pending。
- 原Todo INSERT拒绝先于record写入；追加record INSERT拒绝实测先写Todo后失败、事务回滚且Todo0/record0。contact与F强制双读取并发原两个等待者、一200一500；显式stale expectedVersion的409与flush竞争500分别核验。
- 跟进类型schema64而列varchar32；由真实R2字典API创建的active 33字符code实际F创建到DB500并回滚，不强改成DTO400。

### 4.4 读取的session与共享接口

8个实际list/workspace/E/F列表在force-due下均只保留global guard即时touch的rowVersion+1，无额外pending flush。C/D/G list可不接受session参数；workspace仍为权限行动需要session。保留实际连接/flush时序，不以“复用service”宣称物理上天然等同Native同EM。

cost/bid向pricing提供唯一真实`store::current(&mut PgConnection,&str)`、`by_id(&mut PgConnection,Uuid)`、`summary(&Row)->Value`，current精确沿project+is_current=true+status=effective及原排序，by-id不加current过滤，不另开事务/加锁。Root HTTP保留原请求UUID给业务比较；历史读取Uuid只用于原by-id路径。可复用公开`projects::store::{find,user_names,org_names}`、`projects::model::Wire`；构造服务为本模块`Service::new(Database)`或D明确的客户/字典依赖桥。actor.primaryOrg取`ResolvedSession.user_snapshot`，不从不存在的AuthUser字段猜。共享错误桥统一原400/404/409/500，不提前UUID pipe化。

## 5. 所有权、并发与真实依赖

作者1 owns `project_technical_cost/**` 与 `project_pricing_margin/**`，作者2 owns `project_bid_commercial/**`，作者3 owns `customer_contacts/**`、`sales_follow_up/**`；**以上全都排除http.rs**。Root owns五个http.rs、Cargo/lib/root HTTP、共享旧模块/公共桥、生成快照/所有共同文档和实际运行。作者可写其纯验收定义，由Root执行；独立C不参与产品/验收工具实现。

先冻结共同接口，G2可Root+3作者；Gate在空闲席位由非作者C独审。同一个作者可分片接续；报价实际集成必须消费本批Root运行产生的真实Rust成本/竞标基线。已有客户/项目14作真实前置；未迁Lead的合法只读上下文可明确标prepared-source，但不能宣称完整Lead/其他10情报/讨论/工作区/域审批已交付。

## 6. 新环境及证据边界

仅本轮独立PG15.12容器/卷`poms-r3cdefg-pg15`、`poms-r3cdefg-pg15-data`，host22432→15432；DB固定`poms_r3cdefg_nest`/`poms_r3cdefg_rust`，独立新marker与`r3cdefg_control`，全新应用role/密钥。原92迁移+原DatabaseSeeder两库完成；PG17/旧private/旧run与卷不触碰。

端口Native Linux12100、Rust12200、Native Windows12110、UI12300，冲突核空闲不杀别人的进程。Native45项原件绑定同一真实Node24.19.0/当前Native artifact `0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4`。预冻结witness已停止原Native、清理192行，107原种子表raw JSON逐行完全恢复，428个逐权限检查均恢复；私有原始日志/令牌不入公开包。后续Rust实际验收新run/fixture，同一候选共同回归，失败/partial单列不改Pass。

## 7. 必须完成的后验收

- 全16真实Native/Rust HTTP/PG原字段结构、DTO/错误/权限/CSRF/URI负面矩阵；Root保留实际原wire/结构化响应与来源、精确数值文本、关系行/版本/Todo/audit/session，动态ID/时间仅有限明确归一，不用mtime复验。
- 各版本首版/既有第二版失败、并发、金额/Unicode/日期/UUID/长度、子表/审计/待写session故障与实际回滚/已提交面。合法DDL事实、约束拒绝/不可构造、生产者真实写入严格分列，不禁用DDL/unique/FK来造成功面。
- 原Angular四平台组合：LinuxBrowser/LinuxNative、LinuxBrowser/LinuxRust、WindowsBrowser/WindowsNative、WindowsBrowser/LinuxRust。Cookie/Bearer/认证负面另维记录，不能替平台组合。技术成本原UI仅有read workspace，没有创建表单；其创建由真实API认证。其他只认证原可达journey，不用page.route mock或component.evaluate冒实际闭环；范围外请求如实标记。
- Rust fmt/clippy/tests/build；原Native/admin与适用库lint/build/tests、原QA/auth/legacy分层、完整OpenAPI/client与生成枚举保护、schema check/dump穷尽分类。既有54ignored、schema/TZ/旧失败与quarantine保持原标签，不变成全PG通过；来源行为变化后只补受影响检查。
- 全owned run/行/ACL/进程/browser/server/observer lease终态可追溯，failed/stopped/partial同样保全；全部原字节/来源/产物与G4增量保存主区ignored，private保留本轮私有目录。

## 8. 关闭与不做内容

依次完成联合独立G3→实现commit/branch push→C固定提交复核→primary FF/main push与集成后检查→原字节生命周期归档/保全与独立关闭前复核→只关闭88/89/90/91/92各自合格子片→同步30/58及父Open→非作者实际G4与最终metadata读回。未满足片不计Done，不为结束工作把G1/阶段总验收虚标。

本批无正式部署/切流、真实云租户接管、产品DDL或性能认证；不扩到Lead14、情报其余10、讨论2/综合工作区2和完整域处理器。父#85及#57保持Open。本原件静态签署前G1 Pending，当前Gate状态由同字节manifest、C原件和线上回执决定，不回改本原件。
