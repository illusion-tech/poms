108 是 Source12/M97 保全之后、Root 正常前向 M98 之后使用的独立 schema3 准入候选。作者未运行迁移、SQL、HTTP、服务器或 Root 写入；当前真实 Source13、迁移执行、retention、进程与 registry 输入均未确定。模板中的这些字段全部为 null，且 actualM98Applied=false，不能直接执行。未处理待用户裁决的历史选包。

与 draft108 一致，保留 state.baseline 的原 M97 私有 pin。derived-schema-comparison-baseline108 从原基线复制，仅改变已经逐对象核实的函数/序列 metadata 和 poms_migrations 表指针；138业务表及原 objects 指针不变。原有业务 owned、borrowed、fixtures、objects 与来源标签不变。poms_migrations 的实际新增 M98 行是规范登记，不是 HTTP owned fixture，不进入删除或 borrowed 恢复授权。

已读真实 snapshot.mjs：函数字段为 proname；迁移表列为 id/name/executed_at；id 的真实 default 为 nextval('poms.poms_migrations_id_seq'::regclass)。函数验证还要求 pg_get_functiondef 的非 body 部分完全不变，防止只比 body hash 漏掉 language/return/其他函数属性。原 OID/owner/ACL/prosecdef/proconfig、全部其它函数、表、约束、索引、trigger、roles/memberships 必须完全不变。

Root 集成顺序：

1. 先完成或如实封存 Source12 真实 UI/Native/HTTP 观察，确认无 activeFault、blockedObservation、cleanup 及运行中的原 driver；私有保留最终 state、完整 source、双库 archive、对象和进程停止原件。旧 producer 事实、回执、sourcePins 不修改。Native92 的17个真实422与独立 cleanup92-02 原件仍属于原阶段。
2. Root 另行批准 G2/M98 注册并通过原有正常迁移入口执行。前快照必须与最终 retained Source12 的两库139表行 SHA/xmin、全部 meta/sequence、objects 相等。迁移后只允许同 OID guard 的批准 body、一条实际登记行、实际迁移 ID sequence 的单次推进。失败迁移额外消耗序列或其它差异均不在本候选授权中，工具会拒绝，不能改成宽松漂移规则。
3. 依 migration-command-template108.json 保存每个真实迁移命令的 argv、exitCode、方向、唯一迁移名、stdout/stderr 原件 pin，再依 migration-receipt-template108.json 封双库实际 before/after 和每对象精确差异。它们是 Root 实际执行的规范收据，不可由模板默认值当作已执行；wrapper 与单命令原件逐字段一致。候选工具只读取这些收据，绝不执行 migration。
4. 在 Source12 保全后按逐文件 beforeSHA 应用 proposed 中11个工具文件，旧 retained-admission54.mjs 不改。context.mjs 的 future M98 门禁及 directFiles 新叶是 docs/design/rust-r4ghi/g2-frozen-participant-parent-lock65.sql；注册 TS 由现有 migrations walk 自动进入。若 Root 最终 canonical SQL 路径不同，需显式重封该 context 小差异，不能静默跳过源 pin。source count 动态取实际完整数组，不沿用406或预测新数量。
5. Root 完成 Source13 产品/Native相关检查、新二进制/API物理 PID/start/exe 及新候选/摘要入口绑定。填新私有 plan-template108.json：producer 指最终 Source12 frozenState/retention/snapshot/priorRegistry；consumer 指真实 Source13 的完整 sourcePins、count/digest、candidate 指针、binary、process、全部 business mjs/json helperPins 及非作者 impact review。所有旧证据组必须保持原版本，review 不授当前候选执行认证。actualM98Applied 只有在实际迁移收据成立后改 true。
6. Root 审核完整私有 plan 原字节后，仅在新 epoch 新 state 执行下列入口。工具检查旧 API 物理进程已停、新 API 真实绑定及新 helper 图，借现有 namespace/DBOID/PG15/M98 guard 做新只读快照。它要求 migrationAfter 与当前 fresh 全行/xmin/meta/sequence/objects 相等，复算派生比较基线，以原 owned/borrowed 核 fresh，再新建 verification/derived baseline/registry3 与 consumer state。旧 state 不写，无 HTTP、DML、迁移、restore 或进程启动。

```text
node tools/rust-r4ghi/business/retained-schema-admission108.mjs --plan <Root真实私有plan.json> --approved-plan-sha <该原件rawSHA> --execute
```

新入口的返回值明确 retainedSnapshotEquivalent=false、exactApprovedM98AdvanceVerified=true；并非沿用54全目录等价。schema3 binding 的原 baseline 必须同时等于 frozen Source12 state.baseline、其原 priorRegistry.originalBaseline 与新 state/registry；一起重指当前数据也会被拒绝。旧 Source10/11/12 的 EO/Own/Creator/Legacy/A05 项目依原 chained registry 保留真实 birthSource、retainedAt 和 published receipt；四个既定 UI observer 字段仍是唯一 immutable producer overlay 例外。

共同 API：loadSnapshot(ctx) 继续读原 M97，仅 loadComparisonSnapshot108(ctx) 读已完整核实的派生 pin。ledger.assertRecorded、cleanup 的规范/差异比较使用显式 comparison reader；business original 借读、beforeAbsent、business-number 和旧行恢复继续使用原 M97。schema3 读取会重核迁移收据、完整快照差异及 derived 构造结果，无 top-level I/O/await。M98普通空 state 不可走 baseline 重置，必须显式 admissionBootstrap。

G4 cleanup 仍按实际 owned 精确PK/完整行SHA/xmin、foreign refs、原 guard/RI、对象字节及 borrowed 列白名单审查。M98 cleanup plan 使用 schemaVersion2，同时列 originalBaseline、comparisonBaseline、schemaComparison108；canonical M98 行不删。清理后比较目标是“原业务基线 + 已核 M98 规范差异”，不能宣称全部 catalog 回到 M97。旧 cleanup 对 borrowed 恢复仍只声称逻辑行一致，不声称恢复原 xmin。

边界清点：creator-ownership.mjs 的显式 migrations97、Native92/92-02 的原 phase/旧图，以及其它专案 SourceBases 均未顺手放宽；它们不因为新准入自动可重跑。需要重验的新命令由 Root 明确重新 source-bind。旧 API133/134/135 证据保持原标签，不算新 API/Source13 实测。当前 source13 的期末历史选包政策不在本候选内。

验证为 Node24 纯/FS/语法检查，合成输入没有业务 authority。旧18个54/62纯回归保留，新增覆盖精确函数 header/body/OID/ACL、139表/97原迁移行/xmin/单登记/单sequence、objects保真、派生基线不可整体重置、wrapper原命令一致、ledger业务归属和10→11→12→13混合出生/晚发布证明。首个冗余 NTFS 合成文件运行被作者停止，原不完整记录保留；后续路径冲突的合成测试失败记录也保留，不计实际准入。
