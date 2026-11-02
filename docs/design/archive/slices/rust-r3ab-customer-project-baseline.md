# RUST-R3A/B 客户与项目基础联合实施基线

## 1. 切片与正式来源

- G0：R3 父 #85；A #86 客户/别名8操作，B #87 项目基础6操作；总体 #57 保持 Open。本文件当前为 G1 候选，待同一原件的独立决定与线上冻结回执才生效。
- 类型：`cross-layer-high-risk`；沿用 solo-worktree checkpoint，独立 worktree 分支 `codex/poms-r3ab-customer-project`。
- 代码基线：`a3a8c167f9cbeefc591dbaf2e75e7d5de9ce470d`，R2 #67/#80、路由 #61/#84 均已 Closed。
- 直接正式输入：迁移计划第1、6–9节；ADR-018/ADR-015；当前 authoritative canonical 行；完整现行 Nest controller/service/repository/entity/DTO、共享契约、OpenAPI/client、迁移和原测试；本次[原字节操作归属快照](rust-r3ab/g1-operation-slices-original.json)。顶层 current 清单可继续记录实际交付，不能替代该冻结输入。
- A 的完整逐项核对：[原文](rust-r3ab/input-a-contract.txt)、[来源](rust-r3ab/input-a-sources.json)、[24类候选验收](rust-r3ab/input-a-acceptance.json)。B 的完整逐项核对：[原文](rust-r3ab/input-b-contract.txt)、[来源](rust-r3ab/input-b-sources.json)、[40项候选验收](rust-r3ab/input-b-acceptance.txt)。上述正式副本逐字节等于作者初始输入，原始映射单独保留。
- 本批0新增/删除/改名现行 Native API、DTO、OpenAPI/client 或产品 schema；新增的是14个现有操作对应的 Rust 实现。#84 的 Native 路径交付不计作既有 Rust R3 操作。

## 2. 精确路由与守卫

A 的8项：

- GET/POST `/api/customers`，分别 `customer:read` / `customer:write`。
- GET/PATCH `/api/customers/{id}`，分别 `customer:read` / `customer:write`。
- GET/POST `/api/customers/{id}/aliases`，分别 `customer:read` / `customer:write`。
- DELETE `/api/customer-aliases/{id}`，`customer:write`，成功204空体；仅此入口显式 UUID pipe。
- GET `/api/customers/{id}/workspace-overview`，`customer:read`。

B 的6项：

- GET/POST `/api/projects`，分别 `project:read` / `project:write`。
- GET/PATCH `/api/projects/{id}`，分别 `project:read` / `project:write`。
- POST `/api/projects/{id}:reassignOwner`，`project:write`。
- GET `/api/projects:lookup`，`project:read`，必填 query `projectNo`；保留 `ProjectController_getByCode` operationId，UUID 保持 item identity；不保留旧路径或添加 alias。

逐项 source行、DTO、当前 canonical/spec、权限、HTTP方法见当前操作清单；不能以历史R0路径替代。继承会话/CSRF/权限/敏感字段、URI解码与原始路径、原错误信封和 GET/HEAD 规则。无 UUID pipe 的路径不追加400校验；隐式 HEAD、大小写/尾斜线、错误method、重复query、畸形URI顺序必须与真实 Native 对照，不用静态匹配冒通过。

## 3. SSOT、DTO与数据类型

业务行为 SSOT 为来源固定的现行 Nest/共享契约。DTO unknown字段 strip、缺省/undefined/null、字符串/UUID/enum/number/date处理逐项遵循正式 A/B 输入与原 Zod 包装；不得用统一 Rust serde 默认简化。金额用现有 decimal 与 JS 输出兼容规则，业务日期/UTC时间戳/数据库时区分列。复用已有共享枚举机械生成权威，不维护第二套枚举。现有表/列/UUID/索引/约束/版本链保留，产品 DDL N/A：本批只在新隔离副本执行原迁移。

联合优先级裁决：A/B 作者初稿关于 UTF-16/code point 的互斥表述不具独立规范权威，六份原副本不改。原共享 schema 与锁定 Zod4.6.1 的实际 oracle 优先；Root 已按原 schema 运行22项 astral 边界/lookup纯验证，当前这些字符串 min/max 在原 trim 后按 Unicode code point 计数，不能改用 UTF-16长度。详见[实际裁决](rust-r3ab/joint-string-length-decision.json)。两线相关validator必须采用此同一实际语义；其他JS大小写/空白/JSON语义不由该长度裁决替代。初始 UTF-16 预期被原oracle证伪的候选记录单独保留，不算产品或HTTP失败，也不改成通过。

## 4. 客户命令、归属、别名与工作区

- 创建校验 operator/owner/org 在原事务位置：客户编号、customer、primary alias 同一事务；保持序列回滚和主别名唯一性。创建/修改/创建别名原本没有业务 audit，不擅自新增。
- owner omitted/null/UUID 回退按 A 输入。客户只校验用户/组织存在，不追加 active、组织归属或操作者 scope 限制。客户 displayName 修改不回写 primary alias。
- 别名按 JS trim、正则空白折叠和 locale lowercase 规范化，不新增 NFC/全角归一；重复、主别名冲突、缺失与删除204/404/409次序保持。删除别名与 `customer.alias.deleted` 审计同事务，beforeSnapshot、requestId和实际 SQL/flush 次序由 Root 原 Native 先见证。
- 客户列表排序 updatedAt DESC、createdAt DESC；不加 ID tie-breaker。别名 primary优先、createdAt ASC。keyword保留 ILIKE 的原 `%/_` 通配语义。
- 工作区原各类总计、每类限量列表、状态集、权限、排序、时间线、推荐动作及中文文案完整移植。Lead/Project/Contract/FollowUp/Discussion 只读事实允许受控预置来源，但必须标为 prepared-source，不能冒充 Rust 完整域生产者；A/B 实际生产的客户/项目另做真实集成证明。

## 5. 项目命令、并发、读取与敏感字段

- 创建原次序 operator lookup→A requireActiveCustomer→项目事务/编号→project insert/flush，不把客户读取挪入事务或加锁。复制客户名快照和 owner信息，不追随 mergedInto或alias。
- PATCH 先项目存在/可编辑状态，按显式字段修改；保留 name先变更后customer查询导致的 ORM AUTO flush 现象，不能先假设整个请求原子回滚。原 no-op、版本列、并发flush错误和重载行为先 Native 见证，再选SQL/CAS实现。
- reassign 保留 editable状态、用户/组织 active校验、同owner/无primary组织/显式null/可省 expectedVersion 的原错误次序；历史记录与project同flush。POST 源码无 HttpCode 而 spec声明200，静态预期201；实际由 Root Native 见证，登记 existing-baseline-drift，不改原spec或擅自返回200。
- B 的 list/detail/lookup 返回不同结构。详情最新合同按原 signedAt DESC、updatedAt DESC、createdAt DESC（不擅自加NULLS LAST），列表milestone另由所有非null signedAt与closedAt取max；不能替换为统一最新active合同查询。
- detail signedAmount 非null且无敏感权限才裁剪并记1次security事件；null/有权限不记。保留originalUrl与fallback路径、字段策略及原 `not_configured` confirmation，不把L机制存在冒作新域确认写链。
- 不含timeline/workspace-guidance、技术成本/竞标/报价/归档/验收/完工等其他公共入口；支持详情的最小真实只读事实不新增其交付计数。

## 6. A/B共同接口与文件所有权

- A owns `apps/poms-api-rust/src/customers/**`；B owns `apps/poms-api-rust/src/projects/**`。实现者不得编辑共享Cargo/lib/root http/生成物/迁移或他人范围。
- A 提供 `CustomersService::require_active_customer(&self, id: &str) -> Result<ActiveCustomerReference, CustomersError>`，`ActiveCustomerReference { id: Uuid, display_name: String }`。可有同一实现的 `require_active_customer_with_connection(&mut PgConnection, &str)`，借连接不拥有事务，不另开/提交/关闭调用方事务。
- B 在原事务外调用 service读取；A错误按原404 `Customer {id} not found`、400 `Customer {id} is not active`、原DB500经现有ApiError信封转发，保留请求ID拼写，不提前UUID pipe化。无锁/新scope校验，不复制第二份客户有效性逻辑。
- Root owns共享接线、Cargo/lib/http、所有公共治理/manifest、实际PG/HTTP/browser/build/test/回归与保全。C 不参与实现，覆盖同一联合候选的独立 G1/G3、固定提交与实际G4；共同回归只跑一轮，修复只补受影响检查。
- 子代理显式 `gpt-6.1-sol` / `max`；Fast 无控制参数，保持未核实。实际来源及责任记录进入每次交付原件。

## 7. 环境与运行前硬条件

- Windows工作树 `E:/projects/worktrees/poms-r3ab-customer-project/poms`，Linux `/home/wangzishi/projects/poms-rust-r3ab`；来源同一base，构建/产物另目录，不能复用旧未认证runner/private。
- 仅新 PG15.12 容器 `poms-r3ab-pg15` 与独立volume，host21432→15432；数据库固定 `poms_r3ab_nest/poms_r3ab_rust`，marker必须新生成、两库记录同一来源，namespace `poms-r3ab`。fixture先核容器/端口/role/DB OID/marker/事务归属，租约与清理必须来自本轮；不连接PG17或旧任务数据库/隔离图。
- 计划独占端口：Linux Native11100、Rust11200、Windows Native11110；UI独立11300/11310等经Root启动前核空闲，冲突不杀其他进程。Root可在上述新任务范围内按实际空闲追加独立端口并记录，不改变业务验收。
- 先实际 Native SQL/HTTP/并发见证未决flush和status，再完成依赖这些裁决的Rust持久化；G1冻结的是具体来源与此顺序，不把“通常201/500”当实测。
- 每次运行唯一run/fixture ID，原件与cleanup可追溯。private credential/journal保存在本轮私有目录，公开报告只存去敏视图、元数据与原字节摘要；不输出token或环境密钥。

## 8. 必须完成的验收

- 全14操作双方真实HTTP、权限/CSRF/负面参数、原DTO与错误/状态；A24类与B40项矩阵是覆盖类别，不能相加冒实跑计数。
- 新隔离PG真实事务、编号回滚、owner边界、别名唯一/并发与删除audit、项目CAS/no-op/AUTO flush、敏感事件及原完整读结构；先Native见证，再两端同场景严格比较，允许动态UUID/时间只按明确映射归一，原值保留。
- B正向闭环必须由A Rust HTTP创建实际active客户后继续Rust项目创建/修改/lookup/归属，检查真实数据库；不得使用模拟客户helper或prepared-source代替。inactive/missing及原实际失败副作用也验证。
- 原Angular客户/项目关键journey，LinuxBrowser/LinuxNative、LinuxBrowser/LinuxRust、WindowsBrowser/WindowsNative、WindowsBrowser/LinuxRust四组合；保留原QA/auth foundation/legacy分层，mock或诊断不计真实跨端通过。
- Rust fmt/clippy/普通测试/build与适用新增PG测试；涉及项目lint/build/test、原API QA/浏览器、完整OpenAPI/client/生成枚举来源保护、schema check/dump分类、169等保护项按实际影响复核。旧54ignored和schema已知失败分类按原标签保留，不因本批新增普通测试改写历史数量。
- 全部新run/行/文件/observer lease归还，失败、stopped、partial单独终态对账；原环境/PG17/旧private、volumes和隔离例外保留。正式schema/部署/性能为N/A，有明确不在本片理由。
- 证据绑定同一当前Native/Rust来源与产物、构建命令、环境/运行、独立C原件；Git提交/固定提交复核、branch push、primary FF/main push和集成后检查后，归档原字节并同步Issue/本地tracker。

## 9. 漂移与关闭条件

当前已知历史漂移：R0旧lookup path已被#84替换；本次现状清单保留旧映射并以当前源覆盖。reassign响应spec200/静态Native预期201待实测分类；ORM flush/no-op/冲突、UUID大小写及字段省略仍以来源和实际Native为准，不能静默修复或加强约束。

普通归档、工具小修和状态回写由Root集中复核，不为每个可逆小脚本新增独立gate。若实际见证要求改变冻结业务语义或显著扩大范围，单独corrective checkpoint，不覆盖本原件或把未验收标Pass。

本原件保留签署前状态：**G1 Pending**，候选未授权产品实施；同一baseline原件、input manifest与C独立Pass绑定后，由Root线上freeze进入Doing。实际Gate状态由独立C原件与线上同字节冻结回执决定，冻结后不改写本文件。G3、G4签署前均Pending。G4只允许关闭 #86/#87；父 #85 和总体 #57 保持Open，R3其余44操作及最终阶段验收仍未完成。
