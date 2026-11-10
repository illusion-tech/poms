# Tax14 单次调用证明复用：技术 G1 提案02

仅提案，G1未冻结，未授权实施或执行。01 manifest `57254961eab1602ebd9b722568fdfd2203c7759a71e03d6e69f49eada0ae1835`及其全部原件保持不动。本文件与01的原设计边界共同组成02；以下内容明确替代01中“仅单族”“没有批量FI入口”“每族另一次G2”“每次FI后即关闭调用”的表述。其它6叶/原能力签发/逐效果fresh检查/受限view/未知与撤控/无H2无patch/新执行者provenance及consumer sidecar原则全部继承。

## 有界批次与模式

新增 `fi-closed-set`，恢复原A258的完整 frozen-inventory FI 批次。它只执行Root一次exact G2已批准的**实际341完整、有序、唯一key的inventory**，不自动发现新族、不增删、重排、裁剪目标或刷新body/CAS。该批准覆盖整个明确闭集，**不要求每个正常推进的族再开一次进程或另批G2**。正常201仍是独立 `commit-once` exact G2。

保留 `fi-family` 作为单族精确恢复/补验模式：须另有具名Root exact review，绑定完整inventory、唯一获准族及明确已知结局；不得仅凭crash/pending/unknown自动重发。`verify-committed` 和 `disarm-owned`原范围不变；仍没有prepare或Main入口，不干预当前prepare76985。

六个拟新增外置叶不变：run-tax14-once、invocation-proof、retained-tax-proof、tax14-once-effects、tax14-once-wire、tax14-once-ledger。原reconcileAttempt仍直接复用，只迁出assertRecorded的108 loader重入口；不扩大复制范围。

## Root exact G2的闭集内容

新增私有 `approvedClosedFISet` pin；其内容和 exact input review必须共同固定：

- 实际341 preparation、body原字节/hash、完整scope/全部targets、实际full inventory原件pin和规范内容hash。
- `orderedFamilyKeys`严格等于该实际inventory数组的完整key顺序；每项必须唯一，完整descriptor由实际inventory按位置取得，不能另从客户端同名对象替换。
- 新外置codeReview/executionSources、actualH2/source420、Reg4/B1/API/binary、actor及允许的认证策略、nonce、mode和entry state。
- fresh批次从cursor0开始。若已存在实际执行记录，必须由**新的Root exact G2**明确批准完整已验证prefix的全部原件pin与下一cursor；剩余项只从原完整数组派生，不接受任意suffix作为新inventory。只有源链、body/targets/inventory与已验证prefix仍完全一致时才可续验；未知结果不属于可批准的“已完成prefix”。本提案不自动作此判断或签恢复批准。

空、非完整数组、顺序不同、重复key、缺descriptor、额外族、实际fresh派生集合变化都在下一效果前STOP。实际inventory暂未完成时不能预填数量或内容；proposal模板继续全空。

## 单次调用与阶段能力

整个这次批准的closed FI set只执行：入口原createContext/完整252 **1次**，退出原assertCodeEpoch/完整252 **1次**。Tax特定完整纯闭包在两端保留；普通族间不重跑immutable archive/schema108/旧Node二进制校验，不再次createContext或mint新epoch。

私有WeakMap值额外保存不可变 `approvedSetPin/fullInventoryHash/orderedKeys`、currentCursor、当前family frame和已验证prefix。整个调用只有一个Root pid/boot/nonce能力；每族另有不可导出的阶段子能力，绑定 cursor、key、descriptorHash、requestId、bodySHA、actor/session、before/after pins及control identities。

每族严格经过：

`ready(i) → authenticated → beforeCaptured → controlsInstalled → requestPending → responseRecorded → controlsRemoved → afterCaptured → reconciled → familyVerified(i)`。

只有实际完整响应、精确primary1/fallback0、OID/撤控、139×2全域rollback与原ledger/语义全部成功，且该族原件和verified journal已真实persist，才允许私有 `advance`：撤销旧族子能力，将cursor单步变成 `i+1`，重新进入 `ready(i+1)`并重新执行全部当前检查。不得跳序、回退、一次跨多项、替换approved list、复用上一族request/control/capture，或把已执行族再次POST。

若在记录和cursor推进之间崩溃，所有已写原件保留；新进程没有旧WeakMap能力，不能自动推断“未发生”或自动补发。必须由Root据真实原件做exact恢复判定。`fi-family`亦不能豁免这一点。

## 逐族fresh检查与STOP

01规定的**每次HTTP/DDL前后**检查一项不减：真实source420、H2 218和外置全部源；API PID/start/boot/typed binary；每连接DB/role/OID/marker/namespace/M98；实际prepared body/全targets/全inventory与版本；真实actor权限、cookie/CSRF/session期限；完整139×2 raw/xmin/meta/seq/objects、归属ledger；实际control OID/函数/trigger/sequence/ACL/owner及命中；原rollback/final语义断言。

族间复位不是恢复入口，也不重置安全状态。只有无active controls、无unknown/pending、前一族全部verified时才能开始下一族。若明确G2允许在安全族间执行真实登录，则认证仍须走同样fresh检查及原始记录；这不授予重发领域命令、清除unknown或改变cursor的权限。否则真实session过期即STOP。

首个transport unknown、错命中、未撤控、归属/语义失败、prepared drift或当前身份变化都停止整个闭集，不再尝试后续族。仅执行仍满足全部当前/catalog检查的必要exact-owned撤控和实际观察，保存partial/uncertain/journal；不能吞异常继续、把未执行项写成跳过通过，或改写原错误标签。撤控检查本身不满足时保留active/OID证据给Root具名恢复，不强行drop。

## 批末与正常命令隔离

全部族完成后先保存 `all-families-verified-pending-bookend` 原件及完整有序结果。经退出完整252书挡和Tax纯闭包通过后，才封FI complete：完整scope/inventory/bodyHash、有序每族before/request/response/control/after/ledger/rollback原件，所有keys恰好一次，normalPOST=false，并记录本外置执行闭包/sidecar。

若书挡失败，保留真实已执行族和结果，批次不签完整成功，不自动重发已验证族。部分已执行并不等于后续族已批准通过。

封完FI立即STOP，交Root/非作者审。`fi-closed-set`能力不具有normal POST权限；即使最后一族成功、持有body或FI完成pin也不能调用commit。正常201必须由独立exact G2的 `commit-once` 执行，入口核全部实际FI原件和完整集合；仍只一次同体201、先保存成功再断言，之后任何书挡/语义失败不重POST。

## 影响与后续验证

重校验固定成本由约 `2×N` 次完整252，降为一个已批准闭集的 **2次**；逐族真正当前检查仍按所有实际效果次数执行。没有预称具体耗时或session一定满足；须同机同源实测。恢复的是原有批量FI可执行性，不是无限自动化或新增业务权限。

补充设计负例见本包矩阵。重点为完整顺序/descriptor绑定、cursor单步、旧子能力失效、verified-prefix不重放、首失败后零后续POST、书挡失败不签FI、闭集能力不能commit。矩阵仅设计，未实施、未运行。Root仍需完成Issue/G1、代码独审、实际完整341包和closed-set exact G2；normal另审。H2/Reg4/B1/epoch/Root/旧封件不变。
