# L1 内部实际探针协议 v1

每个 JSONL 行是 `{version:1,runId,caseId,steps}`。runId 是新 L1 fixture run UUID；caseId 为有限 ASCII 标签。每个 step 是 `{op,input?,as?,onError?}`；错误默认 stop，显式 `onError:"continue"` 才执行后续步骤。每 case 只创建一个 Native forked EntityManager / Rust CommonState；共享 identity、dirty、raw string 和版本。case 结束必须 rollback 未结束的 caller transaction，再关闭 / 释放连接；不能跨行继承状态。

操作枚举由 [l-protocol.mjs](l-protocol.mjs) 的 OPERATIONS 导出。`summary.*.create` 绑定真实 managed entity；`.save` 接受 `{entity:{$ref:"name"}}`，`.saveAll` 接受 `{entities:[{$ref:"name"}]}`。其他输入键用原方法参数名：actorId、id、targetType、targetId、confirmationType、approvalScenarioKey、summaryPackageKey、projectionLevel；原 service 的 input 置于 `{actorId,input:{...}}`，confirm/close 另含 id。approval.resolve 是 `{id,actorId,decision:"approved"|"rejected",input:{...},callback:{...}}`。

`{$ref:"created.confirmationRecordId"}` 只能引用已执行 step 的 as 结果。完整 entity 引用必须返回原对象，不能深拷贝并丢掉 identity；观测值则在每步完成时冻结，不能被后续 flush 追溯改写。禁止 prototype 路径。只有 `{$date:"ISO..."}` 转原 JS Date；省略属性仍为 undefined，显式 null 不变。Rust 传输 Date marker 保留到 typed input decode，不把普通日期字符串自动转换。原始 JS 字符串 / lone surrogate 以 JSON escape 保全。

每 case 输出 `{version:1,runId,caseId,execution:"observed",steps:[...]}`；每 step 为 `{index,op,ok:true,defined:false}`（原 undefined）或 `{index,op,ok:true,defined:true,value:...}`，失败为 `{index,op,ok:false,error:{kind,status,message,sqlstate?}}`。协议 / fixture admission failure 必须单列 `execution:"probe-rejected"`，不能伪装产品 HttpException。status 为原 HttpException 数字或 null，message 原 JS string，sqlstate 只公开五字符分类。凭据仅环境 / stdin；完整 SQL 和连接细节不进公开错误。

approval.get/latest/openTodos 仅公共 raw 行；不冒充原完整目标 enrichment。纯 project 操作使用机械导出的原私有映射函数和显式 facts。paired approval.resolve 只支持 callback.kind=unsupported，执行前验证真实 loaded record 不是原三个支持组合；仍调用原原始 approve/reject 方法，不替换其结果。missing / stale / terminal / wrong-actor 的负例允许先被原 validation 拒绝，不能因为 admission 查询额外改变产品的顺序或共享 managed 状态。Rust-only callback.kind=owned-witness 携带 Root 已登记 witnessId/marker，仅固定 UPDATE 同七表中的另一 fixture-only approval_record；可在写后抛 fault。此组证明同事务，不称 Native registry / 域审批成功；生产模块没有 no-op 或 fixed witness handler。

tx.begin/commit/rollback 是 caller outer transaction；Confirmation/approval 自身的默认 NESTED/savepoint 属产品实现，不能由探针跳过。session.flush/clear 仅当前 case 的 managed state；不得独立打开连接或 flush 未迁移域 UoW。`managed.assign {entity:{$ref:"binding"},changes:{knownMappedScalar:value}}` 是探针专用的赋值步骤：验证实体属于当前 run 的七表白名单、已由本 case 管理，按原 metadata 允许映射标量 / mapToPk 值；禁止 id、proto、未知属性或域实体。不执行 flush，返回同一 live entity。Rust 同步当前 managed 行，保留原 dirty baseline。它用于证明 parent dirty 进入 nested 的传播和 saveAll([]) 不 flush，不新增产品命令。最外层同 case 的事务、对象 hydration、失败后继续行为由 Root 原 Native SQL witness 校准。

## Native adapter

`await createNativeAdapter({connection,guardCase,guardInput,guardManagedEntity,approvalIdentity,onStepStart,onStepEnd,onCaseEnd,onLoaded})` 返回 `runCase`、`sourceReport`、`metadataReport`、`close`。connection 是 Root 已验证的新 L1 Nest MikroORM 配置（127.0.0.1:17432、poms_r2l1_nest、poms_r2l1_app、poms）；不读 env、不执行 migration/seed。也可传 Root 已初始化的 `orm`，此时 adapter 不拥有其关闭权。

guardCase / guardInput 必填；managed.assign 另须 guardManagedEntity。guard 返回 false 或抛异常即拒绝；Root 校验所有 fixture 身份、ownership / intent、父关联与目录。approvalIdentity 只读 Root 的已有 fixture/type 快照；缺失记录返回 null、无证据返回 undefined；adapter 不为此在产品 EntityManager 增查。已 loaded 的实际 record 优先，以免 assigned type 已改变时继续用旧身份。

每步 hook 收到 request/step/index/caseContext/em/bindings；onStepEnd 另有 live value、原 error 和已冻结 observation，供 Root 精确收养生成行和保存实际结果。hook 失败标 probe-failed（或附 nativeAdapterObservation 后重新抛出），不得重写成功业务结果。finally 只 rollback 尚未结束的 caller outer transaction；不自动 flush/clear。RequestContext.create 自动离开当前 case 上下文。close 只关闭 adapter 自有 ORM 并恢复本次 TS/alias hooks；Root 应检查恢复结果并停止 owner。

原七个 defineEntity Schema 直接注册，原三 service / 三 summary repository 机械加载。ApprovalService 构造器的未用 domain 参数也是原生 EntityRepository 实例；这些域不加入 ORM 七表 metadata，guard 禁止进入支持域分支。private projection 函数仅在编译产物追加 export shim，不改原文件或函数体。sourceReport 记录每个实际加载 TS 的 raw/LF/compiled hash 与 shim hash；metadataReport 记录实际七表映射，不执行 DDL。

`node tools/rust-r2l1/l-native-adapter.mjs --check` 仅编译八个原 TS 入口；不 evaluate 原模块、不 require ORM、不初始化或连接 PG。它不是实际 service 验收。

## CREATE / COMMIT 观察证据

`createNativeWriteWitness({onCommitted,context})` 返回 subscriber、snapshot、drain、assertComplete、sourceReport。Root 将实例放入 adapter 的 `subscribers:[witness.subscriber]`，在 onLoaded 可取得实际 orm。context 同步提供 runId/caseId/index/op；onCommitted 仅持久化 private journal 的已观察 ID/证据，不查库或自动认领。Source report 列出锁定 core/sql 7.0.11 的 EventSubscriber、TransactionEventBroadcaster、EventManager、UnitOfWork、TransactionManager、EntityManager、AbstractSqlConnection 的原文件 raw/LF SHA。

Root 在 `onLoaded({orm})` 中、任何产品 case 前调用 `witness.assertConfiguration(orm)`，确认 implicitTransactions=true、subscriber 已注册且 base EM 无先前事务。SDK 的 beforeTransactionStart 在 top-level 没有 transaction、nested 传 parent ctx；afterStart 传新 ctx，savepointName 标记 savepoint。afterCreate 在 INSERT 执行并注册实体之后，依据实际 em.getTransactionContext 归入 pending frame。afterCommit 在实际 COMMIT 或 RELEASE 成功后触发；RELEASE 只向 parent 传 pending，ROLLBACK 丢弃对应 subtree，只有最外层 afterCommit 才发 onCommitted。证明含 afterCreate/commit 事件序号和 savepoint release 链；transaction ref 是观察器内部对象编号，不冒称 PG XID/PID。ChangeSet.js 的 CREATE='create' 定义另列为第九件 SDK 来源。

只认证原 UoW afterCreate 和完整观察的 transaction 链。raw SQL / nativeInsert / upsert、无事务写入、观察器中途注册、begin/savepoint 失败造成不完整事件，均不推断 ownership。Root 必须结合已有 intent、真实表与逻辑身份独立认领；未知 commit 不产生证书。callback/事件参数/链缺失或日志界限错误只标 instrumentation incomplete，不向 MikroORM 抛异常改变原 commit/rollback 行为；Root 在实际操作后 await drain 并 assertComplete。已观察到 COMMIT 但 journal callback 失败的证据保留，状态仍 incomplete，不能称安全通过。

`l-native-write-witness-check.mjs` 只模拟精确事件形状，覆盖 nested release、inner/outer rollback、未知 context 和 journal 失败；不执行 SDK / ORM / PG，也不认证真实 CREATE。实际七表 lifecycle 覆盖仍需 Root 原 PG 见证。
