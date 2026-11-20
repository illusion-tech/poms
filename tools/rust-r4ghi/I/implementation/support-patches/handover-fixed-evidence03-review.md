# 已确认移交：固定材料与 live freshness 分离

这是 Root 当前源代码的最小产品补丁提案，不修改 G1 原件、scope v1/v2 或 Root 产品。输入字节 SHA 在 `handover-fixed-evidence03-inputs.json`；可复查全文候选为同名前缀的 sources/mod/view `.rs.txt`，统一 diff 为 `handover-fixed-evidence03.patch`。生成脚本仅写这些 tools 产物。

已确认调用链：I 的 `freeze_with_session` 与 `require_current_frozen` 都调用 Root `verify_confirmed_handover_with_session`；阶段命令通过 currentFrozen 复用它。I 没有直接调用/复制 D live collector，scope 也只调用 D participant bridge。故 I 消费者签名和产品文件无需改动。

根因是 Root 两个 bridge 原来均调用 `sources::fresh`。该函数重新按当前 project/lead/contract/follow-up 链接发现全部 attachment groups，并在每组追 active/final/latest。新增真实交付、验收或条件闭合证据会增加 materials，改变 live hash，错误撤掉已确认职责和准入。

补丁保留 draft 路径的完整 `fresh` 比较。确认前的 self-confirm、finalize 仍比较全部当前合同和当前材料 fingerprint；中途加/换材料仍拒绝偷签旧包。抽取的固定职责校验没有跳过 hash：复用原 `basis()` 重算 basis payload 及两个真实 summary payload 的 hash，进一步重算冻结 factual whitelist 的 source hash，并核 current v1/current handover、当前 sales owner、固定执行人/财务要求/回款模式、真实职责集合、精确 r→cp→c 父子和本人集合/人数/时间。confirmed participant 授权使用这条 intrinsic 路径，不读当前附件组或当前合同集合，也不因其他人的后来 profile/附件变化撤掉本人的真实职责。Root scope 继续独立检查当前 actor active、有效组织关系和精确 route permission。

confirmed business bridge 使用新增 fixed-material collector 模式：原合同/snapshot/审批/正式 plan collector 和 blockers 全部保留，materials 则直接采用 basis 原冻结 rows，不先扩当前 groups 再过滤。因此 hash 仍比较“真实当前 owner + 真实当前合同成员 + 原冻结材料集合”，合同增删、生效 snapshot/plan 改变或来源破坏仍409，不冻结后偷偷改包。business 校验还保留整体参与者有效性，并只锁原 included attachment IDs，逐一核 active/id/group/version/checksum/security 与原快照一致。原附件仍 active、但 is_latest/is_final 后来变化可以通过；原件丢失/作废/改 hash/版本/分类则拒绝，不能追新 latest 替换。原 excluded rows 保持原捕获字节，不因后来状态改变而自动加入。

GET detail 的 currentSourcePayloadHash/sourceChanged 按 phase 使用同一语义：draft 仍是完整 live fingerprint；confirmed 对照真实当前合同和固定材料，并显示原 included 来源失效的阻断。准备入口 summary 仍返回完整 live hash，供合法新 prepare/rebaseline 核对。既有 DTO/HTTP 数量不变，不把新的执行附件误报成需重移交/R5 改包。

三个全文候选和 helper 已通过 rustfmt 解析/格式检查；没有编译、SQL/HTTP、浏览器、服务启动或产品应用。Root 必须实际验证：真实签约/移交/本人确认/角色冻结/执行后上传新交付附件，再取得 EO/BA/finance scope 并进入验收；继续上传验收/完工/条件闭合证据不撤职责。反例包括确认前加材料仍409、原 included 原件失活/内容或分类变化409、仅新增 latest 不改旧 active 原件仍固定旧 ID、真实合同/snapshot/plan 变化409、owner/职责/c/cp/basis/summary hash 改变不能授权。所有源验证和必要写继续在同一 outer transaction。
