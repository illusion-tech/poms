# RUST-R2L1 公共审批机制：G0 / G1 作者输入候选

- Gate Status: `Pending`，本文件不是 G1 Pass 或开工许可。
- Task: [RUST-R2L1 #81](https://github.com/illusion-tech/poms/issues/81)，当前 `Todo / G1 Pending`；Parent: R2L #79；R2 #67 / 总体 #57 保持打开。
- Author: I；Root 统筹、共享接线与实际环境，独立 reviewer 决定 G1。
- Source HEAD: `20335a189ce1197ccd4211bdfbb314954421729e`；工作分支由 Root 创建为 `codex/poms-r2l1-public-k-route`。
- Slice type: `persistence` + 内部 command/query；公共 HTTP surface 变化为零。
- 当前阶段：只读盘点和本目录两个输入文件；未编译、未运行原 service / Rust / PG，未写产品或外部系统。
- 来源清单：[l-sources.json](l-sources.json)。逐文件 raw 与 CRLF→LF SHA-256 独立记录；治理文档与产品来源分组，不能因后续合法 tracker 更新倒写原产品清单。

## 1. 可独立交付的范围

R2D 用户、owner-reference、profile 与 R2F 审计能力已交付；迁移计划第 61、65、171–174 行允许公共机制先行、真实域处理器随 R3–R5 接入，不能形成按阶段编号循环等待。Root 已登记 #79 下独立子片 #81；在线信息由 Root 核实并提供，本作者不修改这些共享治理项。

本片必须交付可被直接调用且真实落库的能力，不以空 trait 或内存模拟替代：

1. `ApprovalSummaryService` 的完整摘要生成与现有三 repository 的定义、快照、字段投影读写能力。
2. `ConfirmationService` 的创建、参与人确认、关闭、按 ID / 按目标查询进度，及这些命令真实产生、完成、取消的 `TodoItem`。
3. `ApprovalRecord` 的公共行读取、最新记录排序、expectedVersion / pending / assignee 校验、公共状态与待办变更，以及由调用方提供业务处理器的同事务执行接口。该接口无内置生产 no-op handler。
4. 原审批和待办投影中不依赖业务事实的公共映射；调用者必须显式提供所需目标事实。公共行查询结果不冒充完整 `ApprovalRecordSummary` / `TodoItemSummary`。

本片新增已交付公共操作 **0**；R2 仍为 **99/108**。#79 的四操作和完整域接入继续待验。既有四条路由仅冻结为排除边界，不接入 Rust router、不返回伪造成功、不用固定空待办遮蔽缺失实现：

| Method | 原公共路径                           | 原 controller 权限              | L1 处理                    |
| ------ | ------------------------------------ | ------------------------------- | -------------------------- |
| GET    | `/api/approval-records/{id}`         | `project:read`                  | 保留原 TS；Rust 本片不注册 |
| POST   | `/api/approval-records/{id}:approve` | `project:write`，session + CSRF | 保留原 TS；Rust 本片不注册 |
| POST   | `/api/approval-records/{id}:reject`  | `project:write`，session + CSRF | 保留原 TS；Rust 本片不注册 |
| GET    | `/api/me/todos`                      | `Authenticated`                 | 保留原 TS；Rust 本片不注册 |

权威行：`api-route-canonical-inventory.md:128–130`、`rust-r2-scope-and-dependencies.md:228–231`，以及 `approval.controller.ts:15–53`。不新增 canonical route、alias、DTO、OpenAPI 或客户端。

明确不做：Contract / Commission / Customer / Lead / Project / Handover 事实源及真实 handler，移交或销售提醒的发起逻辑，通知派发，新增审批流配置器、后台任务、业务表 / migration、权限策略、历史表或审计副作用，R2K / #61 裁决与 R3–R5 工程实现。#61 由并行作者 / Root 独立推进，本目录不触碰其文件。

## 2. 当前真实注册点及抽取界面

- `app.module.ts:57–58` 导入 `ApprovalModule`、`ApprovalSummaryModule`。
- `approval.module.ts:26–50` 将公共表和 Contract / Commission / Project / Lead / Customer 等实体一起注册；providers / exports 是 `ApprovalService`、`ConfirmationService`。
- `approval-summary.module.ts:12–23` 注册并导出三 repository 与 `ApprovalSummaryService`。
- **没有现成的业务 handler registry。** `ApprovalService.resolveApprovalDecision:473–653` 自己开启 `transactional`，在公共 record / todo 内存赋值后直接执行 Contract、CommissionPayout、CommissionAdjustment 分支。未知组合抛 `ApprovalRecord ${id} is not supported by the current approval slice`，原事务回滚。
- `approval.service.ts:511–650` 的合同状态、提成金额 / 冻结 / 结算快照及调整处理整体留给真实域。已支持分支缺少实体或事实时会产生其自己的 404 / 400；不能把“尚未迁移 handler”一律伪称原 unsupported 400。
- `findOpenTodosForUser:426–470` 按受领人和 `open/processing`、`createdAt ASC` 查询后，批量读取 ApprovalRecord、Contract、CommissionPayout、CommissionAdjustment、Project、Lead、Customer。完整 enrichment 留给后续域接入；L1 提供真实公共行与显式事实输入映射。
- 原 confirmation 公共引擎实际消费点是 `project-handover-query.service.ts:102` 的进度查询。其他域是否发起确认不能凭模块 import 推定已接通。摘要 snapshot repository 被 Project、ProjectCost、Handover 查询服务直接注入；原 summary service 没有自动替换、遮罩或重算业务事实。

## 3. 七表与类型 SSOT

产品行为以当前 TS service / entity / repository、现存 migrations 和 shared contracts 为迁移权威。设计文档是目的与边界输入；不能据设计示意列名覆盖实际字段。`table-structure-freeze-design.md:139–143` 的 `target_type/status/assignee_id` 等为较粗描述，实际 approval / todo 字段服从下表，不新增设计中列出的 `approval_record_node`。

| 既有表                                     | 字段 / 类型与状态                                                                                                                                                                                                                                                                                                        | 键、索引和来源                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `poms.approval_record`                     | UUID id、approval_type/business_domain/target_object_type、UUID target_object_id/project_id/initiator_user_id/current_approver_user_id；current_status=`pending/approved/rejected`；current_node_key；decision 可空；decision_comment text；submitted/decided/closed/created/updated 为 timestamptz；row_version integer | PK；target/status/approver 普通索引；枚举 CHECK；实体 `approval-record.entity.ts`；init migration + EX56B + EX58B                                                                                               |
| `poms.todo_item`                           | UUID id/source_id/target_object_id/project_id/assignee_user_id；source_type、todo_type、business_domain、target_object_type；title varchar255、summary text；status=`open/processing/completed/canceled`；priority=`low/normal/high/urgent`；due/completed/created/updated timestamptz；row_version integer              | 部分唯一 `(source_type,source_id,assignee_user_id) WHERE status IN ('open','processing')`；受领人状态与目标索引；枚举 CHECK；init + EX56B + EX58B                                                               |
| `poms.confirmation_record`                 | UUID id/target_id/project_id/closed_by/created_by/updated_by；confirmation_type/business_domain/target_type；status=`pending/confirmed/closed`；required_count/confirmed_count integer；confirmation_comment/close_reason text；submitted/confirmed/closed/created/updated timestamptz；row_version integer              | 部分唯一 `(confirmation_type,target_type,target_id) WHERE status='pending'`；目标/状态/project-status 索引；EX08A3；不凭 TS union 增加数据库 CHECK                                                              |
| `poms.confirmation_participant`            | UUID id/confirmation_record_id/participant_id/created_by/updated_by；role_key varchar64、display_name varchar128；status=`pending/confirmed/closed`；confirmed_comment text；confirmed/created/updated timestamptz；**无 row_version**                                                                                   | record FK `ON UPDATE/DELETE CASCADE`；唯一 `(confirmation_record_id,participant_id)`；record-status/user-status 索引；EX08A3                                                                                    |
| `poms.approval_summary_package_definition` | UUID id/created_by/updated_by；scenario varchar128、package varchar64、projection/export varchar32、field_rule_version varchar64；status=`active/inactive/superseded`；created/updated timestamptz；row_version integer                                                                                                  | 唯一 scenario+package；scenario-status / scenario-projection-status 索引；EX08A2                                                                                                                                |
| `poms.approval_summary_snapshot`           | UUID id/target_id/summary_package_id/supersedes_id/created_by/updated_by；target_type、scenario、package、projection/export、business_status_at_snapshot；generated/created/updated timestamptz；status=`active/superseded/voided`；row_version integer                                                                  | 部分唯一 `(target_type,target_id,approval_scenario_key,projection_level) WHERE status='active'`；package FK RESTRICT；self supersedes FK SET NULL；目标 / scenario-generated-desc / package-status 索引；EX08A2 |
| `poms.approval_summary_field_projection`   | UUID id/summary_snapshot_id/created_by；field_key varchar128、visibility/masking/export varchar32、field_order integer、channel_scope_summary text；created_at timestamptz；**无 row_version**                                                                                                                           | 唯一 snapshot+field；snapshot FK CASCADE；snapshot-order 索引；EX08A2                                                                                                                                           |

五个直接建表 / 枚举迁移：`Migration20260322235500_init_approval_and_todo`、`Migration20260415100000_ex08a2_approval_summary_snapshot`、`Migration20260415110000_ex08a3_confirmation_record`、`Migration20260501120000_ex56b_todo_approval_enum_checks`、`Migration20260503160000_ex58b_enum_code_value_direct_cutover`。EX58B 后的 target/source/todo 值为小写连字符，不使用旧 `Contract/ApprovalRecord` 值。引用公共摘要 / 确认表的其余迁移列为 schema 保护来源，不实施其业务域。

模型完整列定义直接冻结四个 entity 文件，不以本表缩写替代。当前无产品 DDL 变更提案；Root 后续在 fresh PG15 双库完整执行历史迁移并核实际 107 表目录、约束和权限。新增 migration 为 N/A；schema / migration check 仍必须记录实际结果及既有 drift 分类。

## 4. Summary：真实两次 flush 的边界

`approval-summary.service.ts:35–78`：

1. 空 fieldProjections 先抛 400；再按 scenario+package+active 找定义，缺失 404；projectionLevel 或 exportPolicy 不等抛 400。
2. snapshot 从定义复制 package/projection/export，输入的 business status、target、supersedesId 直接保存；不自动 supersede 旧 active snapshot。
3. `snapshotRepository.save` 自己 `persist().flush()`；然后构造字段，再 `fieldProjectionRepository.saveAll` 第二次 flush。未提供字段 exportPolicy 用定义值，fieldOrder 用数组 index，使用 `??`，显式空串 / 0 保留。
4. 三 repository 维持现有 create/save 和查询接口：active definition 精确匹配；snapshot byId、byTarget、activeByTarget；快照 `generatedAt DESC,createdAt DESC`；字段 `fieldOrder ASC,createdAt ASC`；不额外加 UUID tie-breaker。saveAll 空数组无 flush。

**standalone 没有包裹两次 flush 的事务**：第一笔已提交、第二笔唯一 / FK / 长度错误时不得擅自删除快照或改成整体原子成功 / 失败。**有 caller-owned 原生事务时**，两次 flush 应使用同一 caller 连接，外层决定 commit / rollback。其实际 SQL、第一笔存留、外层 rollback 和已被 caller 管理的脏对象是否同 flush，均需原 Native witness；当前未运行，不能把静态顺序当已证原子性。

`database.seeder.ts:1195–1266` 已存在移交 / 经营 signal 摘要定义。验收不修改这些 seed ID，而使用新 run UUID 的独占 scenario/package/definition；不读取旧库或复制真实租户数据。

## 5. Confirmation / Todo：完整状态机与权限位置

`confirmation.service.ts:84–370` 的输入是 TypeScript 内部 interface，**没有独立 Zod / HTTP DTO**；不能借迁移新增 trim、长度、正整数或 creator-only 规则。

- create 在进入事务前检查 participants 非空和 `Set<string>` 重复；重复按原 JS 字符串相等，不先 canonicalize UUID。事务内查同 type+target 的 pending 冲突 409；record UUID 先生成，然后每位参与人依次 participant UUID、todo UUID；所有实体一次显式 flush，事务提交。pending、requiredCount=人数、confirmedCount=0；todo open、默认 high，title/summary/dueAt 等按源码 `??`。不自动校验或创建业务 target。
- confirm 事务内顺序：record 不存在 404 → 显式 expectedVersion 不等 409 → 非 pending 400 → 无当前 actor 参与人 403 → participant 非 pending 409 → 查 actor 对应 open/processing todo。participant confirmed、record confirmedCount+1；达到 requiredCount 时 record confirmed 并写 confirmedAt。存在 todo 才 completed；缺 todo 仍完成确认。三类修改同 flush / 同事务。
- close：record 404 → expectedVersion 409 → 非 pending 400；并查 pending participants 和所有 open/processing todos，record closed、pending participants closed、这些 todos canceled。已确认参与人、已结束 todos、confirmedCount 保持原样；closeReason 使用 `comment ? reason + '\n' + comment : reason`。**原 service 没有发起人或管理员权限检查**，L1 不擅自添加。
- progress byId 缺失返回 null；latestByTarget 可选 confirmationType 仅 truthy 时入条件，`submittedAt DESC,createdAt DESC`；参与人 `createdAt ASC`；日期 `toISOString()`，无额外排序键。
- service 无 session / CSRF / permission guard，也不调用 audit writer；actor 来自调用方。未来 HTTP 仍由原 guards / 权限包围，不能因公共引擎已验证而宣称公开授权链已迁移。F 的复用能力不等于本片应新增审计事件。

事务源码：锁定 MikroORM 7.0.11 `EntityManager.js:1130–1136` 委托 TransactionManager；`TransactionManager.handle` 默认 `NESTED`，继承当前 transaction context；已有事务时 `executeNestedTransaction` fork(clear 默认 false)并传 ctx 走 savepoint，callback 后还有自动 flush，并向父 EntityManager 合并实体。原三个方法均没有传 propagation / ignoreNestedTransactions。Rust standalone 应自有事务，borrowed caller 模式应保留等价 savepoint / 外层控制，不得另取连接独立提交。**实际 SAVEPOINT / ROLLBACK TO / RELEASE、父脏对象传播和异常后可继续性必须由 Native witness 校准后才定型持久化实现。**

## 6. Approval 公共状态、CAS 与未来 domain 回调

- 原公共校验顺序来自 `approval.service.ts:473–509`：读 record 404 → expectedVersion 409 → 非 pending 400 → strict assignee 字符串不等 403 → 查 actor 的 open/processing approval todo。
- approved/rejected 写 currentStatus、decision、comment、decidedAt、closedAt、清 currentApproverUserId；存在 todo 分别 completed/canceled，写 completedAt。批准 comment 用 `?? null`；驳回 comment 为原 truthy 拼 reason + 换行 + comment。
- expectedVersion 只在初始读取比较。row_version 的持久化乐观锁与批量行为服从原 MikroORM，不把所有 UPDATE 理想化成统一 `WHERE row_version` 或新增 `FOR UPDATE`。record/todo 有 version，participant/projection 无 version；变更字段、实际 version RETURNING、冲突与读后刷新必须实际见证。
- public state 和真实 domain callback 必须在**同一数据库事务 / savepoint、同一连接**，callback 失败不得提交 record / todo；caller rollback 必须回滚二者。回调只能借用事务，不能 commit、rollback、pool acquire 或替换外层 UoW。
- 新内部 seam 是迁移架构抽取，原 TS 没有此 registry。`resolve_decision_with` 要求显式 handler，返回 domain outcome 形成 CommandResult；不附送默认成功 handler，不新增“通用审批只改状态”的生产命令。未知原组合保留原 unsupported 400；尚未接入的真实域不能被映射成伪造业务成功或伪称原缺失错误。
- L1 state 层只管理七张公共表的已加载行 / dirty snapshot / version / raw JS overlay；不接管 callback 的 Contract / Commission UoW、金额算法、任意仓储的 AUTO flush 或领域审计。未来 handler 需通过同事务持久化接口带入自己的 before/after；未冻结域的 managed state 不能隐性混进本片。

## 7. Rust 模块 / 接口提案（尚未编码）

建议独占 `apps/poms-api-rust/src/approval_common/**`、`tests/approval_common*`、`examples/approval_common_probe.rs`、`tools/rust-r2l1/l-*`；Root 单写 lib/Cargo/config/http、共享 helper、环境、fixture、正式主基线及 Git/GitHub。无新依赖需求提案，先复用已锁 SQLx / Tokio / UUID / Chrono / serde / JsString。

- `ApprovalSummaryService::new(Database)`：create_summary_snapshot，定义 / 快照 / 字段投影的现有 repository 等价方法；另设 borrowed-session 变体，保留 standalone 两次提交与 caller-owned 同事务差别。
- `ConfirmationService::new(Database)`：create_confirmation_record、confirm_participant、close_confirmation_record、find_confirmation_progress_by_id、find_latest_confirmation_progress_by_target；同样提供 borrowed caller 模式。其内部 new transaction / nested savepoint 不通过外部 HTTP 暴露。
- `ApprovalCommonService::new(Database)`：get_record / latest_record、查询真实 open todo 行、公共映射、resolve_decision_with。原公共 Summary 类型只在提供显式目标事实后生成；没有事实时返回内部 raw record，不假称公共 API 已满足。
- callback 形状：`apply<'a>(&'a self, context: &'a DecisionContext, connection: &'a mut PgConnection) -> Pin<Box<dyn Future<Output=Result<DomainDecisionOutcome,CommonFailure>> + Send + 'a>>`。持久化层拥有事务生命周期；未来 handler 仅借用连接。该签名是待 Root G1 确认的提案，不是编译通过声明。
- `CommonFailure` 保留原 HttpException status + `JsString` message；未知 Error / SQL 失败保留分类供探针观察但对公共 HTTP 仍由现有标准错误层决定。不得为此扩展全局 ApiError、复用名字误带入 storage authority，或将源 SQL / 凭据写入公开错误。
- actorId、原始输入标量及 optional/nullable 差别由内部输入类型表达；原 interface 不经 Zod 的部分不追加公开 DTO 的限制。探针 JSON 只是受限内部传输格式，不成为新产品 API。

## 8. JS / SQL 兼容性要求

1. 复用现有 `auth::js_json::JsString`；输入到返回值 / error / managed snapshot 保留 UTF-16，PG text bind 时才转换 Node UTF-8 等价值。避免重演 early lossy；query hydration / dirty overlay 以原 EntityFactory 和 Native witness 为准，不把原 L1 没有的 raw 审计逻辑搬进来。
2. `??` 与 truthy 分开；空字符串 / 0 不自动变 null。Set / strict equality 按原字符串；UUID 数据库 canonicalization 不能提前改变原重复参与人检查或 assignee 判断。显式 expectedVersion 对比不等价于增加版本必填规则。
3. UUID 随机性只在比较器映射已登记的同一逻辑对象；UUID 生成先后、CommandResult todoItemIds 顺序和真实关系必须保留。
4. Date 对外 ISO UTC 毫秒；数据库 timestamptz，连接时区服从既有 Database 基础。generatedAt 的 DB now/default 与 service now / ORM onCreate/onUpdate 分列，不能一律同一个时刻或按字串本地时区处理。
5. 默认 active / pending、版本默认 1、update version、自动 flush、RETURNING、SQLSTATE 23505 / FK / 长度 / optimistic failure 的事务范围都在实际 oracle 中校准；禁止为了“更安全”添加锁、唯一性预查、重试、CAS 或整体事务。
6. package field_rule_version 是既有字段，原 createSummarySnapshot 不验证输入版本；原 field projection 仅存 metadata，不执行脱敏算法。本片不凭设计名义新增敏感数据读取或策略引擎。

## 9. 最小真实 PG 验收计划（G1 后由 Root 统一运行）

### 9.1 所有权与实际入口

Root 新建 L1 专用 PG15 双库 / role / private root / marker，不复用旧 IJ 或 PG17，不连接 TEST；最终端口、镜像、Node / Rust binary、owner receipt 在运行前由 Root 固定。所有资源先登记 intent、schema precondition、精确 UUID / run key，再写入；最终独占行连续两次 cleanup 0/0，完整目录、权限与非 owned 行不变。

Node oracle 机械加载当前原 TS service / repository / entity 与锁定 MikroORM（不是手写 service 模型，不 mock repositories / PG）。优先初始化独立原 MikroORM metadata + forked EntityManager，直接 `new` 原 service / 原 repository；不加载整个 AppModule 以触发后台业务任务。Rust example 直接调用同一公开内部 facade、实际 SQLx pool；两端都只接受受限 JSONL 操作，无新增产品 HTTP/debug endpoint。探针源、编译产物、原来源集合和版本均散列保全。

### 9.2 有限验收组

| 组                       | 必须实际观察的内容                                                                                                                                                       | 不得冒称                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| S1 summary 正向          | 原定义读取、2 个投影、默认字段顺序 / policy、byId / byTarget / active / projections 查询；真实三表值、FK、时间与版本                                                     | 业务字段可见性或审批域已实现                      |
| S2 summary 错误          | 空数组 400、缺 active definition 404、元数据不符 400；重复 active / 重复 field 的实际异常；**第二 flush 失败后第一 snapshot 存留**                                       | standalone 两 flush 原子                          |
| S3 summary caller tx     | 同 caller 事务两 flush 可见性；外层 rollback 清零；第二 flush 失败时 caller 的处理、能否继续及 savepoint 语义按原实际记录                                                | 无见证地统一套 savepoint                          |
| C1 confirmation 生命周期 | 两参与人 create → 第一人确认仍 pending → 第二人确认 confirmed；进度 / latest；真实 1 record+2 participants+2 todos 及版本、日期、actor、默认值                           | 项目移交实际发起 / 业务闭环                       |
| C2 close 与拒绝          | 部分确认后 close，保留已确认人 / count；pending 人关闭、open/processing todo canceled；重复参与人、重复 pending、missing / stale / terminal / wrong actor 的原顺序与错误 | creator-only 授权或通知审计                       |
| C3 tx / 并发             | create / confirm / close 故障导致所有公共行回滚；caller tx 下 nested/savepoint 成功与失败、外层 rollback；一组相同版本竞争，以原真实结果为准                             | 静态 version 即证明并发协议                       |
| A1 approval common       | 原 service 未支持组合的 missing / version / status / assignee / unsupported 错误顺序，record / todo 无提交；公共读取 / 日期 / nodeName / supplied facts 映射             | 任一真实 Contract/Commission 批准成功             |
| A2 callback seam         | Rust 内部 probe 的真实事务 callback 提交及 callback 故障 / caller rollback；callback 使用同连接、无独立 commit、公共行原子性；必要 Native 原 transaction 参照单列        | test callback 等同生产域 handler 或原完整业务对照 |
| G0 surface 回归          | 公共路由 / OpenAPI / generated client 来源无变更，既有 99 操作必要回归与基础 guards 由 Root 定界                                                                         | 本片新增 4 个已交付 HTTP 操作                     |

以上为组级最小集，不预报通过条数。原顺序 SQL 与真实 body/exception、PG before/after、事务 trace 均留原件；比较仅规范化已登记随机 ID、有限具体时间路径，错误原 message / SQLSTATE / 状态 / 版本不宽松抹平。遇新实际差异先保留失败，再走同次 corrective，不改旧 golden 掩盖。

### 9.3 静态 / 工具检查

Root 统一运行既有 fixed-image Cargo fmt / all-target tests / strict clippy / release；原 TS / DTO / OpenAPI / migrations 只作 authority，不能修改以迁就 Rust。按触及范围执行 source-manifest 检查、schema / migration 对照与 drift 分类；文档跑 diff / Markdown table 检查。此刻全部 runtime 项为 `not run — G1 Pending`，未称任何 storage 或 L1 实际 PG 运行。

## 10. G1 需明确裁定与交付完成条件

1. Root 已为 #79 登记独立 L1 子片 #81；G1 冻结 0 HTTP / 7 表 / 四路由留待域接入 / parent open / 99 不增的边界。
2. 同意完整 Summary、Confirmation/Todo 为实质交付，审批 callback seam 为内部架构抽取；确认上述模块与共享所有权，不把 callback 抽取写成原 TS 既有 registry。
3. 冻结 standalone 与 borrowed caller 的两种事务接口：Summary 两 flush 不默认原子；Confirmation / approval 默认 nested，原 managed parent / savepoint 行为先实际见证，持久化实现只覆盖七公共表，不吞并未知 domain UoW。
4. G2 后 Root 先取得必要 Native SQL / nested transaction witness，再定 store 的版本 / flush / savepoint 细节；不是跳过验收的例外。
5. L1 G4 必须有 merged/committed code、真实双端 PG service/probe 原件、callback seam 独立证据、schema/权限与资源双清理、独立 G3、治理同步及生命周期归档。L1 完成只解锁公共引擎依赖，#79 四操作、R2M、K / #61 / R3–R5 及父任务保持其实际未完成状态。

G1 reviewer / approvedAt 由 Root 填入正式主基线；本作者输入尚未批准。当前未发现需要更改公开契约的提案；设计示意与当前列名差别作为 `existing-baseline-drift` 保留，不在本片扩大修复。尚未观察的运行时行为不是通过结论。
