# R4 GHI + 最小 R5 独立 G1 预审 01

结论：**G1 尚未通过，G2 未准入**。本报告只审指定草案字节，最终判断须复核 Root 正式 baseline、canonical、联合 manifest 与全部 source/target 的一致性。#115 是独立既有修复，不计入本批 32 项。

检查输入：blueprint SHA-256 `a7a5037f97bb12453cd26210090f9c1fa1e8fb4ecfcc88bf33f66cd1eaeccac0`；migration `16204f79f6ffbb63ca25cb76c687d24e047a30133c83af82333f24b98d9d2512`；context `959e14c53e74e8001cd90a2afcb66b6009e98e549f6e3f8399586475943aeba8`。原始字节只复制到本目录 `inputs/*.bin`，未改草案。

## 需在正式输入解决

### BG1-01 / P1：G 快照无法保存未知待确认税额

`blueprint.rootAdoptions.pendingTax` 明确 unknown pending tax 必须是 SQL NULL + knowledge，禁止零兜底。context.Metrics.taxPendingAmount 允许 unknown，H 可为保留 optional uncertainty 的 preliminary。联合 migration 只在 536/580 放宽 DMER/gate 的该列；G 的 `project_operating_snapshot`、`period_closing_snapshot` 仍继承 EX07A 迁移 218/257 的 NOT NULL default 0，ORM 68/74 也非 nullable。因此符合来源和权限要求、但 optional pending tax 不可量化的正式捕获，无法按已冻结语义持久化：要么 INSERT 失败，要么填伪零。

必须为这两个 G 列冻结可表达 unknown 的持久化/ORM协议，例如 nullable + 明确 knowledge，并绑定 context；旧 producer0 值原样保留。验收须覆盖同一真实源链的 known zero 与 unknown 两例，以及故障回滚。

### BG1-02 / P1：最小条件任务读取与唯一公共响应矛盾

I refinements03 的 `ReadOwnCompletionTask` / `OwnConditionOnly` 和 blueprint.scope 要求只返回本人任务最小信息、父 conditionStatus 按全体真实条件汇总。当前 `ProjectCompletionRecordList` 却只引用完整 `ProjectCompletionRecordSummary`，其 required 非 nullable `completionSummary`、`evidenceSummary`、`acceptanceRecordId`，并携带父级完整证据、审计字段；未冻结最小响应分支或明确脱敏映射。只过滤 conditions 仍会扩大读取；删字段或填空字符串又破坏契约。

必须在正式公共 schema/route response 冻结精确最小分支，例如 parent ID/version/aggregate status + own tasks，并使 FullProject / OwnConditionOnly 可明确区分。`ReadFirstAssignmentAnchor` / CreatorFirstAssignmentOnly 也需核同类问题：其最小锚点不能返回完整 ProjectDetailView 或用 as-cast 补空。

## 仍在核对的边界

- I 的 create assignment 已在 contract.md:42/86 明确跨 producer 的 current frozen 一律返回 `commission_frozen_change_requires_dispute`，且原无 producer 过滤的 single-current unique 保留。这条原则不应被实现成只查询 v1。
- G 的新 head、official getter 只取 v1；原 baseline/period unique 均跨 producer。正式输入仍须明确新 head 缺失但旧 current baseline / active period 已存在时的行为，禁止被理解成“第一次创建”或静默 supersede。历史未知应 fail closed；如允许真实受控 admission，需写精确来源与 CAS 条件。
- 源码显示 R2L/L1 summary 是内部机制，并无已登记的通用 summary HTTP GET；L 四 HTTP 响应也不返回 snapshot payload。继续核真实域消费者；不能仅根据内部 findById 推断存在 HTTP 绕读。

## 已独立核对

- 32 唯一目标：G9、H8、I11、R5-min4；其中 16 个 write 均需 modern tag，3 个新增 route 的 named keys 与模板一致。
- 新表 19 个与 blueprint 清单一致；95 个 Native schema 的递归引用完整。
- policy 原字节 SHA 与 canonical hash 不同是正常的：按现有 canonical_hash 规则独立计算为 `7e9cfcedc496bd5d4ffd6fc158371e3db069110798926c63a5156ee4614a1aec`，匹配冻结值。
- 142 个 source pin 在捕获时仅 delivery-status metadata 有一项漂移，符合 Root 当前 Seal 工作；正式 freeze 须更新，不能冒称草案 142 项全一致。
- 数值容量按 primary migration/ORM 是 18,2，非 18,4。capacity-delta02 的 0 容量 DDL/ORM、preinsert checked arithmetic/422 和历史非 cent 不 round 方向可编码；静态检查不代表 SQL 或业务验收。

所有验证均是只读源码/语义/静态检查，未执行 SQL、HTTP、产品或 Git/GitHub 写操作，未读取凭证。唯一写入范围为 `tools/rust-r4ghi/independent/business-g1/**`。模型 Sol6.1/max、Fast 的实际运行配置无独立核验回执。