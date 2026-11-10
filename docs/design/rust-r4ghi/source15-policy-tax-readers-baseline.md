# Source15 policy、角色、Labor与Tax readers联合代码基线

- Gate Status: `Pass`，仅代码范围；实际G2未授权。
- Parent: #114 / #110；关联 #112 / #117 / #118 / #119。
- Owner: Root；作者H；非作者G1复核Final。
- Slice Type: 高风险验收工具继任与只读消费边界，新增业务操作0。
- Date: 2026-11-11（Asia/Tokyo）。

## 1. 精确范围

联合生产9个ADD：`file-scope-H15.json`的五个business H3继任叶、`policy-role15/setup-role15.mjs`及其空input template，以及consumer ABI v2列明的两个外置 `tax15-readonly/runtime15.mjs`、`facts15.mjs`。没有MOD或删除。旧14、严格257的完整13条件、旧287及原role-fixture47保护依赖保持原字节。

本片H3只贡献5；#119核心贡献4。218＋4＋5＝227只是已知子集，最终图必须在实际publish前联合冻结、测量，不能先登记再热添。Node工具不当Cargo输入。验证仅在 `tools/rust-r4ghi/policy-role15/tests/` 与 `tools/rust-r4ghi/tax15-readonly/tests/`，不进入H3或9生产叶；必要非运行证据另存作者目录。

不实现 #118 的六叶执行器、prepare/facts、四个外置caller继任或真实Tax/H46/Role/Labor操作。`consumeTax15Completion`由Root另冻#118实现，本片不可增加第十个生产叶来替代它。当前所有实际新15绑定与目标仍为空。

## 2. 正式输入

- H15方案：`c3a283634efafed9da5a85f2a13653463da7cf07689dbae8ef94ba6ce907877d`，五H3及两Role外置的唯一逐文件表。
- consumer方案v2：`4e858ddbe0a2a6f2ed471d26874e9ce2c05992ebf70a4d4ee49f97938555069e`；唯一消费ABI v2：`8c0b22d4cede59f13a27961f9760b758d4400b3318f74e050aeac11312e3dffb`。
- 非作者联合建议：`e859d74dbed32a8697d7e200a663bc9c06729718b42372997e2370c277449efa`；#119核心ABI仍为`91f4fcf8a267a772f835de5c3ae03042a299341ed360c0606a0792f86e82c45b`。
- v1/旧14接口及WIP保原标签。v2明确覆盖H15旧pending措辞；不把旧14 reader或WIP当作已完成的新15实现。
- 业务语义、权限、金额、日期、M98及历史预算沿原联合G1和用户裁决；本片无公开路由、DTO、OpenAPI或DDL变化。

## 3. 固定消费与代际

只接受真实三参API：`consumeTax15Completion(ctx,{consumerId,consumerInput,registration})`，三个键精确匹配，不注入callback、reader或alias。闭集为 `h15-287`、`shared15-284`、`period15-270`、`mixed15-271`、`role15-setup`。

Role必须使用自己的完整input pin及registration，不能冒用H46输入或ID。Labor若只读验证Tax/H46前置，只能复核真实上游H46或Role原input及该input自己的registration；不能发明第六ID，也不能把Role input当Labor input。registration只证明消费关系，`effectsGranted=false`，不授API或SQL效果。

284必须按新15字段逐项映射精确12键，helperH3与codeAdmission15不退回旧别名；baseline负例不因通用消费机制平添Tax前置。mixed先核原period completion指向的真实verificationInput及它自己的登记，再核mixed当前登记；两登记独立而共同Tax/sidecar必须一致，不冒称mixed执行了period。

Source13 partial、Main13真实201和retainedThrough14分代清楚。H15只续做真实新15 equal/above等后续步骤，不把旧13缺失步骤补为已执行。当前角色权限必须来自真实认证和实际permission rows，旧缓存`[]`不代表否定事实；fresh完整Labor范围必须在实际period/mixed之后重取，不沿用旧小目标集。

## 4. F、completion及sidecar的证据协议

按v2，normal真实201原件、reconcile、完整postconditions、exit与closed journal完成后才封immutable afterVerifiedFrame（F）。F包含真实完整ownership state原字节副本、完整D15 ownership.jsonl原字节副本、ordered command ledger及实际FI/normal/观察/entry-exit和current15元组，不能引用自身或后续completion/sidecar。

固定单向顺序为F → completion(C，引用F及实际FI/201) → sidecar(S，引用C及同F) → 最后state metadata登记C/S。`sweep.afterVerifiedFrame`、`completion.afterVerifiedFrame`、`sidecar.afterVerifiedFrame`必须同pin。孤件不是complete；中断只核原件，不自动重POST。

native以F和原始HTTP、ledger、snapshot/raw/xmin及ownership log验证历史归属，不构造替身ctx，不要求后续合法变更后的`owned.latest`等于历史行。遵守真实记录形状：ownership log没有xmin、borrowed没有latestXmin、ledger没有status；不得臆造字段或将verified布尔代替完整证据。当前只验证实际Source15代码/API/登记与正确C/F关系，绝不将旧14 guard或13实际桥贴成新15生产。

## 5. 验证与G2留白

实际测试必须调用本片生产函数：五ID严格选择、真实12键转换、独立period/mixed/Role登记、缺失/篡改/代际错误/注册自环、完整FI及201不全、F/C/S错配或回指、后续合法row变化、角色fresh权限、完整Labor漏项及mask/audit边界。旧模块未改的语义和严格13条件需回归；代码差分逐原件登记。

Syntax、相关Node默认测试、所有模板为空及有限import/source闭包核验必需。真实Reg5/B1、Tax完整FI/201/F/C/S、H46、角色设置及fresh Labor均是后续实际G2/验收，不用synthetic替代。发现新增文件、ABI变化或旧范围不足，先报Root冻结有限增量。

无放宽例外。只有Root冻结JSON、线上G1读回与Root派发后才可在H独占目录写这9叶和外置验证；不能改Root/H2/真实state，不能createContext或实际API/DB/服务操作，作者不得Git/Issue操作。Root推广、Source15实际准入、业务G3/G4均未授，新增认证0，#57及完整R5 #116保持开放。
