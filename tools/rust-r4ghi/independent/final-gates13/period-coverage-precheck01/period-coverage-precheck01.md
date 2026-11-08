本轮前置结论：仅完成 Tax live-only 全目标，再完成 Receiver 真实 W45 期末 create/read/FI 和 current 守恒，仍不足以覆盖冻结 G1 的真实期间重述及 period/current legacy-modern authority 竞争。未签 G3/G4，新增认证仍为 0。

冻结依据为 acceptance-plan01 的 A06 四条及 transactionAndConcurrency；输入 SHA、原文和逐项定位见同名 JSON 与 fixed-input-readback01.json。impact193 仍仅批准 18 组历史证据按影响引用，currentConsumerCertificationGranted=false；Source13 实际 build/M98/B0/B1 事实不替代业务验收。

| 缺口 | G1 必验性质 | 当前计划的边界 | 最小补验 |
|---|---|---|---|
| PC01 真实 period restatement | A06 明确要求每个适用 live/period endpoint 重述、原 period root/证据不可变 | 206 只创建新 period，读取时明确要求 latestRestatementRef=null；未调用 createOperatingRestatement | 与 PC02 合并：在真实 period 已存在后，用一次有真实业务依据的 F 修正重述它 |
| PC02 一次共享来源修正覆盖完整 live+period | A06 明确完整共享批次、所有受影响项目/输出；同时适用两类终端时，同一命令不可只做 live | Tax13 明确拒 period；先 Tax 后新建 period 是捕获修正后的事实，不能证明修正已发布 period | 新鲜 source/CAS/哈希、服务器全目标、全部项目授权/锁；完整必要写族 FI 回滚，再一次同体正常提交，读实际新旧链 |
| PC03 period/current legacy-modern authority 竞争 | transactionAndConcurrency 明确列项，要求实际锁或 controlled barrier；A06 要业务冲突早于 unique error | current 不回退、顺序 409、旧 legacy 403 scope 工具、stage correction vs realtime capture 均不是该竞争 | 另行受审的有界 owned 兼容/并发场景，实际覆盖 period 与 current/baseline authority 两个断言；只要一个调度确实覆盖两者即可合并 |

这里的“必须”是冻结行为和并发用例；“一次新的 mixed-target allocation 整批 replacement 或真实 stage/tax successor + 一次有界 authority 调度”是减少新增操作的验收建议。G1 没要求完整笛卡尔组合、双方先后顺序各跑一遍，或新增 legacy API。若 Tax 执行当时没有适用 period，live-only 本身并不错误；但它不能替代随后仍欠的期间重述验收。实际期间目标数量必须由真实来源/业务截止和服务器反查决定，不能预言每个共享项目都有 period。

产品现有 service.rs:321 按每个 target 的 periodRef 选择 live/period；restatement.rs:632–650 精确比较完整 targets；preparation.rs:83–113 返回真实期间锚点。补验沿用现有 API/DTO。工具则仍有明确界限：Tax13 sweep:22、shared-source-inventory58:19/23/39、GH facts:59–61 拒绝期间/混合范围；不能删除断言、剪裁目标、重用旧 live 库存冒称期间 FI。206 是待准入提案，16 pure-FS 记录不等于任何实际效果或本审查的工具批准。

最小安排：保留 Root 当前真实 live Tax；206 真正完成 Receiver 自然 W45 期末后，再根据真实在窗来源选择一次受控整批 allocation 调比（例如 2:1→1:1），或有合法证据的 F stage/tax successor（不得重发已经成功的 POST，不得为测试捏造修正），重新准备完整 live+period 目标及必要族，做实际一击回滚/同体正常提交与公开 restatement detail/list、各新 snapshot、原 period/latest-restatement 读取。保持期间原业务窗口、原 period 行和冻结 payload；只允许协议明确的 predecessor status/CAS 元数据变化。混合重述会正常推进 live successor 与 head CAS，期间 successor 不得抢占 live current；这与 206 创建期间时的 current 原图守恒是不同断言。

206 明确输出新 period targets 并要求重新准备 H47；若随后又新增 mixed-restated 输出，H47 也要在全部新输出之后按完整 scope 复核。先于 206 的 H47 不能自动涵盖尚未出生的期间。敏感 GET 审计、raw null/projection、H 下游和必要写族仍依冻结矩阵逐项交证。

本轮未读取活 state、216 captures 或任何当前效果包；无需这些数据即可判断计划缺口。后续 fixed captures/真实准备才能判适用 targets、版本和源证据。MAX 保留的一分溢出负例及 Receiver 资格来自 Root 明示交接，未读取其现金行、未将 MAX 当期末正向夹具。旧 Source11/12 结果保原标签，不推断已有 period 实测。

32 HTTP 范围不扩展，正式 Rust240/新增认证0；G3/G4、main、部署均未批准。

整批调比已由冻结 DTO/产品支持：AllocationCorrection 要求 basisRef、完整 sourceCostRefs、projectShareItems、reason；每份 share 含 projectId、exact allocationWeight、expectedCurrentResultRef 和 reason。F correction.rs:235–254 调用真实 batch producer，370–386 显式采用新权重，883–920 核完整项目/来源/旧份额 refs。Root 已选择后续实际整批 2:1→1:1 路径；本审件只核其支持范围，没有执行。必须按真实层/币种/measurement 验新份额精确分配和总额守恒，不能仍要求每项目旧金额不变。它与 stage/tax 隐式刷新保原权重是不同受支持语义；后者仍由实际 Tax 证据单列。旧 correction-preparation37:35 又要求四种 producer 都非空，也不是最小 allocation-only mixed adapter。

legacy-current-contract 是 G1 source manifest 的正式成员，明确 source0 不能无准入晋升，baseline 要 project lock 跨 producer 查询，period 跨 producer 同 key 检查。当前查到 legacyCompatibilityFixture writer 的明确授权仅一条 owned 缺 ownerOrg 项目用于 scope 兼容负例，不写 baseline/period authority；不能从此外推新 authority seed 授权。Root 已澄清 legacy-bindings 是未验证的路径猜测。本轮结论为【现工具/既有 seed 范围不足，需另封明确 G2 负控 fixture 协议及独审】。Root 拟在既定 G1 必验范围内另审 isolated owned 真项目/头先锁、准确 source0 新 PK/列/原件、真实 modern HTTP 等待；winner 提交后仅清精确新增 PK 回 S0。该设计未审前不执行，本次未批准 writer 或 cleanup。保留 actual legacy seed 负控与真实 Rust HTTP 两种证据标签，禁止新 Node 指向 RustDB、跨库混用、迁移/重标旧 legacy。
