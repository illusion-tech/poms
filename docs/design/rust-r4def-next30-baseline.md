# RUST-R4-DEF 移交与成本事实联合实施基线

- Gate Status: `Pass`，独立联合 G1 与实际线上冻结已完成；三线 G2 已准入，尚无产品实现或运行验收交付。
- Parent: [#106](https://github.com/illusion-tech/poms/issues/106)，上级 [#101](https://github.com/illusion-tech/poms/issues/101) / [#57](https://github.com/illusion-tech/poms/issues/57)。
- Owner: Root；D [#107](https://github.com/illusion-tech/poms/issues/107)、E [#108](https://github.com/illusion-tech/poms/issues/108)、F [#109](https://github.com/illusion-tech/poms/issues/109)。
- Slice Type: `cross-layer-high-risk`。
- Base: `565661b9113372de4da6662a4a692fbfd2296dd6`；分支 `codex/poms-r4def-next28` 保留已登记名称，不用名称推断最终数量。
- G1 Reviewer / Date: 独立 reviewer / 2026-11-03T20:57:31.034Z；输入提交 `57f64d6c0aef99430acc3b4ed7d99d00074d59f4`。

## 1. 范围

用户先授权 28 个既有入口，随后明确同意补齐真实移交、参与人确认和受控合同变更的可操作闭环，并重核数量。当前候选为 D 移交 7、E 成本基础 11、F 成本治理 12，共 **30 个入口，其中 28 个既有、2 个新增**。受控合同变更复用既有准备、审核和激活操作，新增行为单列受审，不重复计算已交付入口。

D 包含真实移交准备、参与人职责和本人确认、摘要/待办、终结确认、回款判断冻结、受控合同变更及移交再基线化；补齐最小操作界面。E 包含费率、人力与四种真实资金/费用来源成本、费用生命周期和替代。F 包含整批共享分摊、阶段归属、税务处理及其可追溯替代链。

本批不实现后续经营 17、验收/完工/归档 8、完整 R5、部署或切流。移交事实已确认不等于正式进入执行态；后者仍需 R5 有效提成角色冻结和同一事实链。完整 R4 和 #57 保持开放。

## 2. 正式输入

正式输入包括 `project-lifecycle-design.md`、`contract-finance-design.md`、`interface-command-design.md`、`interface-openapi-dto-design.md`、`query-view-boundary-design.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md`、ADR-014/015/016/018、移交和成本相关 phase2 设计，以及当前 controller/service/entity/repository、Shared、完整 spec/client 与真实 R2/R3/R4ABC 生产能力。

原始 28 项 AST/spec/canonical 联合清单为 [surface28-source01](rust-r4def/inputs/surface28-source01.json)，81 个传递 schema，与既有 Rust 210 项零重叠。统一成本 POST 的五种联合请求在 canonical 中有五行，但只计一个 HTTP 操作。两个新增入口须先登记 authoritative inventory，再冻结精确 DTO 和 DDL；未冻结前禁止产品编码。

## 3. 用户裁决与 SSOT

本轮三个明确裁决保存在 [user-decisions01](rust-r4def/user-decisions01.json)。业务正确性、合理性优先于 Node 缺陷级对齐。

1. 补齐必要公共入口和最小操作界面，使移交、参与确认、受控变更和再基线化能够真实操作。
2. 准备人明确指定职责，允许同人兼任；登录参与人只能确认本人职责。移交事实与 R5 执行准入分层。
3. 费用及入账金额为 `numeric(18,2)`，禁止数据库隐式舍入；费率保留四位、工时/人天两位；人工精确乘算后显式 HALF_UP 到分。分摊按精确权重和确定性尾差保证守恒，调整必须完整份额整批原子替代。历史超过两位的金额先审计，不自动改写。

ID 使用真实系统 UUID，日期和时刻分别冻结。原子写入借同一外层 `CommonSession`，必要业务、版本、快照、审计与会话写入整体提交或回滚。全局费率审计不得伪造项目 ID。金额层、来源链和阶段历史必须显式；无依据不得以当前项目阶段、单金额或同合同猜测替代真实来源。

## 4. 命令、DTO 与读侧

D/E/F 精确命令、DTO、读视图、权限及响应状态由三份候选输入提供，并由 Root 统一成最终机器冻结。新路由候选：`POST /projects/{projectId}/project-handovers` 和 `POST /project-handovers/{id}/participant-confirmations`；既有 `:confirm` 保留最终终结语义。准备时显式选执行负责人和参与人，不把销售主责、系统角色第一人或创建者当执行责任承诺。

公共协议以 [protocol01](rust-r4def/protocol01.md) 为准；非作者 G1 预审问题及 Root 收口见 [root-decisions02](rust-r4def/root-decisions02.json)。E 采用修订候选02，原候选01和预审 Block 原件保留。发票来源币种补齐属于本批必要来源机制：原 create/update 增加显式 currencyCode，无合同证明时必填，历史缺失不推测；精确冻结见 Root schema 提案。此举不新增或重计财务 HTTP。

读侧必须从已持久化事实和统一敏感投影生成；页面、确认和交接材料引用相同版本摘要。GET 不隐式创建草稿、确认或变更。不用测试 fixture 或内部 CLI 代替缺失的用户流程。

## 5. 持久化与生产机制

DDL 先冻结再编 migration/entity；当前字段、DDL 差异、复合归属、唯一当前和替代约束须逐项对齐。受控合同变更借原有真实准备→精确审核→激活链，旧 Active 合同/快照保留至新版本原子生效；amendment、preparation、review、before/after snapshot 精确绑定。

成本来源保持 REGISTERED / CONFIRMED / INCLUDED 的不同含义。本批登记和确认的成本不自动纳入经营口径；未来经营片负责显式纳入和同经济事件防重复计量。已确认成本必须具备真实阶段依据并锁定，不以必须已移交作为签约前成本的统一前置。

## 6. 并行归属

Root 独占公共契约、错误/事务/审计协议、路由注册、迁移入口、生成物、正式治理、Git/GitHub 及真实环境。D 独占移交和经冻结的合同变更扩展；E 独占成本基础；F 独占成本治理。G2 使用隔离工作树、构建输出、端口与数据；具体文件白名单随最终 G1 冻结。

子代理显式 `gpt-6.1-sol` / `max`；Fast 未核实。三线可并行实现，F 实际验收消费 E 真实成本及适用 D 事实；公共环境/回归集中运行，非作者完成独立 G3/G4。

## 7. 验证

必须验证 canonical→DTO→Rust→spec/client→最小 UI、migration→entity→DDL、敏感投影、真实上游与来源链、金额/税/尾差、唯一当前/替代/阶段锁、权限/CSRF/本人确认、并发与必要写故障整体回滚、原 UI 操作以及精确清理/借用原件恢复。运行结果、静态核对、历史 ignored、失败和部分观测分别标记。

G1 前仅有静态盘点与 G0 线上实际登记；没有 runtime、G1 Pass、G2 完成或新增交付结论。具体测试矩阵、环境标识、来源指纹与收口方案待最终输入补齐。

## 8. 例外、漂移与结论

当前没有已接受的绕过 G1 例外。Node 缺失真实准备/本人确认/变更生产链、阶段未锁及金额/分摊缺口归 `existing-baseline-drift`；新增公共入口、受控 DTO/DDL 和 UI 按用户授权列为 `design-change-required`。发现新业务歧义时报告用户裁决，技术一致性由 Root 负责。

G1 = Pending。仅在精确输入齐备、非作者复核和线上冻结后准入 G2。本批 G4 后仅关闭 #107/#108/#109/#106，不关闭 #101/#57。


## 9. 当前 G1 冻结结论

[独立终审原件](rust-r4def/g1-independent07/g1-final06.json.bin) Pass，P0–P2剩余0；[实际线上读回](rust-r4def/g1-online07.json)核四项正文/comment及原生父子关系，#101/#57保持Open。权威[manifest06](rust-r4def/joint-g1-06/manifest06.json)绑定435来源、5outputs、30入口/63schema差异及完整目标293/624；[ownership04](rust-r4def/ownership04.md)与[Root人力派生权限覆盖](rust-r4def/root-projection05.json)参与冻结。原候选、03/05 Block、失败原件保留各自时点。

G1Certified=true、G2Authorized=true仅准入本批三线实现；Rust仍210操作，本批新增正式交付0。实现、实际验收、独立G3/G4、固定提交/main和收口仍待完成；作者从同一冻结metadata提交建立工作树，不重新询问已决业务。上方候选和原始输入的Pending文句保留原时点，以本节及线上Issue为当前准入。
