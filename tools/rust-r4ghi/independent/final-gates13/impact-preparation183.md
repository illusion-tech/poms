# Source12 → Source13：schema3影响预审183

**已完成冻结代码比较及旧证据历史引用的impact approval；不批准Source13执行、schema3准入或G3/G4。** 最新Root已冻结G2/H0，本件已实核consumer epoch `g2-business13`、416项digest `937a55af...`与195份H0；实际M98/after/B0/state未在本件认证，保持null。正式Rust240 / 本批新认证0不变。未执行Root helper、普通createContext、SQL/HTTP、角色写入、服务或Git/GitHub操作；所有审件写入仅在本目录。

## 已核固定输入

- 177 staging raw SHA `e88f4e0f...`：10产品 + 12schema工具/future组合 + 9Tax工具，共31；这是staging清单，不是Source13运行候选。
- 181 dependency corrective raw SHA `a2fb4732...`：context.mjs从`3904197c...`到`9862d325...`，明确补4个direct leaves；早期FS枚举226不是最终sourceCount。最新approval136 raw `f0a8cf9c...`、plain sourcePins raw `d4ff63a2...`、helperH0 raw `e65db969...`及freeze receipt `fc4c5111...`均已核，最终416源文件/195 H0逐字节匹配；H46六NEW与H47最终2helper已纳入。H47及freezer的已封非作者工具审查仅覆盖工具，不认证实际13/M98。
- Source12保全index SHA `fed889a2...`；frozen state SHA `ee7371dc...`；retained snapshot007492 SHA `106c66ef...`。只读Source140包包含406项，zip SHA `7b18c4f0...`、sources SHA `28a8af77...`。
- 从frozen state实际sourcePins数组重算Node `sha256(JSON.stringify(array))`得`5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa`，长度406。原M97业务baseline仍指Source10的`f4026a14...`，与原schema2 registry相同；prior fixture births仍5项Source10、2项Source11，不改为Source12/13出生。
- 完整旧ZIP406项全部按原manifest回读SHA；完整after416项为10新增、6修改、400不变、0移除。另核旧retained helpers/launchers180与新H0195：19新增、9修改、167不变、4项仅不在新H0选择集合。它们不是文件被删除或历史证据丢失；API launcher另由approval直接pin。
- 已逐字节核106十份产品：6修改、4新增，before取自已封Source12 zip，after取当前staged产品并匹配106。新路径在旧包确实不存在。service.rs、preparation.rs、sources.rs三个邻接文件也与Source12相同；这只是明确的局部边界，不是整个最终after无其它变化的证明。
- 字段以当前`registry-lineage62.mjs` SHA `28add87a...`的33–40行为准：kind、producer/consumer epoch及source digest必须匹配；retainHistoricalLabels=true；currentConsumerCertificationGranted=false；reviewer非空；sourceComparisonReceipt与每个group.receipt必须是可核原字节pin；group.use只能为`historical-by-impact-review`、certifiesCurrentConsumerExecution=false。

原始复制件、六修改/四新增差分见`product-raw-precomparison183.json`及`ten-product-diff183.patch`。这些文件明确标注**不是完整sourceComparisonReceipt**。

## 十产品的实际影响

| 产品 | 差分事实 | 旧证据影响与新证据要求 |
| --- | --- | --- |
| 新SQL65 | 替换既有`jghi_assignment_participant_guard()`body；按UUID锁全部实际OLD/NEW父，再判重定父/缺父/冻结 | M97函数实际OID：Native26561、Rust27648；新M98必须保留各自同OID/owner/ACL等。旧五项23514及public freeze-vs-revised-create409仅保留原epoch，不能证明新父锁 |
| 新M98 TS | up()提交同一SQL90b；无新表列或业务回填 | Native编译/迁移文件存在不等于正常UP执行；双库真实argv、98迁移输入、唯一登记行及sequence一次推进待核 |
| operating/mod.rs | 只加入period_baseline内部模块 | 不增加路由/DTO/分母；不能单据此认定最终全部API依赖无变化 |
| operating/context.rs | P90仅在period_key存在且无历史period时验证已选draft；84在两处本地事实循环排除导入外部财务父 | 首次期末与foreign-source收集/投影影响G及其新H输出；旧本地realtime trace只可按实际无foreign/无period分支限定引用 |
| 新period_baseline.rs | 核original/current估算、successor链、激活条款/准备/真实approval.decided_at、移交/再基线化的business/knowledge时间及精确ref/hash；不选包、不改金额 | 新首次期末正向/负控必需。G包现在封存时间不替代底层事实时间；未来或未知资格409，不自动回退旧预算；既有period root路径保持 |
| 新period tests | 14个纯单测覆盖旧业务+晚knowledge、未来/未知/缺时间、HK边界、批准/版本链及foreign-project等 | 是纯规则测试输入，不是实际期间201或真实来源HTTP证书；本轮未执行它们 |
| operating/restatement.rs | 83验证实际F税务evidence target/project/schema/hash及sourceReferences，再以真实source→Cost关系扩展完整分摊批次/项目/终端图 | TaxRef-only的发现集合改变；旧有显式Cost roots的成功不替代它。必须新核完整影响、锁/授权、所有目标、必要写入族和事务回滚 |
| cost_governance/correction.rs | 原read-only resolver改名并pub(crate)，其relation body不变；原F调用同步改名 | 原E/F生产记录不重造、不重发成功POST；新G调用该resolver的路径需实际验证，历史sourceVersion不在发现阶段被改标为当前版本 |
| cost_governance/mod.rs | 内部re-export上述resolver | 无新增公开API；G↔F依赖边需纳入最终graph/输入比较 |
| operating/store.rs | Expense/Invoice/Payment/Payable只按实际share→slot→Cost的source_type/id载入明确foreign父；project_rows与同family锁共用谓词 | 84需要实际父加载/锁及无重复本地投影/无额外unmapped事实。旧MainG006224的409保留；只在新fresh preparation后补缺口 |

65的优先级按实际代码及M97原件表述：UPDATE重定父始终先23514，包括改为NULL（旧M97也如此）；INSERT NULL留原NOT NULL23502；非重定父I/U缺实际父为23503；DELETE原缺父行为保持。不能把这些不同路径合称“所有NULL都23502”。安全父必须实际存在且锁定，探针最终ROLLBACK；禁用parentless committable-window绝不重试。

## 历史证据的分类

| 分组 | 可保留的意义 | 不能由旧证据推导的结论 |
| --- | --- | --- |
| Source10/11 registry与partial/完整旧FI系列 | 原出生来源、真实成功/失败/partial/ignored及同body重试事实；用于追溯与旧缺陷定位 | Source13执行认证；旧102固定族数覆盖新TaxRef-only完整动态族 |
| Creator、合同/receipt/handover、Own-condition及I终态路径 | 十产品未直接修改这些controller/UoW/DTO；最终全输入及依赖比较确认后，可作限定历史行为参考 | 新consumer auth/candidate/运行或新schema准入；已有成功POST不重放 |
| Source12 Role03/cold/peer与五安全回滚负控 | 真实原135/1351的freeze、独立peer409、冷开version1/rowVersion2及旧23514结果 | M98后的OLD/NEW父锁竞争、缺父/NULL分支或Source13执行；正向需新真实fixture时另按Root确切计划，不重放旧freeze/create |
| Expense/E/F实际producer | 真实持久化来源、原F守恒及已有immutable证据；作为Source13 retained source输入 | 自动证明新TaxRef-only发现/全批次回建或新增foreign父投影；不得再发旧成功E/F POST |
| GH03→GH04实时本地trace | 原基线201、后续真实分类/snapshot201、两review200、固定H08；保留所有failed与subset false/null | 首次历史期间资格、MainGforeign修复、TaxRef-only跨项目重述或新数据作用域下的H完整11规则 |
| MAX/legacy/mask旧case | 钱数值算法、旧兼容及原场景JSON/DOM事实，按分支和实际来源限定引用 | 新foreign/劳动/未知血缘闭包仍满足最强mask；新来源集总额/税/去重或新M98行为 |
| Native17与精确cookie-born cleanup | 现代协议不支持的17个422、原失败与精确清理/守恒各保持真实标签 | 现代业务DTO成功、Rust交付或Source13协议执行 |
| 保全139/170与恢复147/148/1351 | 原Source12数据/目录/row+xmin/对象及进程身份保全证据；schema3 before端输入 | restore/portable xmin认证、after M98或新Source13 fresh等价、产品功能已过Gate |
| 535隔离Rust、Native lint08/build05 | 仅在完整input/toolchain/args及相关依赖相等时复用其原静态范围；仍保留“当时未应用候选”或实际Native标签 | 实际API136已启动、M98已执行、535项真实业务或本批32新认证。Native两条旧warning不新增来自Root报告；raw receipt/pin待最终包 |

所有正式group均使用指定`historical-by-impact-review`及`certifiesCurrentConsumerExecution=false`。外层`group.producerEpoch=g2-business12`表示本次retained direct producer；group内的原receipt路径、birthSource及实际Source10/11/12 epoch不改名。

## 必须补的实际Source13证据集合

1. **R01 schema3/M98**：最终完整source/98迁移/SQL/TS/runner/Node实际字节；正常逐库UP；retained→before无变、before→after只批准function同OID body/唯一log/sequence一次推进、after→fresh无额外变。原M97 baseline/138业务表与objects不重置，canonical M98不入owned cleanup。
2. **R02 65**：真实已锁OLD/NEW父的有序等待、freeze/participant movement/零权重、上述SQLSTATE优先级；每个控制都保持真实父且最终ROLLBACK。旧public revised-create409与新SQL父锁是两类证据。
3. **R03 83 TaxRef-only**：实际F sealed证据→真实Cost→全批次/所有source及receiver项目/所有current与period终端；发现后重新锁/授权/完整CAS；篡改hash/target/project/schema、manual不猜全项目成本；缺能力的period目标保留并明确阻断，不能剪裁后执行。
4. **R04 84 foreign**：fresh MainG实际source父解析与同family锁、精确四类财务关系、无同项目假替身/无foreign本地unmapped或重复投影。旧Expense/E/F/ReceiverG成功不重发，旧006224失败不改标签；新关联来源的权限/劳动或未知血缘mask须新核。
5. **R05 P90**：已选真实draft的首次期间正负控、精确business/knowledge/HK边界、真实terms/preparation/approval/移交链。现在封G包可行但底层来源必须当期合格；不自动历史选包、不调时钟/回填。自然期末201仍需实际服务端日期与完整事实。
6. **R06 组合事务与H消费**：Source13真实preparation/inputHash、effect后的sourceHash、完整必要写入库存；每族一击失败+全部领域/快照/必要audit及规定auth flush回滚，再同body无fault重试。新G/Tax/period输出的H immutable context/四阶段binding/known0-null/税/去重/边界及overlay硬约束按影响新核；旧102不冒称新库存完整。
7. **R07 当前消费端与旧分支**：新物理candidate/readiness/actor及职责/permission/protocol绑定，旧Source12 actor/cookie/quarantined evidence不转为当前认证；无影响旧路径按最终逐文件/依赖证明引用，当前必要负控与新作用域要真实执行。不靠普通createContext绕schema3。
8. **R08 最终比较及检查**：H47-03独审后2helper、H46六NEW、181四direct leaves与31文件/future/Tax85最终实际闭包全部纳入；sourceCount只由实际最终数组计算。Rust/Native/OpenAPI/client/迁移检查或限定静态复用、所有已知失败及warning/drift有确切pin；Gate仍待统一候选。

R01–R08是复验集合，不是本轮已执行项目。本轮只运行独立FS读取/哈希/复制与文本差分工具。

## 最终comparison receipt的方法与待值

1. before固定为`state-at-retention139.json` ee737及其原sourcePins406/source5263，原packet/member/raw bytes可回读；prior registry3ed、process1351 overlay0598、原M97 baseline及Source10/11历史链分别保留。
2. after现已绑定Root最终G2/H0冻结的完整416数组及195 H0、审批/runner/98迁移和支持工具/独审pin。逐原路径比较，不按basename/alias合并；实际B0/新binary/process和M98后schema仍另待交付，不能从代码freeze推导已运行。
3. `source-comparison183.json`已绑定实际两端数组pin、精确`sha256(JSON.stringify(array))`与406/416、全部ZIP/当前源/H0及逐文件差异。consumer digest实际重算为`937a55affa775787d7507b94f3fc425affa9ec700c1aaabf449f564ee8d203fe`。它是完整**代码**comparison receipt，不是尚未发生的M98三段schema或B0执行证据；实际after/B0/state保持null。
4. receipt及每group的pin都应是执行侧可读的绝对真实文件/64位raw SHA，满足非symlink、single-link及realpath相同等当前validator要求。所有原receipt身份/epoch/projection/状态保持；实际group原件缺口和最终H47变化须回到非作者复核。
5. 本非作者已根据实际冻结数组复核并封`impact-review62-183.json`的consumer epoch/digest及comparison pin。后续实际B0/M98/candidate另由Root提供并继续独立核；若冻结代码/195 H0改变，当前代码impact approval失效并须重做比较，不能由作者自行补数或扩大范围。

`impact-review62-183.json`使用当前validator真实字段；所有group仅为`historical-by-impact-review`，`currentConsumerCertificationGranted=false`且`certifiesCurrentConsumerExecution=false`。本批准只允许所列旧证据按影响和原标签引用，不替代当前执行、schema准入、G3或G4。Native当前静态checks等未取得raw pin的项目不在已批准group中，仍作为后续统一证据输入。
