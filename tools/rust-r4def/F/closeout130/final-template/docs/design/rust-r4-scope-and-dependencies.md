# R4 范围与后续依赖

最后更新：{{ROOT_DATE}}。#101/#57保持Open。本批#106/D#107/E#108/F#109已线上G4收口并Closed；R4累计67/92、余25，Rust正式240。完整R4仍未完成。

## 首批边界

A#103签约就绪9、B#104合同9、C#105资金19，共37公开入口；Runtime累计210，完整共享契约291 operations/595 schemas、client586文件。实际合同准备→精确审核绑定→原子生效快照→正式应收计划，以及独立合同金额、来源差异、正数两位金额和付款归属均已实现验收。详见[归档验收](archive/slices/rust-r4abc/validation-checkpoint57.md)。

## 首批后盘点（历史时点）

当前契约与 Rust 210 项去重后，R4 尚有 53 个既有 HTTP：移交 5、成本与经营 40、验收/完工/归档 8。成本与经营 40 内已包含基础成本 11、分摊/阶段/税务 12、经营核算及风险视图 17，不能重复计数。相应内部/审批机制及完整 R4 阶段集成另须真实验收；R2 最小事实读取不等于这些生产能力。R5 完整提成还依赖后续真实成本/经营/冻结事实；R6/R7 接管与切流另需自己的验收和授权。

## 第二批 G0 与 G1 准备

用户已授权第二批 [#106](https://github.com/illusion-tech/poms/issues/106)，D [#107](https://github.com/illusion-tech/poms/issues/107)、E [#108](https://github.com/illusion-tech/poms/issues/108)、F [#109](https://github.com/illusion-tech/poms/issues/109) 原生父子关系已建立并读回。原范围为 28 既有入口；用户随后同意补齐可操作移交闭环，当前候选为 D7/E11/F12 共30，其中2个新增入口待 authoritative inventory 和联合 G1 精确冻结，尚未准入产品实现。

职责本人确认/可兼任、R5 执行准入分层、金额两位/人工精确舍入/整批分摊守恒的三个裁决见[联合基线](archive/slices/rust-r4def-next30-baseline.md.bin)和[当前状态](rust-r4def-delivery-status.json)。经营17及验收完工归档8保留后续范围；#101/#57保持Open。

本批合同/有效快照/计划和资金事实可以作为后续冻结输入。移交与成本领域可在接口及共享资源归属明确后并行准备；实际消费验收必须依赖真实上游交付，不以合成映射fixture替代成本producer。新增作者UI或财务UI、生产部署和性能均未被本批认领。

## 第二批G1准入（历史时点）

30项（D7/E11/F12，28既有+2新增）已经[独立G1](archive/slices/rust-r4def/g1-independent07/g1-final06.json.bin)和[实际线上冻结](archive/slices/rust-r4def/g1-online07.json.bin)，从同一冻结基线三线进入G2。联合目标完整契约293操作/624schemas不等于运行交付；当前Rust210、本批交付0。前述G0/G1准备为历史时点，当前以[状态索引](rust-r4def-delivery-status.json)为准。本批最终仅可收口#107/#108/#109/#106，#101/#57保持Open。

### {{ROOT_DATE}} R4 第二批实际线上 G4 收口（条件候选，未应用）

D#107/E#108/F#109及本批#106已按[独立关闭许可]({{preclosePermission_REF}})完成实际线上G4；[六Issue读回]({{onlineReadback_REF}})核四项Closed、#101/#57持续Open。本批D7/E11/F12共30个唯一HTTP正式交付，R4累计 **67/92**、余 **25**（经营17＋验收/完工/归档8），Rust正式公开操作 **240**。当前G4OnlineApplied，非作者实际G4终审另行签署；本条不伪造终审Pass。

实现提交 `{{IMPLEMENTATION_COMMIT}}`；永久S4 `4f0ad88e78622a75b88b4e3cc72aded9da67458a` 保留。[验收]({{finalValidation_REF}})、[精确清理]({{cleanup_REF}})、[停止回执]({{stopped_REF}})和[原字节归档](../../docs/design/archive/slices/rust-r4def/archive-origin-map130.json)各自绑定原件；[机器状态](../../docs/design/rust-r4def-delivery-status.json)镜像同一Gate。完整spec为 **239 paths / 293 operations / 626 schemas**、client **616**。原G1、Block、Failed、Partial、ignored、Native参考与Native ORM exit 1均保留原分类，不升格为通过。[main集成]({{mainIntegration_REF}})已核固定提交及永久S4；最终metadata提交与main SHA由Root实际回执提供。

完整R4阶段验收、R5、部署/切流、性能、S3 WORM与真实lost COMMIT ACK均未被本批认证完成；移交事实和已确认成本不绕过R5准入或自动纳入经营口径。另保留既有R2缺口：`createUser`携带`initialRoleIds`返回500（`actualapi32/00011`，`users/service.rs:469 intentionalProtocol`）；由#57后续跟进，本批不修复，也不宣称Rust全局正确性已经完成。
