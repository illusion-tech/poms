本件只补操作顺序与字段映射，全部真实 Source13 输入仍为 null；不修改原93/97/108/136/1351/139/140/85封件，不执行 SQL、HTTP、迁移或进程动作。旧93的 H1/refreeze 备选已经由93-02明确取消：最终采用一个不再变化的 H0，加私有外置 runtime binding。

先区分三份观察。`migrationBefore` 是 M97 的完整两库139表原行 SHA/xmin、catalog/sequence/object 快照；`migrationAfter` 是两库正常 M98 完成后的同形快照；`freshCurrent` 是最终108 CLI自己在首次准入期间再捕的一份。136仅产生正常迁移 intent/execution/count原件，不产生完整 `migrationAfter`。108的CLI又要求完整plan已经引用after，因此不能先临时mint一个pending state去补after，再改pending的plan SHA。

现有入口与模板的准确位置如下。这里的 R 是 `/mnt/e/projects/worktrees/poms-r3hijk-next28/poms`，P 是 `/home/wangzishi/.local/share/poms-r4ghi/private`，N 是 `/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node`。Windows读审包在 `E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/`。

- `schema-admission108-02/manifest108-02.json`，SHA53559669…，是108+02最终12份组合；`plan-template108.json`、`migration-receipt-template108.json`、`approval-shape108-02.json`与`README108-02.md`在同目录。plan模板有意 `actualM98Applied=false`，不能直接执行。
- 安装后的唯一schema3入口为 `R/tools/rust-r4ghi/business/retained-schema-admission108.mjs --plan <private-plan> --approved-plan-sha <plan原字节SHA> --execute`。使用固定 N 执行，五个参数按此顺序；没有baseline命令或迁移方向参数。
- 当前1351之后，不能直接覆盖108-02中before08f的consumer。明确组合为：当前consumer6fe5e300… → `process-restart1351/future-source13/.../consumer-admission54.mjs` 5e67049e…；108-02 retained108原95f0254e… → 同future目录的retained108 4e87c065…。其余108-02十份及1351-02/http保留，最终逐文件exact-before复核。原1351 manifest714c…和1351-02 manifest2d926…均保留。
- `snapshot.mjs`公开的是 `capture(ctx,label)`、`readRows(meta)`；没有pre-mint capture CLI。`createContext`属于会持久化state的构造器，不是无副作用的快照工厂。

顺序必须如下。

1. 保持当前Source12/M97/source406/5263及实际1351原标签，先完成或如实保留尾部验收。139/140原sixUI guard不放宽；没有activeFault、blockedObservation、unknown请求、driver/relay或待重放的已提交命令。GH等成功201只按其原件继承，不重POST。
2. 在旧产品和旧context97尚未变更时，按139/140-02受审union运行140。140必须绑定live1351 PID11616/processfd81/candidate1dde/overlay0598，产406成员的真实ZIP/逐成员读回。随后才运行139；它在任何lock/mkdir/stop前复核该140实际完整成功，精确停止1351，然后复制新旧进程/候选/原schema2/准备/state/env/log、双库custom archive/TOC与objects。原135及1351保持分别归属。
3. **M97 before就在这一步实得。**139内部 `capture(ctx,ctx.next('retained139-after'))` 产出的receipt.after，与私有index.retainedSnapshot为同一个完整pin。可把这个原pin原样作为 `schemaAdvance.migrationBefore` 和迁移总receipt.before；108不要求它与retainedSnapshot是不同文件。此选择必须明确标注“复用最后实际M97观察”，并从该观察到M98前禁止业务/认证/额外DDL写入。它不等于凭空补一份fresh。若Root另要独立紧邻迁移的before，应在旧context/source仍有效时用另经审的state-free M97 observer捕取并严格等于retainedSnapshot，不能在换源后调用旧createContext。实际139完成前，任何before pin仍为null。
4. 以139最终index.frozenState/index.retainedSnapshot/index原件作为producer输入，保留旧 `state.baseline`、owned/borrowed/fixtures/objects和所有出生来源。此后不再以普通driver打开旧epoch，不改旧sourcePins，不把context98套到旧state。应用106产品、新M98 TS/SQL及108-02+1351future明确组合；纯FS `sourcePins()`可用，`createContext`、`ctx.client`与DB capture暂不可用：此时DB还是97，而新FIXED.migrations已经98。
5. 组装最终H0（完整business mjs/json，包括仍全null的tax13-bindings模板与最终85→02→03→04代码），冻结工具字节。冻结真实 `docs/design/rust-r4ghi/source13-g2-freeze136.json`：kind/G2Authorized/两库97→98/唯一TARGET/runner29e/固定N实际SHA/TSdaf/SQL90b/排序98迁移输入严格按97审件。审批的 `actualM98Applied=false`是不可变的迁移前事实，不在完成后改true。G2 JSON不引用包含自身的source digest、B0、plan或registry；source数量按最终实际枚举，不预测为406或某个新数。
6. API31441/31442均停、driver停、目标两库无app连接，Root分别执行下面两个固定正常程序化UP。必须保存真实子进程完整argv、exitCode、stdout/stderr，不能用shell字符串或方向标签代替。第一个库完成、第二个未完成时，不运行要求两库98的capture；任何失败/提交不明先停并对账，不盲重试。

```text
N R/tools/rust-r4ghi/migrate-frozen-parent98-136.mjs --database poms_r4ghi_native --execute
N R/tools/rust-r4ghi/migrate-frozen-parent98-136.mjs --database poms_r4ghi_rust --execute
```

7. 136每库输出在 `P/migration98-136/<DB>/intent.json`及`execution.json`。按108-02模板封两个 `captured-fixed-programmatic-M98-command136` wrapper，再封 `actual-normal-forward-M98-migration-receipt108`；各wrapper的runner/node/approval二字段pin直接复制真实intent，stdout.execution必须严格等于executionReceipt二字段pin。只允许一个TARGET pending/applied、97→98、同OID批准body、一登记行、一真实migration-ID nextval；138业务表与原97登记行/xmin、其它catalog/objects不变。
8. **此处尚缺一个实际执行入口：state-free after observer。**受审108-02/136包没有这个CLI，不能在指南中冒称已存在。Root需另封并审一个窄adapter，复用已经安装的 `snapshot.capture(observationCtx,'m98-after-<unique>')` 和 `context.guard`，而不调用 `createContext`。它在独立私有观察目录写wx快照、manifest和自身源码/调用收据；不得创建或读取/重置新旧consumer state、baseline、owned、sequence或pending plan。具体所需ctx字段与DB guard在 `capture-adapter-contract102.json`。两库已98才能调用该adapter；它的产物才是 `migrationAfter`。本件没有实现或运行此adapter，必须在真实136之前把它做成具体可审入口，避免迁移后临时猜工具。若Root已有等价入口，应先给精确原字节pin核契约。
9. 用真实before/after构造总receipt.databases：真实函数OID及前后definition/body SHA、实际新增迁移行key/raw SHA/xmin/name、实际sequence前后元数据。正常receipt与plan.schemaAdvance必须深相同；先离线复核 `verifyM98Transition108`，不得用当前after替换原baseline。after的snapshot label/epoch是观察身份，不是已mint consumer的证明。
10. Root对最终当前源/mirror执行实际检查和build，固定新binary/API136物理PID/start/exe/cwd/env与真实readiness200原件。旧提案535编译不能当当前candidate。仅用纯FS `sourcePins()`与完整helper枚举保存plain数组JSON；检查build/迁移/启动前后源字节稳定。先在 `P/business/g2-business13/main01/` 以不占state计数器的wx文件写新B0：真实epoch/run、完整sourcePins/count/JSON digest、独立新process二字段pin加record、真实ready200及其原件、当前build/source关联。此目录可以已有B0/证据，但不得有state.json、旧candidate复制或虚构registry。
11. final108 plan现在才能封：producer取最终139；schemaAdvance取真实M98总receipt/before/after；consumer取B0、plain source/helper数组pin、新process/binary、非作者impact。digest指针 `/sourcePinsSHA256`，binary指针 `/process/record/binarySha256`。plan.actualM98Applied此时才为true；plan.registry、derivedComparisonBaseline仍留null（由工具产出，不给输入未来hash）。批准final plan原SHA后，执行唯一108 CLI。它先validate全部输入，才第一次 `createContext(...,{admissionPlanSHA256:finalSHA})`，再 `capture(ctx,ctx.next('schema108-current'))` 获得freshCurrent。fresh必须严格等于migrationAfter的两库全部行/xmin/meta/sequence/objects。工具首次pending/sequence都绑定同一个最终SHA，禁止改SHA或重置失败pending来过关。
12. future108验证旧overlay来源及实际old.apiProcess=1351已停，设置新136后将active12 overlay明确quarantine为历史；schema3拒残留active12 overlay。产生R3和单独derived comparison baseline；业务原M97 baseline与owned/borrowed/fixtures/objects保持原值，canonical M98行从不作为HTTP owned清理。
13. R3.consumer.candidateReceipt永远引用B0。另写B1到新ctx.priv，包含同新source/process/真实ready以及真实consumerAdmission；B1.process是同一个二字段process pin加record。供85的current.candidate引用B1，不回写R3/B0。新actor/auth/source provenance必须真实重取；旧1351 actor不是API136实证。现H39/prepare16/generate16硬M97，不经另审不能用作M98 DOM合同。
14. 从原全null模板另写**私有**已批准runtime JSON，current.registry/retentionIndex/retainedProducerState等对象原样copy R3（含原bytes形状），source/helper数组与R3全部强等。business模板始终不填，不改H0、不refreeze、不出现H1。每次85调用显式 `--bindings <new ctx.priv内绝对JSON> --approved-bindings-sha <该原件rawSHA> --phase <unique>`。先`finish-main`，再独立`prepare-tax`并STOP供审；之后另批准`fi-tax`并STOP，再单独`commit-tax`。旧E/F/ReceiverG成功和Main006224失败原件不重放、旧producerComplete不回写。

Pin分工不可混淆：source/helper数组成员是 `{file:相对路径,sha256}`；数组外层文件pin是 `{file:绝对路径,rawBytesSha256}`（可有真实bytes，但深等消费者须按来源copy）；数组digest是 `sha256(JSON.stringify(parsedArray))`，不等于pretty JSON文件原字节SHA。plan.consumer.apiProcess只pin独立JSON，不加record；B0/B1.process才是相同pin加其解析record。推荐这里用准确二字段process pin，避免108 pinOnly去bytes而85强等误断。136的runner/approvedSQL/approvedMigrationSource/stdout.execution等有exact二字段深等，不能泛加bytes。其它registry/retention/frozenState等不应统一删bytes。

完整实际Source13顺序没有回边：最终代码/H0+freeze136 → M98 before/正常UP/after → 新136/build/ready/B0 → final plan → 首次108 fresh/R3 → B1 → 私有binding → 分离Tax阶段。guide只发现并明示pre-mint after adapter缺口；不授M98/Source13/G3/G4，全部新实际值仍null。
