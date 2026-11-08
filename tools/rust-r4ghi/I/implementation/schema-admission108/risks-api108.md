108 草案方向成立，但必须使用显式 schema3，而不是把 migrations 改98后继续宣称 retained54 全目录等价。本文仅冻结最小接口方案；真实Source13/sourceCount/binary/process/retention/M98收据/registry均未填，未执行SQL/HTTP、未改Root。

具体风险如下。

- state.baseline若替换为当前数千行，会把本应由真实HTTP owned证明解释的行洗成original；G4无法再精确删除。原M97 pin须永久保留，138业务表与objects的基线文件指针也须保持原样。
- poms_migrations本身是139表之一。仅把meta函数/sequence改掉，ledger仍会把正常M98行认作unowned Native/Rust漂移；整表豁免或给它generic mutable/borrowed又会放任日志篡改。必须验证97原行SHA/xmin全保，精确新增一条批准M98登记，派生比较基线仅对此表采用已核结果，标为canonical schema advancement而非HTTP fixture。
- 函数只准同OID的已批准definition/body变化。schema/name/identity arguments/owner/ACL/prosecdef/proconfig及其余函数数组全部不变；不能删definition后说catalog相等。after PL body须匹配批准SQL body；所有其它目录、约束、trigger、roles、memberships、OID和对象仍严格逐字比较。
- sequence只准实际迁移登记ID所用的、源default_expr有据且收据证实的变动；必须列before/after，没变不能替换，更不能覆盖所有sequence。普通forward单次登记以实际证据核一次推进；失败迁移额外消耗不在本窄准入内，须另审。
- retained54现在全meta/139行等价，consumer54与readAdmittedContext hard97，registry62只认1/2且entrySource62只在schema2保birthSource。仅加一个schema3值会错误重标10/11/12出生来源。链判断、sourceHistory、receiptProvenance及四UI observer overlay须一起保持。
- 不能让snapshot.loadSnapshot默认从原基线悄悄变成schema比较基线。新增显式比较reader供ledger/cleanup使用；原business借读、owned firstProof和原行恢复仍锚原M97。cleanup计划需同时标原pin、比较pin与schema证明，不能用老baseline标签掩盖新catalog。

冻结的最小共同API与改动边界：

| 文件 | 共同接口/行为 |
| --- | --- |
| 新schema-comparison108.mjs | verifyM98Transition108：纯验证retained12==migrationBefore、before→after精确函数/登记行/sequence差异、after==fresh。deriveComparisonBaseline108：从原M97只替已核meta项及poms_migrations指针；verifySchemaBinding108：同步FS读核完整证据链与派生结果，无顶层I/O/await/权限mint。 |
| snapshot.mjs | 新loadComparisonSnapshot108(ctx)；原loadSnapshot(ctx)语义保持M97原件，显式比较reader只在合法schema108绑定时返回derived pin。 |
| context.mjs | future正常M98后才用98门禁；Source13新空state必须走显式admissionBootstrap，不得普通baseline命令把retained业务当original。namespace/DBOID/角色/物理进程/G1不减。动态sourcePins，不硬编码count。 |
| 新retained-schema-admission108.mjs | 独立schemaVersion3入口；retained-admission54旧1/2全目录等价路径原封，不用同一equivalent标签接受差异。先实证delta，再以原owned/borrowed解释fresh，mint schema证明/derived baseline/registry3。state.baseline保持原M97，增schemaComparison108绑定；owned/borrowed/fixtures/objects与出生标签逐值不变。 |
| consumer-admission54.mjs | schema3必须校验schemaComparison108、98与registry/current state互绑；1/2只用于97。readAdmittedConsumerContext从已验schema绑定读98，不靠未验字段抬级。 |
| registry-lineage62.mjs | chained判断统一为2或3；prior原registry pin不变，sourceHistory/birthSource/retainedAt/receiptProvenance沿真实10→11→12→13，不能把schema3当schema1。新registry3再绑schemaComparison证据。 |
| ledger.mjs | assertRecorded仅规范/全表差异基线改用显式comparison reader；business original/borrowed授权保持原M97，不加migration mutable表豁免。 |
| cleanup.mjs | 规范比较与after-cleanup/fresh用comparison reader；计划同时列原/比较/schema绑定；M98canonical登记不进fixture删除清单；原138业务行恢复及borrowed exact规则不变。 |

准入证据顺序：Root先完成/如实封存Source12与Native并清零临时影响，停止旧API，保私有原state/source/archive/object；正常前向M98前后采双库完整快照与真实迁移执行收据。新工具只读核这些原件，不执行迁移。新Source13/API实际PID/源码/候选/摘要入口全部实证后，在新epoch新state生成metadata-only registry3；保旧97 baseline与源链，只把规范差异放进派生比较基线。旧FI/UI/actor/Common/Native证据保持原版本，通过明确impact引用，绝不授Source13执行认证。

方案不涉及尚待用户裁决的历史选包，也不把safe90现有来源核验改成自动重选预算。当前仍M97/API135，不把本计划当作M98已应用。
