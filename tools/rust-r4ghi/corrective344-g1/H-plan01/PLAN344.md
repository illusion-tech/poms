# 344 两叶纠偏的只读实施方案

本件为作者方案，不是实现许可、产品候选、实际准备结果或 Gate 通过证据。Root 的 344 checkpoint 仍为 Block。所有产品 after、Source15 准入和实际目标集均未产生。

## 固定输入与有限改动面

固定 Root 源码及 checkpoint 的实际字节见 `source-witness344.json`。生产候选只拟改 `project_operating/restatement.rs` 和 `project_operating/context.rs`，回归仅追加在这两叶。`store.rs`、`sources.rs`、`late_allocation.rs`、`inclusion.rs`、预览哈希、公共 DTO、路由、M98 和 H2 保持原样；若实现证明此边界不足，先报告，不暗扩。

## 1. 自动根只作 AllocationResult 的 caller 投影

`scope_roots_with_session` 已持真实 caller project；将其传入同叶的 `inferred_late_roots`。在自动根集合增加一个局部谓词：对于 `SharedCostAllocationResult`，由完整 Catalog 中该实际行的 `project_id` 证明其属于 caller；其它 kind 沿原规则。不能以 reference 中额外自报字段代替实际行。

过滤只作用于 implicit roots，`selected` 显式根仍在之后原样合并、冲突校验和去重。`changed_sources`、完整 Catalog、store 的全 peer/祖先加载、旧/新批次 impact graph 和 affected-state 的 cutoff 规则均不改。真实 foreign Cost / Tax / Stage 依赖不会因 foreign 标签被整体过滤；Stage249 当前父项规则和 Tax 独立 manual 来源规则也不改。

因此未变的 peer-only AllocationResult 不再因其未被 caller 旧快照投影而自动成为新根；caller 自身新增或变化的结果仍可经原 impact graph 驱动完整批次及跨项目发现。显式 foreign result 仍可进入原 whole-batch 图。不能预先断言实际 5 目标必然减少为 2；其它真实自动根须独立枚举及新候选读回。

## 2. Restatement 的有证明整批 cutoff 分类

用 context 内一个私有共享分类函数替代 `allocation_in_window` 布尔用途，返回 `InWindow` / `FutureBusiness` 或错误。预览 `source_rows` 与正式 `build` 必须调用同一分类函数，输入为同一真实 Catalog、result、business cutoff 和 window 的真实 knowledge cutoff。

1. 检查真实 basis 存在；收集该 basis 的全部 AllocationSource。空集合报错。
2. 完整扫描所有成员的实际 Cost 与业务日期，积累是否含 future。缺 Cost、缺失/错误日期报错；不能遇首个 future 就提前返回，成员顺序不能影响结果。
3. 全部真实来源日期在 cutoff 内时，返回 `InWindow`，保持原 Restatement 准入及后续 qualification。不会把 FirstPeriod 的 policy2、ancestor 或 knowledge 规则施加给合法旧 in-window 分摊；真实 oldF81ab/d25 与 Cost814/Nov7 是待验证的固定正向来源，不能改其生成时间或旧证据。
4. 发现任一真实 future 来源时，只有现有 `late_allocation::qualify(catalog, result, cutoff, knowledge_cutoff)` 完整返回 `Qualification::FutureBusiness` 才返回 `FutureBusiness`。其完整 peer、source-set、治理证据、版本/更正链、currency、份额与净税守恒验证只用于授予“排除整个未来批次”的证明。若返回错误或与日期扫描不一致，保持 hard block，不能降级成 outside 或继续跳过。不得复刻或削减该函数内部经济校验。

该取舍刻意是保守的排除门槛：证明不足的未来候选继续阻断，不会借排除路径吞掉坏事实；它没有新增一条 Restatement 接纳路径，也不把 FirstPeriod 专属规则作为所有合法 late 批次的准入条件。此具体取舍仍须 Root / Final 在实施前明确接受。

预览：`InWindow` 保留原 `late-produced-allocation-full-in-window` 语义；有证明的 `FutureBusiness` 显示 `outside-business-cutoff`；分类错误显示现有 `source-basis-unverified` 硬阻断，不伪造 eligible。正式构建：`FutureBusiness` 在任何 registered-cost、decision、金额或 source 列表累计之前整批跳过；`InWindow` 沿原路径；错误原样阻断。不能捕获 `qualify_cost` 的首个 outside 错误再当作完整排除证明。Realtime 和 FirstPeriod 两分支原样。

`window_for` 的 Restatement 保原历史 business cutoff，但 knowledge cutoff 为本次真实 `clock_now()`，不是回填旧观察时间。本方案不调整时钟、来源日期或 expected hash。现有完整 source refs / rowVersion / payloadHash 及锁须继续约束预览和正式采集；若实现需依赖原 CAS 未覆盖的额外可变元数据，必须在编码阶段报阻点，不擅改第三叶。

## 必需回归与真实读回边界

- peer-only result 内部出现但未变：不增加 implicit root；不能以删 Catalog peer 达成。
- caller 自身 result 新增/版本变化：保留 root，沿原批次扩展到全部项目。
- foreign Cost 真变化、合法 Tax 依赖、显式 foreign result：保留完整影响；Stage249 和历史 traversal 不变。
- 合法 late F-create 及 replacement，所有费用在 cutoff 内：保留原 Restatement 路径、真实生成时间和完整来源；不受 FirstPeriod policy2 新限制。
- 混合批次有一个真实 future：完整证明后整个批次排除，不裁成员/份额；preview 与 build 分类相同。
- empty、缺 member、缺 Cost、缺 peer、坏日期、坏 evidence/hash、错误版本/币种/净税/份额、缺 ancestor 或 knowledge 不足：不能被 future 分支静默排除。
- 顺序反例：future 成员在前、后续缺 Cost；互换顺序后必须同样阻断。另核删除物理成员但 frozen source-set 仍声明该成员时不授予排除。
- 保留原 249 / 83 / 298 的相关纯回归标签；新增两叶回归必须实际调用生产谓词/分类函数，不只复制模型。
- 新候选按 Root 独占隔离树完成 fmt、严格 Clippy、必要单元测试及 build；原公共产品未改，不重复其无关 JAR / SDK / Admin 验证。

本件只完成固定源码的静读和方案封存；未运行 Rust 测试、实际 prepare、FI、Tax/Main 命令或任何服务。Source15 需另 G1/完整身份、真实进程及双库守恒；最终实际目标及其它根仍须完整读回。原 Source14 / Reg4 / B1 / H2218 / 341 失败全部保留原身份，不热换、不重发。
