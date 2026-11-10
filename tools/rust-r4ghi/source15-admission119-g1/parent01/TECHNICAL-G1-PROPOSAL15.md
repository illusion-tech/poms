# 固定14保留数据 → Source15：最小技术 G1 提案

状态：**仅提案，未授权实施、未建立15上下文、未取得实际G2**。Root负责Issue与正式G1；I只列最小技术面。#118已写内容保存在 `tax14-invocation118-code01/manifest-PARTIAL-SAFEPOINT01.json`，SHA `6f4826a709d4dd61bb3d3ddedcb48f9bbed1a177b9df36dd10c8be520a5c21e2`，5/6叶且NOT READY。14版consumer接口v2 `9ea99e8c…`保持原proposal/待实施身份，不假定适用于15。

## 1. 必须新Source15，不能热换14

当前252明确为固定13→14/main01，真实339已发布Reg4/B1且341发生真实auth、inspect与失败prepare。它不是未消费候选。新Rust修正即使只是两个既有文件且仍M98，也不能沿用旧14 source420 digest、binary、Reg4/B1或重新执行13→14构造器覆盖当前14状态。

建议新 `g2-business15/main01`，仍为同一隔离数据库、M98/139、同原M97业务baseline与原108单次schema推进链。新JSON registry采用独立typed新版本（建议schema5/protocol1，待Root正式冻结）；这是工具准入格式版本，不是M99。普通14 reader不接受它，新15 reader也不能把旧Reg4当current。

## 2. 已真实存在的344归档：必须精确消费

唯一当前输入保全原件：

`/home/wangzishi/.local/share/poms-r4ghi/private/source14-retained-inputs344-01/receipt344.json`

SHA `0df8b21ec95ee497feb0c049ecdfea95c7824cdf98b7d6c8363562964717bc77`，493409B，kind=`actual-source14-input-preservation344`。本提案只读回此receipt原字节与结构，**没有重扫746叶或声称非作者已通过**。

实际声明：source420、compile528、H2 218；420严格包含在compile，compile与helper不重叠，tree共746；source canonical SHA `f99501c14e52968dbda47dde1243597e32b24e8433e90669d9aea8c5bdf3cf1d`。`manifests.sources/compiles/helpers`、`files[].relative/original/archive`及`preservedRuntime[].original/archive`是reader唯一允许的映射来源。不得运行时猜路径/Windows别名/扫盘选最新文件。

固定14状态副本 `state-at-preservation344.json` 为 `bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97`、seq24；ownership副本SHA `559aa091ba9cfa1ef1c72dd2a7c4d21c8d4285588519de937e6db2b2efd6aa79`。Reg4/B0/B1、runtime341、inspect/failedprepare receipt、partial及server包保持真实原始身份。receipt明确 `successfulPreparation:false`、`Source15Admitted:false`、无SQLHTTP/API变动。

新typed archive verifier必须：逐manifest/rawSHA与canonical数组核对、全部746相对路径集合严格union、每个archive leaf regular/noalias/nlink1与原声明hash、source subset和compile/helper disjoint、runtime原件副本同hash、所有copy contained于该已批准archiveRoot/tree与records。receipt不是数据最终retention或执行许可；Source13 AF、旧14 binary/API/Common路径及原339/341标签继续保留。

## 3. 尚缺的真实14 final-retention前提

Root应另外封实际最终14保留点及非作者读回，不拿344纯FS保全充当双库证明：

- 固定全部14状态、ownership、当前owned/borrowed/objects、所有原HTTP/ledger/command原件；真实auth201、安全事件、last_login/last_seen等归属不可丢失或贴成13/15出生。逐row latestSHA/xmin/原birth proof完整保留。
- 全139×2两份真实defaultRO capture，raw/key/cells/SHA/xmin、规范meta/OID/ACL、sequence、objects/文件字节严格相等；与当前14已记录归属一致。行数由实际读回，不能沿用13的542/4392假设。
- 正式14 outcome只可为真实partial：inspect成功、prepare失败，FI/Tax normal/Main POST未执行须用实际HTTP index/ledger证明；auth确实发生。保留339 `b7d90ebc…` 与341失败 receipt `45863755…`、partial `a84f82ca…`、state-after bd21，绝不改失败为准备完成。
- 原13 AF、M97 baseline、108/M98 canonical登记、旧R3/119/B2及已有14 Reg4/B0/B1/启动与readiness保持原件。若最终点不同于seq24/bd21，Root须具名封新点并说明差异，不能悄改344。
- 14实际执行过的外部工具/launcher/observer/publisher/341 wrapper闭包按真实command receipts补充保全；未执行的#118 WIP不冒称已消费源。344里没有的必要执行叶可独立typed supplement，不改344原seal。

## 4. 最小有限代码面（待正式G1冻结具体文件）

| 组 | 最小候选面 | 约束 |
| --- | --- | --- |
| 产品修复 | Final/H最终确认的 `project_operating/store.rs` 与 `context.rs`，及实际必要测试叶 | 先冻结逐文件before/after/有意差分；是否额外测试叶由封件决定。修peer投影污染与真实future资格，不把2改5、丢cutoff或missing-evidence当成功。 |
| 15核心准入 | 新 `business/source15-admission.mjs`、`source15-admission-core.mjs`、空模板 | 只固定已封14→15/M98，不是自动跨epoch框架；负责archive/final retention/父证明、新source/helper/build/PID/同数据及资源/状态转移。 |
| 普通入口 | `consumer-admission54.mjs`新增严格schema5/15 dispatch；`context.mjs`新增具名15 bootstrap/ordinary binding支路 | 原schema3/4/252/119分支原语义不放宽；15不得路由旧252或默认为14。旧14 H2218原raw在344保持。 |
| 真实Common | `trusted.mjs`新增严格15 registry/binary路径支路 | 15只能用新真实ROOT15 Common；旧13/14分支不变，不能回退45efe或旧ROOT/debug。 |
| 新构造/观测工具 | 外置固定capture/inspect/publish和API15启动/观测edition | 可复用纯FS/typed binary/raw守恒函数，须新code/exact输入审；只Root实际执行。禁止先createContext15再凑绑定。 |
| #118 | 现六叶pure phase/ledger/wire/control逻辑复用；新15专用context/retained proof/运行标签edition | 需要明确amendment，不能仅改14常量。新的Tax15 record与正常/FI协议必须显式绑定15；旧14失败record全留。 |
| 实际准备/事实 | 独立有限prepare+facts corrective amendment | 原#118无prepare权限；须在业务图修复独审后，对新15实际完整来源、targets/eligibility/预算/CAS形成真实成功准备。不能将341 partial伪造成成功包。 |
| 后继H/period消费者 | 只补未来实际必经的source-aware15严格支路或有限新外置edition | H/role/labor及270/271必要fresh guard要在最终helper graph冻结前列全；若通用fault-sweep参与GH，15必须严格绑定新registry/source图，不能落回旧19静态source分支。旧14 consumer API v2/4caller proposal保留，另冻结15 reader+caller，不能以14 reader宽松接受替代。 |

表是候选边界，不是实施许可或任意扩文件授权。Root应将最终生产、helper、外置执行及不入backend-count的验证件分别列有限清单；每一重叠有顺序frame、精确before/after，无隐式alias或热换。未确定具体文件/hash/count的项继续null。

## 5. 新typed14历史层不能重跑旧252当前guard

换源后，旧252会按写死的13/14和原Root输入路径重新读source/build，不能把实际15 ctx伪装14、把ctx.win重绑archive来骗过硬路径，或patch fs/crypto。应有明确历史14 reader：

1. 核原Reg4/approvedPlan/B0/B1/339、344和final14 retention及非作者证据；严格保持其consumer14事实和先前13/108/119谱系，声明 `retainedParentOnly/current15Granted:false`。
2. 对原build312的528输入、source420、H2218按344的显式映射读archive，核原编译命令/输出/二进制绑定及原Root/mirror路径的历史事实；档案路径不是原执行路径。旧14 API/Common binary仍在原真实路径且typed stat/rawSHA可核，不要求它们在15之后继续live。
3. 新15只读自己的当前Root source/helper、独立Root/mirror编译和实际15进程；原14全图/current旧guard不作为15活动许可。旧parent任何布尔“已通过”不能替代完整档案、数据、归属及正式审件。

完整parent可以在单次新Root调用前后验证；#118的WeakMap只在该调用缓存已核不可变proof，每效果仍fresh当前15检查。15版不能继承14 capability、cookie权限缓存或完成声称。

## 6. 新15构建、API、观察与状态转移

顺序：先保全并独审14 → 冻产品有限delta和完整新helper/external闭包 → Root/mirror完整source/compile实际测量、fmt/clippy/all-targets/build → 独立ROOT15目录、真实API/Common/SHA/stat → Root明确旧14 owned-PID停用与端口交接 → 新私有API15/readiness → fresh15 state-free双139×2证明等于final14 → 完整plan/非作者G2审 → 新registry/B0/B1及新15状态publisher。15 actual pin在前一实际步骤产生后才填，不使用candidate/旧binary/旧API136/1351代替。

M98无migration replay、无数据库restore或baseline reset。新15的业务baseline仍原M97，schema comparison仍原108链；final14 snapshot仅为保留最新数据的证据。旧14进程计划退休须实际PID/start/boot/exe/cwd/typed二进制及Root退休receipt，不能擅自signal；新15使用新private/env/log及前缀、sequence0，保旧14 prefix/seq24历史，不覆Root14 target。

state transfer必须逐顶层字段白名单冻结，unknown字段拒绝。mint入场对保留域完整相等；普通运行只核不可变parent/resource与当前ledger，不能把owned/actors整体永远deepEqual旧14而阻断15合法login/效果。保留全部owned/borrowed/objects/fixture birth及原proof，不把14 auth贴新15；cookies/permissions、旧currentCandidate/status/auth config/consumerChecks等运行缓存进明确14 history，15从空/真实读取建立。旧codeEpoch252/Reg4等变为具名parent，不能留作active15。原taxContinuation13/Main13及整个失败taxContinuation14原样保留；新taxContinuation15独立承接真实Main13桥，仅做新15实际准备/FI/正常命令，不重POST Main。

资源承接使用原Reg4已准projectIds及真实record的完整projection；不能把旧R3仅准的uiSpare子集扩成全部anchors。15 Main13历史桥仍基于immutable13 before/after/HTTP201/ledger，不要求当前15 owned.latest或旧Main snapshot仍active。

## 7. 必要检查与不重复项目

必须：两业务P2各有实际根因与正反回归（peer仅内部验证不入本项目投影；真future Restatement排除；合法first-period期后派生规则不受损）；新old-bound/current-bound错用、档案遗漏/篡改/alias、14auth出生/归属遗漏、partial伪complete、M98漂移、旧binary/PID复用、状态转移未知字段/旧cache继承、Source15不落旧14/19 guard，以及真实current data/权限/撤控/完整库存检查。原#11840项仍须落实，新15 source/admission新增案例另列，不把14模型结果重标15实际。

新Rust需Root/mirror必要完整编译与相关回归、helper/外置Node测试及实际准入守恒。若Shared/OAS/SDK/UI源码与wire完全未改，做精确hash/ABI/schema机械确认即可，**不重复全部SDK/Admin或已不变业务验收**；若出现真实wire/public语义面增量，先报告Root另定最小验证，不提前豁免。

没有15准备成功、FI、正常提交、性能改善或业务G3/G4声明。当前14失败证据和所有旧seal不变；Root尚未提供的final retention独审、新产品/helper/build/API/registry/运行pin全部为空。
