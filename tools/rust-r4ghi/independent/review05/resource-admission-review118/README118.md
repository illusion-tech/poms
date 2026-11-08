# 118：58资源显式准入与工具继任方案（待作者实现）

本件只给设计约束和已核事实。没有发布新工具图、修改Root、创建registry/state、查询DB或执行HTTP。H为后续实现作者，独立准入另审；本件不代G3/G4。

## 已核缺口

Tax203原`000022-tax203-finish-main-partial.json`在任何Tax HTTP之前被正确拒绝。A85与H47使用`/fixtures/sharedSourceFollowup58`均是正确的真实record路径。原R3与它的直接prior R2均没有该entry；`fixtureAdmissions54()`只登记EO/Own、Creator、Legacy、A05，108直接调用它。record仍带真实Source12的5263摘要，两项目的实际HTTP出生均在Source10。原before中PK不存在、after中firstSHA与owned.firstSHA均已核实，证据见`diagnosis118.json`。

单纯向原R3复制一entry仍不成立：`registry-lineage62:102-106`对无prior的路径强定record birth=current producer12，随后又强制项目HTTP before/after也出自12。手填birthSource10在该规则中同样拒绝。没有不改代码就能消费该补件的既有overlay钩子；不得借UI旧path、重标record.sourcePins或改原R2/R3。

## 当前代码实际绑定什么

- `context.sourcePins()`枚举backend/directFiles、Rust src、Native migrations、Shared contracts，当前416包含Tax CLI direct leaf，但不包含大多数`business/*.mjs/json`。只改这些Node消费工具及私有sidecar，可以保持416/5e467以及Rust/API136物理构建原证据不变；须重新逐字核，而不能预称不变。
- `context`要求现state.sourcePins等于当前416；`consumer54`要求registry.consumer source tuple、API和schema3绑定相符。改变该416中的任何leaf就超出纯工具继任，原state会按现规则拒绝。
- `schema-comparison108:135,158`要求原registry.schemaComparison108及完整consumer对象等于原M98验证receipt，含原H0与B0。不能只给R3换helperPins或candidate就声称仍是原108准入。
- `tax13-provenance:23-26`、`policy-runtime46:32,45`要求实际helper图严格等于原R3.consumer.helperPins。原B0/B1还明确保存helperH0。因此新的H1必须是明确的新工具继任，不能把原H0或B1改标成它已验过的新图。
- `constructSource13`的B0/plan入口要求state不存在；B1入口仍强核原H0。现有构造器没有B2工具继任模式，不能绕这些条件重发旧入口。

## 最小方案：原R3不变，新增119 sidecar和H1/B2

采用Root提出的外置119工具继任。保留原R2/R3、B0/B1、G2原canonical、M98 receipt和comparison baseline全部原字节。另封119计划、资源registry、H1图、B2；只在现state新增typed119指针和明确必要的序列/完成元数据。backend416、API136/binary/readiness及原构建/迁移证据必须逐值相同，不能把工具继任叫新的Cargo/M98执行。

119至少绑定：base R3/B0/B1、Source12 retained139 index/state/snapshot、原H0、当前416数组和5e467摘要、API136 process/binary、全部旧195 helper原字节恢复证据、新H1完整图、唯一允许的before/after文件diff、独立review pin、工具自身source pin、精确58资源及两project、当前state before pin、当前全量DB/object基准。新值在作者候选中保持null，不能用模板approved布尔值代替Root批准raw SHA。

资源来源必须分开：

1. `recordProducerSource`仍为Source12/source5263/retained139的真实state pin；完整58 record hash/projection和identity不变，不写stage/tax flags、receipt或source标签。可使用现`immutable-ui-producer`的完整不可变投影语义，但名称和实际用途必须说明；不得用continuable模式只锁少量identity而放开payload。
2. `projectResourceBirth`逐项目声明Source10，且必须选自已经由原R3验证的sourceHistory，不能接受随填的epoch/source tuple。核对应祖先state的owned.firstSHA/原HTTP proof、真实before absent/after单行firstSHA、HTTP成功/完整响应/实际路径/marker/epoch/run；再核Source12 retained snapshot中该PK的latestSHA/xmin等于Source12 owned latest。record birth与project birth不能互相代替。
3. 所有请求project锚点必须完整列在唯一两project中，不能多授、漏授或用同org/裸ProjectWrite代替。资源准入只允许消费fixture，绝不赋后端authority或替代真实HTTP Scope。
4. pin真实Stage/Tax receipts及其source provenance：原E/F/Receiver成功、Stage实际完成、Source11 input40、Tax Main409的请求/响应/ledger/partial/reconciliation等。按原sourceHistory区分10/11/12；不能强说所有原件诞生于12，也不能忽略失败原件。

## 作者实现应保持的最小读者边界

建议新增一个纯同步119验证器，供54、Tax、H46复用：不在模块顶层读文件/创建ctx/发请求。原R3及`validateRegistryLineage62`原entry规则继续原样执行，原schema108 consumer也不换。119是独立的严格补充：仅当原R3没有exact58时，验证该sidecar的完整来源链并提供此entry。所有其他旧fixture仍按原规则拒绝；不存在“任意缺失路径自动补入”。

建议消费变更点：

- `consumer-admission54`：先验证原R3/108/来源链，再显式验证119；只有受审exact58允许使用该附加entry。startup也需验证当前完整H1，ctx.helperPins尚未构造时应自行枚举实际全图，不能暂时跳过。
- 新119模块：严格核base source/API/schema/H0、H1全图、exact58、每project祖先HTTP birth、全部receipt和不可变record投影。不得把附加entry塞进原R3.fixtureAdmissions再让旧62假装原已支持。
- `tax13-provenance`和`policy-runtime46`：共享`effectiveHelperPins119`，默认仍原H0；存在合法119才精确使用新H1。保留图中所有模板和完整sourceBases union，不接受dirty override、删文件或只验一个修改文件。H47/49若经H46委托可不动执行逻辑，但私有绑定必须是新H1/B2/119版。
- 新B2是工具继任候选：显式引用原B1和119、新H1；原B1的backend/source/build/process与helperH0原字段仍是历史基线。B2不能篡改原R3.consumer.candidateReceipt=B0。新runtime必须认出B2+119，而不是继续把原B1当作新H1证明。

这是设计建议，当前代码尚不支持。若作者修改Tax CLI direct leaf、G2 canonical或任何backend416内容，则纯工具继任条件不再成立，必须停止并按新的完整source输入协议处理，不能靠本方案降级构建或source守卫。

## 发表顺序与无环

1. Root独占、无active driver；先按旧H0捕确切current state和最后全量139×2观察，保全旧195全raw或可逐项重建的before文件。原203 partial保持失败，无重POST。
2. 作者封候选H1/119/外部publisher/B2工具、纯负例、全部pins；非作者review。先无实际值，不热改Root。
3. Root批准完整raw计划并精确安装新H1；以受审的state-free只读adapter捕fresh/current验证。普通新ctx不得在119还未发表时误把新H1视为已准入；不得增加普通API的pending旁路。
4. 新publisher先wx nonce锁再任何ctx/persist；先写不可变119 registry和所有验证原件，后原子发表state中119指针。保持baseline/schemaComparison108/consumerAdmission54原R3/API/sourcePins/owned/borrowed/fixtures/objects/actors逐值不变；只列明119及必要counter元数据变化。
5. registry不要嵌其发表后的state raw hash，避免registry→state→registry环。完成原件可在之后独立引用registry和最终state。若分pending/verified，普通入口必须拒pending；完成Pin与final state互引用也不能形成自哈希。
6. 产生不可变B2和新的私有Tax/H46/H47绑定，均显式指119/H1，business模板继续全null。先只读重跑完整`readRetainedTax13`直到passed，再另phase freshMain prep/POST；继续保留producer旧E/F/Receiver成功，不能重播。

## 必需反例与实际边界

须拒：无119仍旧失败、错R3/B1/H0/API/source或schema、项目birth冒称12/13、祖先不存在或before已有PK、firstSHA/retained latestSHA/xmin不符、未知receipt source、改record分支、缺/多project、其他路径借壳、未知/删除helper、修改backend416、改原R3/B0/B1、错误发布顺序、pending或异nonce。正向须用真实Source10出生和Source12 record的只读原件验证，不能只造一个toy tuple。

真实发表时Root必须证明所有DB rows/xmin/meta/seq/objects不变，0业务HTTP/0DML/0DDL；有新helper实际执行后，必须标H1/119而非原195/H0已通过。旧API136构建证据可按原身份保留，新的Tax/H46/H47真实验收仍全部待执行，新增认证0。
