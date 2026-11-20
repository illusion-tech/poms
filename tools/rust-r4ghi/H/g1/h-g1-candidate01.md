# R4H 联合 G1 输入审计候选 01

状态：**G1 候选，NOT_ADMITTED，未实施**。父 Issue #110，H #112；公开范围 8 个既有 HTTP，新增 0。工作树 `E:/projects/worktrees/poms-r3hijk-next28/poms`，分支 `codex/poms-r4ghi-next25`，基线 `aaa4b16ac66092f0cb1dc6646a02cf14e80823ee`。通过只读 `.git`/HEAD/ref 核实，没有执行 Git/GitHub 命令。当前范围文档记载 Rust 正式 240、R4 67/92，余 25；本审计不认领新增交付。

本次只写本目录，不修改 apps/libs/docs/shared，不启动 DB/API，不读取凭证。目标配置 `gpt-6.1-sol/max`；工具未提供可独立核实的实际模型/effort，Fast 未核实。

## 1. 精确 HTTP 输入

8 项均需 `contract:finance:manage`、`pomsSession`；POST 还须保持共享 CSRF。成功响应均 200。canonical inventory 286–293 全部 `aligned`，无 slash-action/project-scoped alias。完整请求、参数、主 schema、返回 DTO、源 hash 在 [operations01.json](operations01.json)；54 项原字节 SHA256 在 [source-manifest01.json](source-manifest01.json)。

| operationId（均以 `ProjectCostController_` 为前缀） | method/path（完整 `/api`） | 输入 DTO | 返回 DTO |
| --- | --- | --- | --- |
| reviewOperatingSignalEvaluation | POST /api/operating-signal-evaluations/{id}:review | ReviewOperatingSignalEvaluationRequestDto | ReviewOperatingSignalEvaluationResultDto |
| getOperatingSignalEvaluation | GET /api/operating-signal-evaluations/{id} | 无 body | OperatingSignalEvaluationViewDto |
| reviewCommissionGateBinding | POST /api/commission-gate-bindings/{id}:review | ReviewCommissionGateBindingRequestDto | ReviewCommissionGateBindingResultDto |
| getCommissionGateBinding | GET /api/commission-gate-bindings/{id} | 无 body | CommissionGateBindingHistoryViewDto |
| getProjectBusinessOutcomeOverview | GET /api/projects/{projectId}/business-outcome-overview | 无 body | ProjectBusinessOutcomeOverviewViewDto |
| getProjectUnifiedAccounting | GET /api/projects/{projectId}/unified-accounting | 无 body | ProjectUnifiedAccountingViewDto |
| getProjectVarianceRiskExplanation | GET /api/projects/{projectId}/variance-risk-explanation | 无 body | ProjectVarianceRiskExplanationViewDto |
| getBusinessAccountingFeedback | GET /api/projects/{projectId}/business-accounting-feedback | 无 body | BusinessAccountingFeedbackViewDto |

请求当前包含客户端成熟度/成本建议或 gateAction、版本字符串；`expectedVersion` 可选。冻结正确性时不能允许这些字段成为客户端生成结论的入口。权限是操作权限；H service 未发现项目级数据范围校验，也不能将 finance manage 当作敏感字段授权。

## 2. 当前实现的关键阻断

- **无真实 producer**：业务 service 只读 DMER/OSER，gate review 只更新既有 binding。`database.seeder.ts:1934/1967/2014` 直接 INSERT 成熟度/信号/binding；现有 E2E 从这些固定 ID 起跑。详见 [producer-search01.json](producer-search01.json)。它可证明既有 query/review 路径，不能证明业务生成链。
- **来源断言不足**：信号复核接受客户端成熟度/成本建议/任意版本（service 1429–1460）；gate review 接受 action/基线选择/版本并改写（1547–1554）。摘要只校验存在、active、key（2626–2640），未锚定项目/阶段/binding/快照/hash。Rust 应按正式业务修复，不能追缺陷等价。
- **并发与原子性不足**：信号 review 只追加 child，不更新父 evaluation rowVersion；gate binding 和 review 两次 flush，service 此处无整体事务；gate review 表没有每 binding 单 active 唯一约束。需要真实 CAS、同事务、幂等与单 current。
- **混版本反馈**：反馈先取最新快照上下文，再取全项目 active bindings（1795–1844），可能把旧 binding 的 signal/tax 与新快照的成熟度/版本拼接；并列原因也不能随机只取一条。
- **schema 不能表达正常**：signal 只有 `attention/alert`，risk 只有 `attention/risk`（shared-contracts 9331–9355）；正式设计有正常状态。提案补 `normal`，不得用 attention 冒充正常。
- **敏感出口有遗漏**：详情和复核返回 raw 税务摘要/金额/复核文本；四项目视图仍有 raw allocation/unmapped/recommended 文本，未处理 labor taint。Root 必须冻结 DTO 投影及写侧敏感守卫。
- **业务阈值尚未冻结**：“未映射过多/税务过高/较大异常/明显跳变”无可执行阈值。保留明确人工复核与策略版本，不虚构百分比。

## 3. 真实生成链与跨线接口

候选链：**真实 G 快照及来源包 → L2 稳定成本判断 → DMER → OSER/项目动作 → 四阶段经营 gate 建议 → 人工复核/摘要 → 六个 GET/既有 UI**。禁止以 fixture、直接 SQL 插入评价结果或客户端提供结论完成验收。

与 G 已同意候选签名：`evaluate_with_session(session, snapshot_id, expected_row_version, expected_source_hash, actor) -> HOperatingEvaluationRef`。G 持有外层事务；H 在同一 `CommonSession` 重载已落盘 immutable provenance，并校验项目、版本、hash，不另开连接/提交。G collector 收集纳入/排除/待确认分类、receipt 净税 basis、F 分摊/阶段/税务证据及 hash、币种、基线/重述引用、containsLabor。H 给出唯一纯函数 readiness 策略，G 调用并冻结输出，页面不重算。共享入口与文件由 Root 冻结。

H 返回 DMER/OSER/四 binding ID、output/source hash、policyVersion、项目动作及所有并列主因。G 的 current 发布与 H 生成必须同事务；若允许先存 incomplete 快照，必须有不可冒充稳定 current 的明确 uncertified 状态。I 只引用同一版本的经营摘要；I 的业务完工/资料归档不等于最终结算，也不让 H 等待 I completion 或未来 R5 payout。

## 4. 金额与规则候选

- 每金额层区分 `known(decimal-string)` 与 `unknown(reason,evidence)`；已证明的 0 是 known，缺记录/税 basis 缺失不是 0。错误项目/币种、破损 hash、矛盾事实拒绝并回滚；合法但不完备的事实可产明确 `missing-evidence`、uncertified 结论，禁止假正常。
- 正式毛利是**确认回款未税 − 纳入口径成本未税**，分母是确认回款未税。已知零分母返回无有效毛利率；未知分母返回缺依据，不从合同金额、当前税率或现金额倒推。G 已报告 Node 合同额公式漂移。
- 必要对象/净税层 unknown → `insufficient + review`，保留全部缺口。依据完备但存在未映射、待确认、税待闭合、分摊待冻结或重述未闭合 → 候选 `preliminary + review`。全部闭合才 `mature + prompt`；权威 L2 BLOCK 不可降级。
- 项目动作先取 L2 costAction 下限，再聚合每个有效 L4 信号，按 `block > review > prompt` 取最高并保留并列主因。比例在 maturity 非 mature 时标“暂不稳定”。回款比例 `<20%` 只观察；毛利率 `<-100%` 或 `>100%` 进入极端值复核。跳变阈值未决。
- 成熟度不足与经营结果差必须分开解释。材料“过多/较大”的人工判断须引用策略版本和证据；不凭页面文本改数据事实。

正式阶段矩阵（来源 `phase2-business-accounting-feedback-rules.md` 8.5）：

| 信号 | first | second | final | retention |
| --- | --- | --- | --- | --- |
| insufficient | prompt | block | block | block |
| preliminary | prompt | review | review | review |
| 回款比例 <20% | prompt | prompt | prompt | prompt |
| 风险 attention | prompt | review | review | review |
| 风险 risk | review | block | block | block |
| 历史重述未确认 | review | block | block | block |
| 极端值 | review | review | block | block |

每阶段按全部命中信号取最高并保留并列主因；不能把项目 `currentActionLevel` 直接复制成四个阶段 gate。独立 L2 BLOCK 如何补充该矩阵还需 Root 冻结，建议至少 first review、后续 block。人工复核保持系统结果/复核记录双链；普通复核只确认或收紧，解除来源 blocker 应收口真实上游并重算。若允许例外降级，须有同链批准证据、授权人、原因和失效条件。

## 5. R4 / R5 边界与整体事务

R4/H 负责经营评价、阶段经营建议、经营人工复核和同链场景摘要，不计算提成、不冻结角色、不登记发放。R5 后续消费精确 binding/review/summary/provenance，加验角色冻结、发放上限/制度规则、质保期/到账/争议/例外等；它只能维持或收紧经营建议。经营 producer 直接依赖 R4 confirmed handover/source facts，不能把未来 R5 freeze/payout 设为先决条件造成循环。Node retention 消费 final binding（approval service 693–785）是既有漂移，不作为 Rust 采用 retention 混用的依据。

同一外层事务必须包含快照发布、DMER/OSER、四 binding、旧 current 切换、review、approval summary/field projection/payload、必需 audit、认证 participant flush。任何一步失败整体回滚；敏感 GET 必需 security event 失败时不返回数据，不 raw fallback。按项目/源的固定顺序锁、校验 hash/版本并 CAS，review 也递增父版本。DB 单 current 配合幂等 receipt，重复同 payload 返回既有提交回执，异 payload/旧版本冲突。COMMIT 异常不报成功；本批不以普通故障注入冒认真实 lost COMMIT ACK。

现有可复用机制：Rust `contract_support/http.rs:236–339` 的共享授权/外层事务与认证最终 flush，`approval_common/service.rs:294+` 的摘要场景定义校验，R4E whitelist 与 R4F `projection.rs:35–143` 的借用 session/security event fail-closed。含 labor 或血缘未知的可逆字段组，建议同时要求 operating-finance/labor-cost-rate 敏感权限，防差额反推；audit/摘要只保留授权投影或不可逆引用。

## 6. Root 独占公共文件的提案

DDL：producer/policy/source/output hash 与 immutable basis；known/unknown/missing reasons；DMER/OSER 同项目同快照完整性；gate_stage CHECK；gate review 单 active；review 父 CAS；同链摘要 payload；幂等 receipt。保留历史，不原地改系统结果。

共享 DTO/spec/client：补 normal、gate stage/decision enum、必需 expectedVersion 与 source 断言/幂等语义；可回显/操作所需 rowVersion、evaluation/DMER/snapshot/binding ID、hash/policy/certification/missingReasons；feedback 输出四阶段；所有可能泄漏金额/人工文字出口使用 projections；注册真实 `commission-gate-review` 摘要 definition/package/projection/export，不复用 `operating-signal-commission-gate-e2e/e2e-v1`。

既有 UI：展示真实快照/版本、未知/待补/失效/未认证、系统与人工结论、正常/关注/风险、四阶段建议和敏感遮罩；接现有 review 命令，按钮空不能解释为“可发放”。上述均为提案，未修改公共文件。

## 7. 最小验收矩阵与待裁决

完整机器矩阵在 [h-g1-candidate01.json](h-g1-candidate01.json)，均 `planned-not-run`：

1. 真实 A–F→G→H→人工复核→六 GET→原页面链，禁止 seeded evaluation/binding 验收；金额例 100.00−60.00=40.00，比例 40%，含零/未知。
2. 七种阶段信号、normal、并列主因、L2 floor、20%/-100%/100%边界、历史重述与来源替换；历史不可重挂新口径。
3. 逐点 audit/auth/summary/projection/current/producer 故障，验证业务/认证/审计整体回滚；敏感 GET 事件失败关闭。
4. 双 producer、双相同 CAS review、producer/review 与源替代竞争、幂等同/异 payload，验证唯一 current 和无孤儿摘要。
5. session/CSRF/操作权限、finance only、两种敏感权限四组合、无敏感授权的管理员、labor/非 labor/未知血缘；覆盖 raw/free-text/audit/summary/差额泄漏。
6. I 不等 R5 payout；R4不宣称已认证未来R5硬 guard/冻结/发放。

待 Root/用户冻结：零事实的真实证明和必要对象判定；材料“过高/过多/明显跳变”版本化策略；低回款时负毛利与独立风险的关系；normal/unknown/projection DTO 与正式摘要定义；普通人工复核能否降级及例外权限/失效条件；独立 L2 BLOCK 的阶段矩阵下限。已发出的三项跨线裁决仍待答，不依默认通过。

本次只完成静态输入审计：54 源 hash、8 精确 operation/inventory 对齐、6 producer searches。未跑 DB/API、build/lint/migration 或业务验收，未宣称 G1 Pass/G2 准入/G3/G4 完成。后续须 Root 联合复核、业务裁决及独立 G1 后，才在独立 worktree 实施。
