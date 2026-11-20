# I ledger → F 自动阶段证据 → G factual source 适配

**活动提案是 `stage-fact-provider05-rust.patch`，仅含 Rust 三文件。** 它与已交 Root 的04 Rust代码相同，仅将新增 stage_fact.rs 的 unified-diff old header 正确记为 `/dev/null`；04 Rust提案原字节与 SHA `61afc55240cb2bf64372088089802dbf7f928b0ea7b1051b07d678a0eeeed631` 保留。它新增 I 的只读 `stage_fact.rs`、导出 reader，并扩展 F `evidence.rs`。Root 复核后统一应用；没有修改任何产品文件。原始输入 SHA 在 `stage-fact-provider04-inputs.json`。

已核明本批真实 `project_stage_record` 没有 row_version。新 source `project-stage-record` 的 `sourceVersion` 精确匹配实际正 int4 `sequence_no`，不能填虚构版本1。`VerifiedProjectStageFact.occurred_at()` 取真实 `entered_at`；stage 只取真实 `to_stage`。reader 不看 mutable project.current_stage 或当前 head，不把后来推进/重基线当作撤销旧阶段事实，也不制造 execution interval。

导出 API 为 `project_lifecycle::load_verified_stage_fact_with_session(session, project_id, stage_id, expected_sequence_no)`。结果只有私有构造，提供 `id/project_id/version/stage/occurred_at/nested_integrity_hash/source_ref/factual_payload/evidence_snapshot` getters。reader 先用 I 既有 `facts::stage` 重算 nested source_payload_hash，再核实际同项目父链、严格 sequence/from-to/pointer/project-version 连续性、真实 D basis/summary 的不可变 hash、角色冻结 payload/摘要/同链引用、真实 final completion 映射，以及每条 stage 的实际 summary target/definition/package/projection/field-rule 绑定。handover root 仅接受实际已记录的准备事实，不补造之前阶段；旧高级 project stage 没有真实 ledger ID 就不产生来源。

G 已公开唯一适配：`project_operating::sources::project_stage_reference(&raw_row)` 和 `project_stage_factual_payload(&raw_row)`。reader 原样调用它们；SourceRef.kind=ProjectStageRecord，rowVersion 使用 sequence_no。**完整 factual hash 与 I nested transition payload hash 是两个原有不同语义**：前者覆盖 G 注册的完整实际 ledger whitelist，后者只校验原 source_payload。这里不新增第三套白名单、不给 nested hash 冒充 full factual hash，也不重写任一原 hash。G collector 继续拥有 family50 锁、来源闭包/哈希与窗口规则；F 只消费已验证 reader。

F provider 分支复用原 `business_date` 的 HongKong 转换，要求调用者业务日等于实际 stage entry 的香港业务日，返回单点 stage milestone、currency=None、labor=false。原 F core 的“必须同一 cost business date”、auto attributedStage 必须匹配真实 stage、milestone 不能证明 multi-day labor interval 等规则完全保留。它不从当前项目阶段或后续 stage 推导期间，不增加 HTTP、producer、金额计算或 DTO enum；既有 `RestatementR4FSourceEvidence.sourceType` 是自由 string。

Native 分支由 Root/H 的统一 method guard 单写，**仅这个新 source 明确422+unsupported code，原其他 F501参考不改**。为保留实际盘点及最初提案分类，`stage-fact-provider04.patch` 仍附带一段最初的 Native501局部分支，它是已撤回的候选，不能整体应用；活动 Rust patch 已完全移除它。`stage-fact-provider04-project-cost.controller.ts.txt` 也仅是该旧 Native501参考候选，不是活动实现。Root 只应用一处统一 Native guard，不叠加这段旧 guard。Rust 才是真实新来源支持者。

Rust 三个全文候选均经 rustfmt 解析/格式检查。未编译、运行 SQL/HTTP、迁移、启动服务或应用产品。实际验收须由 Root 验证：真实执行 ledger → 香港同日真实成本 → F auto stage attribution → G sourceRows 与 factual hash闭包；跨项目/错 sequence/损坏 nested hash/父链/摘要拒绝；UTC 跨16点按香港日；已推进项目仍可读取真实旧 execution milestone；多日 labor 仍不能用一个 milestone 通过。Native新source422是 unsupported reference，不能计作真实 producer/consumer 成功。
