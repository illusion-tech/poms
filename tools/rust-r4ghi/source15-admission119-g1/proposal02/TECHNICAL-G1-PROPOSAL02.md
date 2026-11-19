# #119 固定14→15准入：有限技术 G1 提案02

仅设计，G1未冻结、未授权代码或实际执行。#119为#114原生子片，#118原生blocked_by119；Root负责Issue/Gate。proposal01 `11b0f033…`原封保留。02明确更正：产品依赖是 `project_operating/restatement.rs + context.rs`，**store.rs不改**；Final CAS独审a170已封且无需第三叶；preparation.rs不纳产品修改。最终两叶after与代码独审仍是actual G2前提。14实际10个HTTP均200，唯一认证POST是login **HTTP200**；Main13历史命令是 **Source13 HTTP201**，不得混同。

## 1. 本准入子片的精确边界

生产工具固定14叶：H3 8叶（4ADD/4MOD）＋外置6ADD；另4个验证文件，不入H3或运行执行闭包。路径、当前beforeSHA、责任和ABI逐项见 `exact-files02.json`，afterSHA全部null。不得以本提案新增其它文件、整目录授权或“必要分支”为由扩范围。

H3新增4叶为 source15-admission、source15-admission-core、retained-source14-for15及空模板；MOD仅 consumer-admission54、trusted、fault-sweep、gh-write-facts。基于实际218，核心候选图为218+4=222；**这只是本子片贡献，不是实际最终H3或G2数值**。后续H/Tax/consumer amendment若贡献H3叶，必须在实际publisher前由Root另冻有限组合并测量完整最终图，不得先发布222再热添未准工具。

`context.mjs`原字节保持：现有 generic epoch/run、sourcePins()与已发布state15足够；它在ordinary createContext第79行调用consumer54，新schema5分支在partial ctx尚无helperPins时也必须实际测量完整H3，不能跳图。新15状态由独立FS publisher在真实API/readiness/state-free observation及G2后构造，不调用旧bootstrap提前createContext15。

普通入口包括 `assertAdmittedContext54`、`assertAdmittedFixtureSource`、`readAdmittedConsumerContext`。前两者在同一consumer54 MOD中增严格schema5 dispatch；后者原调用链自然进入新分支，保原state path/完整性/真实PID检查。14/schema4与旧108/119/252语义和原件不放宽；15不得经旧252的14分支。

## 2. H3真实必经分支

`fault-sweep.verifySources`对15只允许本G1列明的6个GH operation，调用新typed15 guard并比较实际完整source/helper/API；15非GH不得落回旧19静态图。13/14原分支原样保留，Tax/F等专用effect不借generic kind绕guard。

`gh-write-facts`第144、162行当前将historical273限定ctx14；15若只补fault-sweep仍会错误采用baseline非null/205旧period逻辑。因此本MOD明确在真实schema5/source15 guard通过后，15的专用period-close及通用PeriodEnd两路都走现有273显式null+selection+专用noncurrent G路径。既有period重述原冻结模型与其它财务/库存/权限/完整性断言不变；14行为不改。通用period inventory、period-historical-facts273和write inventory未发现额外epoch14 gate，不纳MOD。

`trusted`只增加明确15选择：通过新15 registry取得真实ROOT15 Common pin并核SHA/stat，记录具名trustedSummarySeam15；不得fallback旧ROOT/debug或沿旧14 seam贴15标签。其它已封分支保持。

218实际源的epoch14/252符号扫描及直接依赖分组见 `branch-census02.json`。该清单穷举本次应接15的普通/Current/GH/trusted分支，也明确列旧Tax14/H-policy/Labor14及252 composition为拒绝15的历史/另amendment面；不把它们遗漏为隐式授权。

## 3. 固定核心ABI

`ABI15-v1.json`是本提案唯一ABI表：registry schema5/protocol1，producer固定g2-business14、consumer固定g2-business15/main01、同M98/139。它不是跨epoch参数化框架，也不是M99。

当前方法为 assertCodeEpochContext15/currentCodeRegistry15/effectiveHelperPins15/assertRuntimeBinding15/assertRetainedFixture15/readRetainedCommand15/trustedSummaryBinary15/assertGHCurrentSource15，输出与旧252明确区分。活动字段为 `state.codeEpochAdmission15`、`consumerAdmission54.registry=Reg5`；旧codeEpoch252/Reg4/B1与14缓存进具名历史，不当15current。

Main13桥仍用真实Source13 frozenState/HTTP201/ledger，`producerEpoch=13`；另明确retainedThrough14，而非把14state当13。资源桥使用原Reg4已准projectIds/真实birth及完整projection，不能把旧R3 uiSpare子集扩成所有anchors。普通运行允许15的合法owned/actors前进，不能永久whole-state deepEqual旧14。

## 4. 真实14输入与历史层

固定输入receipt344：`0df8b21ec95ee497feb0c049ecdfea95c7824cdf98b7d6c8363562964717bc77`；746=528compile∪218H2、source420⊂compile，canonical f995…、state24 bd21、ownership559aa。真实输入保全独审 `6a0341fd2176e5d8d1625d3a2dde6ac3f083732edfc49f77b7f3818385781ef3`已存在；只证明typed input preservation，**不含大bin/进程/最终双DB retention/15准入**。

新 retained-source14-for15 reader严格读344的显式原路径→archive pin映射、746集合/hash和原339/Reg4/B0/B1/build/341原件；验证14 final retention、实际auth200归属、无领域POST与失败准备标签。它不运行旧252当前guard、不改ctx.win=archive、不patch fs/crypto。旧14 API/Common真实路径继续保留；退休是独立Root owned-PID动作，历史验证不要求退休后old14 live。

还缺最终14数据retention及非作者读回：全部owned/borrowed/birth/latest、真实auth/cookie原件、双139×2 raw/xmin/meta/seq/objects及原13 AF书挡。预期旧点bd21/seq24；若变动需Root具名新seal，不改344。无successfulPreparation、FI、Tax normal或Main14成功声称。

## 5. 六个外置工具和Root顺序

路径全在 `tools/rust-r4ghi/source15-admission119/`：

1. capture-source15：retain14在换源前用真实旧218/14状态和原只读guard核归属并defaultRO双capture；observe15在新API后、state15不存在时核新15候选并双capture等于final14。两阶段严格输入kind；不调用createContext，不persist旧state。retain14不依赖尚未推广的business15模块。
2. build-source15：inventory/copy、Root与mirror原固定Cargo8step和独立ROOT15目标；bind阶段仅把后置实际H3绑定到原真实Rust结果，不称Cargo编译Node。旧14 target不覆盖。完整新source/compile输入按最终产品有限清单和实际枚举核，数量不预猜。
3. api-runtime-source15：独立exact审批的retire14/start15/status15；精确old PID/start/boot/exe/cwd/stat后才可退休，保旧记录；新私有nonce/env/PID/log、真实ROOT15 API与readiness:200。无自动kill/restart或state mint。
4. plan-source15：只组装实际pins/显式transfer/resource/产品/helper差分；不从latest目录猜值、不创造approval或业务准备包。
5. admit-source15：FS-only bootstrap/inspect/publish/B1，预导入完整H3与外置closure、nonce lock、原件书挡、明确Root/非作者G2后才原子写新Reg5/B1/state15；失败partial不覆盖旧14。
6. source15-input.template：实际old final-retention/new source/helper/build/API/observation/approval全部null；344和独审是已知typed父输入，不等于许可。

顺序：final14 retained → 最终产品/H3有限差分 → Root/mirror真实build → owned退休14/启动15 → observe15双库守恒 →完整plan/独审/Root exactG2 → publisher → ordinary ctx15。所有实际新值在真实前一步产生后再填。Root管理既有构建/FS推广执行；如需新脚本，必须落在此六工具既定职责内或另提有限增量，不能隐式新增执行叶。

## 6. 明确另冻，不属于#119实施权

`deferred-ABI02.json`固定以下消费接口与阻点，但不授实现：

- #118新15 edition保持6叶职责、入口/退出真实15 guard各一次、每效果fresh和完整closed FI set；14 WIP5/6与40负例未完成原样保留，不当已通过基底。新taxContinuation15、Source15完成/FI/sidecar kind必须明确15，保整个失败taxContinuation14与Main13原件。
- prepare/facts corrective只有在产品根因/资格/CAS封定后另G1；必须真实完整server/独立来源图一致且formal eligible。没有旧prepare retry、2→5数量修补或伪造341成功包。
- H-policy/role/Labor15的5个具名H3继任文件与真实partial13承接需独立G1并在实际Reg5最终图前组合；旧full13-complete的257路径继续原条件，不为15放宽。
- 15 reader与4外置caller另G1-C；不调用14 H257/shared270 reader假兼容。三参联合consumer形式、固定无注入选择及sidecar强校验可复用设计，但须新的15 reader/Source pins/注册/actor proof；14接口v2保持其待实施标签。

这些是精确的另冻依赖，不是“所有必要edition”的开放授权。#119代码G1可先独立冻结；实际G2仍等待全部真实前提与最终完整图。

## 7. 验证与明确N/A

4个具名validation文件覆盖 typed344/14 auth200及partial、完整新current tuple/ordinary dispatch、GH两条period/null路径、trusted不fallback、state-free capture/FS publisher顺序/未知不可覆盖。必须回归旧schema3/4及历史108/119/252 byte/行为不放宽、peer scope不扩、Main13历史桥不读current latest。真实build/API/双库/准入只Root另actualG2，纯FS不得冒实际。

原Shared/OAS/SDK/Admin若无源或wire增量，只做确切hash/ABI机械确认，不重跑全套；产品修复相关Rust/Cargo与数据资格回归须按最终产品封件做，不裁CAS。当前afterSHA、新source/helper/build/API/registry/15state/prepare与G2均为空；#119仍G0/Todo。

## 8. 无自引用的hash域与发布点

publication-hash-domain02.json固定唯一算法及三具名排除槽。B0不是预填输入：真实API/readiness/fresh15观察后，在bootstrap-only exact G2下实际wx生成；最终独审与Root publication G2同时绑定execution scope和该确切B0，排除不等于跳过验证。最终plan冻结后依次实际Reg5→实际B1→原子发布引用两者的state15；Reg5不含未来B1/stateSHA、B1不含stateSHA，plan不含未来输出槽。B1命令只核已写B1，不重复mint。状态为最后活动切换点，孤件不算准入，中断只读核对不得覆盖重发。
