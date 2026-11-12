# Runtime121 纠正361代码输入

纠正输入已由 Root 冻结，独立设计结论为 `design-ready-for-corrective361-code-only`。本页承接[实际失败检查点360](runtime121-real-prepare-G3-checkpoint360.md)，不新增业务 G1。

唯一机器输入为 `tools/rust-r4ghi/runtime-recovery121/corrective361-g3-freeze01/Root-G3-code-input361.json`，4167 B，SHA256 `820f727595c37cbe7eae6aa53ff3b9606ae6f0922be237f63fb8eb26f534ae07`；其中固定原始 core/schema/baselines 与独审件的完整 pin。原 M06 和四旧源已在私有 a226 manifest 下保全。

允许修改四个既有执行叶：Tax `invocation-proof.mjs`、Native `runtime-admission-core121.mjs`、`runtime-admission121.mjs` 和 `publish-runtime121.mjs`。两个既有数据适配点为 Native-plan 与 Tax prepare metadata producer，均位于284执行图之外。成员保持 helper229/external55/execution284，四个实际 raw hash 按新 overlay 登记，不能宣称旧图未变。Rust420、compile528、ELF、Root8、A7、其余Tax7和业务逻辑均不在范围。

冻结条件包括：

- Pin3 只作文件引用；匹配 Facts6 后核真实 stat/bytes/hash。失败书挡写入已验证所有权的 nonce 目录，严格 wx，不消费全局序号，不覆盖旧26。
- 原 M06/原9阶段与四项 MOD overlay 分开验证；其余280项 old=new 且当前 raw 相等；导入前验证完整新图、自身及两阶段 manifest/review。
- v1 首次绑定保持原样；v2 plan 保留顶12/base18/current13，stateTransfer4、successor12、sourceWitness13。真实 CAS 为私有保全的32bd，原4c codeParent不改；Root12与peer7、registry/candidate/lease wire1、Tax34/runtime17均不扩键。
- successor 只替换 lease、完整 history 前缀后追加一项、归档并移出活动失败 Tax 槽。823失败 journal 原处保留，actors/sequence/api/ownership及全部其他值保持。
- 原API启动记录与旧helper图保持历史原字节。新client helper图只经具名四项差异 witness 承接；服务源码、编译、ELF、Root8、环境和所有实际进程/socket校验继续执行。

当前只授代码实施与有界模型、文件回归和独立代码审查。Root生产源提升、状态 handoff、实际G2、重试、API/PG控制仍为 false；各步必须形成具体实证后另行精确批准。仅Root可写实际源与运行环境，子代理只在I候选目录交付。

业务G3/G4未通过，新认证0；#57及完整R5 #116保持开放，#119历史技术G4/CLOSED保留。
