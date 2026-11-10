# H15 policy / role / Labor：有限 G1 提案

仅 proposal，未授权实施或执行。H3 固定新增五叶；必要的角色设置继任只新增两个外置文件。原14/H2218、257严格完13条件、原13 partial、344 code01/02及其它封件均不改。Root 冻结本提案后才可 author code；实际 Reg5、B1、API、H3、Tax、equal/above、Role、Labor targets 与审件仍为空。

## 文件与范围

精确路径、原 edition、派生原件 rawSHA、操作和职责见 `file-scope-H15.json`。五条 H3 均为 ADD，before=null、after=null，不能把派生源的旧SHA冒充新路径的 before。五叶是：

1. `business/policy-security-runtime15.mjs`：新的严格15私有 binding loader / current runtime verifier；只调用 #119 的 typed15 admission ABI，保完整源/完整H3/新API/B1/ROOT15 Common/Node/私有文件及nonce边界。原257不放宽，不把ctx15传给旧252/257。
2. `business/policy-security-bindings15.json`：与新runtime一致的 immutable null业务模板。身份明确15，其它实际绑定全null；不能 post-mint修改模板。
3. `business/policy-current-h46-15.mjs`：原13 partial桥与新15 continuation proof的严格消费者，不发送HTTP或制造结果。原13仍partial，不要求所有旧stages verified，也不能补record.result。
4. `business/labor-mask15.mjs`：保47已审的完整transitive scope、M/E配对projection和必要audit算法，仅改typed15环境/桥/新角色与新proof identity。支持prepare→STOP→独审→matrix/audit；period/mixed之后重新prepare完整当前目标。
5. `business/labor-mask-bindings15.json`：新runtime/真实source lineage/actor/角色proof输入全null的业务模板，不承认旧14 binding。

外置新edition为 `tools/rust-r4ghi/policy-role15/`，只新增 `setup-role15.mjs` 与 `input15.template.json`，不入H3。原287-code03的 `role-fixture47.json`（fe69…）在原路径逐raw受pin保护、作为closure依赖直接读取；不复制/重标第三个runtime产品。旧script4eddd…、input648ca…及fixture完整pin均在文件表。新script必须保持原strict preimport regular/no-symlink/realpath/nlink1检查，nonce先于createContext及状态读取。

四外置caller、Tax15 reader、118六叶与sidecar消费另属G1-C；这里不修改或新增它们，不实现其内部逻辑，也不在本提案预留“必要其它文件”。

## 唯一准入 ABI 与绑定

正式依赖是 I #119 proposal02 的 `ABI15-v1.json` 91f4fcf8…及 `deferred-ABI02.json` ebff8b51…；它们仍是待Root冻结/实施的提案，不是实际准入。

新runtime采用 schema5 / `g2-business15` / `main01` / M98 /139；current source/full-H3 pins、API binary/process、B1_15、trustedSummaryBinary及Node均来自实际当前Reg5和已审build。B1不能以consumer.candidateReceipt/B0代替。调用 `currentCodeRegistry15`、`effectiveHelperPins15`、`assertRuntimeBinding15({codeAdmission15,candidate})` 后严格核其 `admission.registryPin / producerState / helperPinsPin`；按实际冻结的central state shape处理codeEpochAdmission15，不发明旧252别名。

`sourceBases`是当前source完整数组与当前helper完整数组的精确并集，逐实际普通代码叶核raw，不只验入口两叶。私有 binding由raw pin/containment绑定；加载后重核，不容调用方改变expected pin、source集合或root。新Common只经 `trustedSummaryBinary15` 的typed build/Reg5身份取值，禁止ctx override、旧ROOT14或旧13 fallback。runtime必须允许中央已证明的owned active FI进行验证/撤控；effect入口的idle检查不能变成全局cleanup锁死。

当前ABI只给出active字段名，若最终 `codeEpochAdmission15` 内部对象形状或B1细节未封，直接列待冻结，不采用猜测alias。actual值不从latest目录、旧缓存或作者说明推导。

## 保留来源与新15 H46

H46的已知原件是 project `d30c0da1-692e-4e7e-ba2c-ad81ad8898f0`、原13 partial SHA97928d11…；H01/below19.99/H04真实已完成，equal20.00/above20.01未执行，原stopped节点和所有失败链不抹。新15通过 `assertRetainedFixture15` 核 `/fixtures/hPolicyCoverage26` 的整record、原born13与registered partial receipt；`retainedProducerState`必须是Reg5的final14 state，`originalProducerState`必须是真13 frame，不能把final14叫13。

新15 read-retained仅真实GET旧事实；equal/above由另G1-C caller各产生真实0.01回款/确认和唯一新G，H值、成熟度、cash累计20.00/20.01均服务端派生。原13 record不写；新消费者记录和结果必须独立15身份、保born13、originalProducerComplete=false、original317Replayed=false。新验证器逐HTTP原件/ledger/phase/current tuple核，不以bool或旧14 result代替。

Main13固定pointer `/taxContinuation13/mainCompletion`，original `000054-tax13-main-actual-success.json` c075de72…/4524B；只经 `readRetainedCommand15` 承接实际13 HTTP201及冻结state，并单列retainedThrough14。保原完整pin（包括bytes），不要求历史行仍active或owned.latest仍旧值，不发送Main13重放。

真实equal/above driver和proof envelope的15细节由G1-C与本validator联合冻结后才code；本提案只列新validator职责，不生成实际continuation或假15覆盖。

## 角色设置：一次公开命令与严格旧值

前置必须是实际Tax15完整成功（完整FI proof、normal201及sidecar）与上述实际新15 H46完成。新state清空cookie/permissions cache是合法缓存失效：不能在fresh login之前把[]当真实权限事实，也不能依赖final14 actor cache恰含old2。旧事实取真实retained row/birth，当前权限由真实15 login/current-auth和Role/User GET证明。

仍是隔离owned EO单人role测试fixture：role001fa53e…、user e7dbe7a0…、旧2为project:read/project:write；只新增contract:finance:manage与operating:finance:sensitive:read，完整4必须实际fresh current-auth，labor-cost-rate:sensitive:read绝不授予。M正向必须具真实FinanceS/LaborS；EO是FinanceS=true、LaborS=false。

沿原R2公开 `PlatformController_assignRolePermissions`，params同一roleId，body为完整4项permissionKeys，成功200，仅一次。先核owned role/user/FK及原permission children，fresh M/EO真实认证，Role/User读取，再capture并核原2的raw/xmin与birth；unknown/已尝试/非精确旧值立即STOP，不幂等重发。真实after/ledger必须只有两条精确新permission child出生（assigned_by/created_by=M）、一条原R2 separate audit事务，旧2不删改、role/user/FK不变；必要的auth仅实际绑定session原允许列/真实事务。保持atomicClaim=false，不把多TX旧R2说成原子。

新proof/input/entry精确绑定，不接受旧257/287 kind、旧Source14 pid/cookie或仅真假标志。新record独立15 namespace，未知提交保原件及reconcile-required，不清producer flags或自动重试。

## Labor：完整scope与审计

旧来源仍是 `/fixtures/sharedSourceFollowup58` / stage branch的真实Labor ancestry，producerReceipt取原input40；通过Reg5承接真实born12 / project birth10，retainedAt14与original12 frame分开，不把15当producer。两project完整Full scope、完整source members/继任/全部snapshots、current heads、H/4gate/summary、所有period和terminal都需实际fresh核；另有project/缺scope/legacy不明就STOP，不能裁批次或补SQL权限。

M同operation/target/query逐path作正向配对；EO隐藏所有传递Labor敏感字段、schema raw字段强null，FinanceS允许的独立非Labor财务源保持与M相同Full值。full-null/not-applicable例外只在M同path真实absent/null时成立，不以自报label豁免。非平凡金额sentinel、summary field package、target/type、details允许键及actor/request/project绑定均保现47规则。

prepare捕获完整当前inventory后STOP，Root逐exact scope审准，再matrix。实际period/mixed之后另行prepare，旧0period不算正向、新targets不可沿旧fingerprint跳过。actor/session或任何领域fingerprint变化需重新prepare和审，而非重用旧scope。当前所有目标数组/proofs均null。

必要audit沿现真实GET及独立一击required-audit fault/retry，canonical500必须严格无financial/raw额外字段；失败全rows/xmin回滚（audit/security不能豁免，仅精确cookie-bound raw session五列），成功必须真实masked security_event/details。基础runtime允许中央exact owned FI验证/撤控。现generic faults.mjs无epoch14 gate，本提案不增加第六H3 MOD；若最终15中央/reader存在不兼容，报具体阻点另冻，不能弱化审计或偷偷加分支。

## 未冻结依赖与执行顺序

`dependencies-H15.json`列明固定Tax15 completion reader / 118联合consumer的module/export/返回字段、注册及原始全callerInput proof尚未冻结。旧H257完整Tax14 reader不适用于15；不能使用h15-287身份去验证角色自己的不同input，也不能通过reader/h/read callback注入。

Role/Labor可验证已注册上游H46 input及其独立registration的只读Tax证明，或使用Root另冻的专门消费形式；这必须由G1-C先明确合法路径，本提案不选择假alias或自动新增第五consumerId。无该ABI则Role/Labor effects代码不可称ready。原4caller仍另G1-C，旧APIv2仍旧14未交付提案。

Root最终顺序：#119代码/完整有限H3及产品独审 → 实际15 build/API/观测/Reg5/B1 → 15 Tax完整准备/closed FI/独审/唯一normal201 → 新15 H46 read/equal/above完成 → 新角色一次公开设置+fresh4权限 → Labor prepare STOP/矩阵/审计；period/mixed后重新prepare完整矩阵。具体期间/legacy负例的先后依其它已冻方案，不能本片先消费或重放它们。

H贡献H3恰+5、无删除，旧218内全部14叶保留。加I119 core-only +4可算已知子集227，但不是最终H3计数；Tax15/prepare/其它有限后继贡献仍由Root最后显式合并/实际测量，actualFinalH3=null。两个外置角色叶及原fixture依赖入external execution closure，不能挤backend source/compile或H3 count。最终Reg5发布前一次冻结完整并集，不能mint后热添helper。

验证清单见 `test-design-H15.json`，当前仅设计，0 tests/0 effects/G3G4 false。未来代码必须用真实已封15 central/reader接口组合及窄OS-live seam标签，不用全API stub伪造返回shape。Root/独立复核拥有实现及每actual输入的最终许可。
