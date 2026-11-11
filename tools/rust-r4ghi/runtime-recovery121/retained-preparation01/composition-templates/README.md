# Runtime121 composition templates 01

这是 H 的纯 FS 作者候选，不是实际 composition、SourceSafety 审件或执行输入。所有原 A11、组件、独立 step 审件与留存 map 均只读，没有读取 env 或业务 state 内容，没有执行 helper/Native，也没有向 Root/P 写入。

输入固定为 A11 `a11dbaa8…`、Root 三组件 step 索引 `d70a73ed…`、I03 `9467b5bc…`、H03 `f3933122…`、Root8 `f83e1e6c…`。独立 step 分别为 I `274f4ebe…`、H `8816ac8c…`、Root `687b6a15…`，逐 frame 保留真实 componentManifest、productPointer、technicalG1 和 independentReview；这里只核对这些已存在审件的身份和有界条目，不重审自身产品算法。

| 文件 | 用途 |
| --- | --- |
| `helper-composition121.template.json` | Native 同形 H3 composition；11 个 frame（2 ADD、9 MOD）；真实 `baseHelperPins` 指向原 227 pin `1d88950c…`，`finalHelperPins:null`。 |
| `external-composition121.template.json` | Native 同形 external composition；完整原 45 个 `baseSources`、30 个 frame（10 ADD、20 MOD）；`finalSources:null`。 |
| `plan-composition121.template.json` | plan.composition 的原三键；两个未来 composition pin 为 null，三份独立 step review pin 为原件。 |
| `expected-helper229.json` | A11 派生的预期 229 descriptors，仅用于实际度量后的全集合比较。 |
| `expected-external55.json` | A11 派生的预期 55 descriptors，绝非已经度量的 finalSources。 |
| `expected-execution-sources284.json` | 预期 229+55 完整 Root 绝对路径，两键 pin、UTF-8 排序；不是实际 tooling executionSources 的认证。 |
| `checks-composition-templates01.json` | 作者 FS/模型检查和固定只读输入 pin；不是非作者批准。 |
| `assemble-templates01.mjs` | 只读固定元数据与候选源码、只在本目录 `wx` 生成候选的脚本。 |

每个 frame 严格九键：`file/operation/beforeSHA256/afterSHA256/candidate/componentManifest/productPointer/independentReview/technicalG1`。脚本只从固定 Core/Native 源码提取有限数据 literal，检查实际 keyset 和 finite path 集合，未 import、eval 或调用它们。41 个候选原字节及其产品 pointer/step 条目已逐项核对；完整 229/55 集合重建与 A11 逐值相等。A11 原集合本来已符合 Native UTF-8 排序，没有 order-only 转换。

`external.protectedDependencies` 严格七键，绑定原 #120 code02 `1570b718…` 的 `/protected261GenericDependencyOnly`、两项固定旧 source、`3b724ea1…` 私有 map、H `42226f43…` 设计审和 Root `4ce7369f…` append。两项只读依赖没有变成新产品。原 base-spec `da64371a…` 仍是 Native 的完整 18 键，没有往 base 增添 dependency 或 actualExternalFacts 字段。

Root 后续必须按自己的 SourceSafety/批准流程逐文件实际度量完整 229 helper 图与 55 external 数组，使用新 `wx` 文件、读回和真实 pin：

1. 比较实际度量结果与本包预期集合；任何差异 STOP，不从预期数组反向填造实际结果。
2. 在新完整 helper composition 中填入实际 229 pin。在新 external composition 中将 `finalSources` 填为实际度量 55 数组；不得增加 `actualExternalFacts` schema key。
3. 将两个完整 composition 文件各自 `wx` 保存并读回，再以真实 pin 填 plan.composition 的两个 null 槽。三份 review 与其 frame 绑定原样保留。
4. Root8 在 A11 中是已交付、只验证的 8 项，不重拷；I9+H24 的 33 项推广由 Root 自己单次执行。所有物理 precondition、保护叶与实际后图由 Root 重新验证，本模板不取代这些 guard。
5. 最终完整 composition、plan、API 和实际 G2 另行独审。组件新 revision、Root8 新字节或审件变化须另建 edition，保留本包。

本包 manifest 的 `futureActualExternalFacts:null` 只是输出来源待填说明，不是 Native 输入字段。helper/external 两模板和 plan 三键模板因 null 槽不满足实际 Native 输入契约，不可执行。真实 API、lease、Reg/Candidate、state、G2 和业务 G3/G4 都不由本包产生或批准。

已实际运行 Windows Node24：脚本 `--check` exit0；候选生成 exit0，17 项作者检查通过（4 项正向结构/集合检查、13 项拒例）。固定源码/元数据在生成前后逐 raw/长度复核。Windows/UNC 到 Linux 的本地读映射仅用于观察受 pin 约束的原件，不修改任何输出 pin 或受审 plan 路径。当前 Root 的活动源码没有被本脚本读取或宣称为已推广状态。
