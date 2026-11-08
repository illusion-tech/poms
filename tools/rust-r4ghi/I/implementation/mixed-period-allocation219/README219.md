# 真实整批分摊与混合期间重述 219 提案

本提案属于本批既有 G1 A06 的验收补件，不新增公共 API、DTO、迁移或业务范围。所有文件均在 `business` 之外；H1、416 产品来源、原 R3/H0/B0/B1、schema108 和已有验收原件不改。

本目录未执行 SQL、HTTP、进程操作或活动 state 读写。作者测试是纯文件或合成数据检查；固定 217/216 数据只用来确认旧真实费用批次具备所选受控案例，不表示未来 Tax、期末、工具 119 或混合重述已成功。

## 范围与输入

采用真实 Tax Expense 分摊批次，原两项目权重 2:1，显式完整调整为 1:1。保持原实际成本、税务判断、币种、源日期及源金额。最小正向案例要求当前仍为未税计量，净、税、含税三层已知且均为偶数分；因此每份金额可以按精确整数分核为一半并验证三层守恒。事实变化时立即停止，不改金额、口径或日期来满足工具。

Root 必须在实际 Tax 完成和 206 真实香港 W45 期末成功后，填入当前 active basis、完整 H1/119/B2、全部 416 来源及 API136 原进程的真实私有 pins。全空模板不能执行。原期间终端作为 primary，全部其他适用 live/period 终端由真实公共准备接口枚举并逐目标交叉核对；再用完整已封存行独立检查终端集合，不裁剪目标。

`AllocationCorrection` 使用真实 `basisRef`、全部 `sourceCostRefs`、两项目全部 `projectShareItems`、每个 current result CAS 和真实调整原因。没有 E 成本插入、税务口径变更、伪造附件、调时钟或回填业务时间。

## 四阶段及恢复

1. `prepare`：规范真实登录和准备 GET；校验每份原始请求、响应、日期、来源和目标；从当次 full snapshot 导出完整必要写清单，停止交 Root 独立复核。
2. `fi-only`：固定原 body、hash、CAS；安装点重新从实际 before 导出 facts/inventory，不接收 client SQL 或随意 descriptors。每项实际 FI 必须主命中 1、后备 0，完整双库行/xmin/metadata/sequence/objects 恢复；真实 raw session 触碰另标。完成后停止，不发正常 POST。
3. `commit`：Root 独立审批的 FI 原件再次逐项复核后，唯一一次同体正常 POST；先存真实成功原件，再验证全部 F/G/H/audit/auth 在同一事务，原期间和冻结事实不变，live current 只移到自己的 successor，period successor 保留原期间根和原窗口。
4. `read-verification`：仅对已确定成功补核后置条件与真实 list/detail/snapshot/period GET；不会重 POST。`disarm-fi` 只删除经过原 OID/definition/owner/ACL 核对的自有控制，保留 pending trial 供 Root 调和，不表示可重试或已回滚。

nonce 独占锁在构造 context、活动 state 写入或 HTTP 前取得。私有输入及七个外部执行模块均按原字节 hash 绑定，无裸布尔批准、源码重导向或 monkeypatch。

## FI 分支等价映射仍待独立批准

完整 normal inventory 始终包含全部目标与全部实际必要行，并以最终 changed-row union 核对，不因 FI 代表选择减少。

另列的是 **proposed FI branch-equivalence mapping, pending independent approval**，不能解读为 G1 已豁免任何必要写 family。候选包含主 period、每项目的 period/current-live/noncurrent-live 实际分支、实际最末目标，以及全部非目标重复 F/audit/旧 binding/receipt/auth families。每个未逐目标 FI 的 normal descriptor 都记录所选代表、相同 table/event/source、project/period/current 分支签名，以及窗口、head 版本和来源单位数量差异。

真正进入 `fi-only` 前必须绑定 A 或 Final 对当次 prepared pin、完整 normal inventory SHA、FI 清单 SHA、映射 SHA 的独立原件；其中须确认全部未选项已映射、末目标已包含、同 SQL/guard 路径已核以及差异已接受或已补代表，并附实际分析原件 pins。没有此原件不能发效果请求。审批也不授予业务 G3/G4。

## 独立外部 HTTP 与控制顺序

219 不调用任何旧 live-only FI writer/kind。它只复用冻结的纯 selector/matcher/count/final-verifier，以及规范登录、GET、正常请求和 owned reconciliation。

实际 FI 顺序是：完整 before capture → assertRecorded → 从真实源导出并安装自有 DDL controls → 精确规范 POST/原始字节保留 → HTTP 完成或明确传输失败 → 原身份拆控 → fresh after capture → reconciliation。不会先装控制再调用会自行捕获 before 的旧 `api.request`。DDL 仅限 `r4ghi_control` 和真实 owned 表范围，后备位于最终 command receipt；延迟 summary 与最末目标用于核验前置循环整体回滚。

## 后置证明

核对真实整批 successor、精确 1:1 三层分半/守恒、source slots 完整、原成本与 Tax 未变、每个 live/period 的 G/H 全部 recapture、全部旧期末/来源/分类/上下文原件保留。period 不移入 current，当前 live 及四个有效绑定保持各自真实责任链。

实际读取每个重述 detail、新 G snapshot、两项目完整 list，以及各原 period ID。原 period 仍指原根，`latestRestatementRef` 应指向真实期间重述，不沿用 206 的 null 断言。最终列出全部期间与新快照，要求 H47 重新准备和覆盖全部新输出；219 不自行认证脱敏或 G3/G4。
