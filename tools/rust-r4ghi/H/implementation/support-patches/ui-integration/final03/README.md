这是 candidate01 + append02 的完整最终 UI 晋升候选，旧两轮和 Shared128/129/130原件均未覆盖，产品仍由 Root 单写应用。本目录 proposed 共21文件：原10项、一个严格枚举值适配器，以及10项必要的中央旧视图/Store兼容修正。没有新 HTTP、没有编辑 SDK/spec/canonical schema、没有访问数据库或自行签署 G3/G4。

所有现代命令先按当前 canonical RequestSchema 解析，再逐值选择实际生成 SDK 的 enum 成员。没有 any/as-cast、旧客户端金额或手填服务端身份字段。来源/版本/hash、必填 null 和可选字段的有无均保留；角色非零权重的可选 zeroWeightReason 也保留原有缺省，零权重由正式条件 schema 要求真实说明。17种命令覆盖 G、H、I、回款依据和角色编制/冻结；SDK05 的真实 startExecution/startAcceptance 路径参数均为 id，关闭条件使用 id:conditionId + completionRecordId。

EO 的执行准入直接读取本次 FullProjectDetailView.executionAdmissionContext，同 detail.projectRowVersion 提交；它不再发 Role GET 或要求 commission 管理权限。本人条件任务独立路由首先读取 completion list，真实 TaskRow 的双 UUID 逐层传到既有 R2 create-session completionConditionContext；之后步骤只使用真实 sessionId。上传选择态只持有真实 link/attachment/checksum/fileName，服务器冻结后才有版本。本人与全项目接口分别受范围约束；本人页不读 ProjectDetail、financial、附件列表或历史。

中央接线修正使旧 ProjectStore 只存经过 Full 分支判定的项目，scope 不足时清空而不 padding。旧 workspace/commission shell、详情的 timeline/archive 跟随真正 Full 读取之后加载。旧归档按钮加真实项目/记录版本和现代 tag，沿用既有 route。旧 action 展示只按服务器动作显示，空 allowedActions 不再被翻译成可进入下游；只读 enum 文案用实际 wire key。角色 current|null 的旧 Observable 强转已去掉，缺角色是真 null。

Shared130 保持 Root 晋升后的原始 SHA，SourceContext/附件 context 没有在本组候选中重写。回款表单继续消费 G receipt-basis 准备的真实 ready Term、其实际 Commercial、Attachment refs；没有浏览器净税公式、UUID/hash/币种/税率输入或 JSON 文本框。全部写入仍由服务器资格/版本/证明判定。

真实检查：Root SDK05 经完整固定 JAR + 规范绑定修正的实际682文件；本候选虚拟 overlay 的完整 apps/poms-admin/src/main.ts Angular22 ngc 0诊断、template0、1012个实际产品输入前后 SHA 相同。109项实际 SDK enum + canonical Request 解析/等值断言通过；24项实际 Root canonical130 的回款和 server EO context 纯组装/调用边界单元通过。null-only负例现明确拒绝0和缺必填，允许null并能收窄到literal null。所有 fixture 单元都不是 Actor/HTTP/数据库验收。

此前 SDK05 修复前的106诊断、3个生成缺陷和 numeric-null 反例保留 evidence-before-sdk05；未把旧 SDK 失败改成成功。Root repair-generated-models 的非作者只读审查为实际689来源支持子集 static PASS，内存dry70处、7项纯工具单元通过；实际 SDK --write/--check/PS适配由Root另存证据，不属于本组 UI 成功声明。

manifest03 提供当前 Root 原始/候选逐文件 SHA、两原候选来源、实际编译输入闭包和结果。请先核 Root 原始字节再拷 proposed；若 Root 同期另有产品修改，应重基而非覆盖。本组没有运行 ng build、浏览器真实 DOM、实际 upload/HTTP/PG；Root 应用后统一完成这些检查。完成前不认证集成就绪、不关闭 Issue。
