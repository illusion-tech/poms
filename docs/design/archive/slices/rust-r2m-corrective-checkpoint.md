# R2M #80 实施纠偏 Checkpoint

- Checkpoint Status: `Pending actual acceptance and independent G3`
- Parent: #67；#57 保持开放
- Owner: Root
- Slice Type: `cross-layer-high-risk`
- G3 Reviewer: C，独立于产品和验收工具作者
- Checkpoint Date: 2026-10-31
- G1: [已冻结](https://github.com/illusion-tech/poms/issues/80#issuecomment-6529892491)，原始输入与原始失败证据保留，不回写冻结历史。

## 触发背景与裁决

`existing-baseline-drift`：R2D 转入 M 的非法 URI 参数解码顺序差异已在新 R2M 环境复现。无 Cookie 的 `GET /api/platform/users/%FF` 与尾部 `%`，Native 均返回 400；修复前 Rust 返回 401。两端观察均关闭实际进程所有者，并分别比较请求前后完整 107 表行数和全行摘要。该有限观察不代表冻结的 27 格矩阵已通过。

追加实际 Native 控制组 19 项已证明：全局 wildcard 在路由分发/守卫前逐路径段解码，包括未知路径、未知方法；OPTIONS 先由 CORS 返回 204，非法 JSON 正文也先于路径解码返回解析错误。合法 `%2525`、`%2F` 不二次解码；原始 URI 保留给响应/审计。`tmp/rust-r2m/uri-controls-nest-controls01.json` 保留实际响应、完整 107 表前后摘要及停止证据。

本次据此恢复全局解码/解析/守卫顺序，不新增公共操作。完整 URI 矩阵、公共回归、真实 HTTP 和独立 G3 尚未完成前不得收口。

`tool-noise`：验收 fixture 的初始假设将 canonical setting 当作 absent。原始 `Migration20260526100000_ex67a_system_setting.ts` 已插入 `attachment.max-upload-size-mb`，integer 50 / row_version 1 / null updated_by；实际新库保留该行。禁止删行以制造 absence，禁止认领或删除迁移行。

Root 在用户已授权的 R2M 设置写验收范围内，批准以下精确的新环境单例租约。此裁决不更改业务设计、注册表、迁移或旧环境，也不是新 G1。

## 设置单例的精确准入

- namespace: `poms-r2m`
- marker: `1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5`
- sourceHead: `9dcfb498b175e9fdaae7584aff1d5d3f93bf814f`
- databases: `poms_r2m_nest` / `poms_r2m_rust`；逐 backend/run 独立 admission
- 仅 `poms.system_setting.key = attachment.max-upload-size-mb`
- 唯一 lease case: `m2-ui2.attachment-max-upload-size`；M2/UI2 的实际请求必须映射到该 scope，并另留 logicalCase/stepId。不得放宽任意 case、key、表或旧实例。

准入绑定本文件 raw SHA、C 对 exact `fixture-setting-baseline.mjs` 的 source review raw SHA、run/backend/case、原迁移与服务源码。最初完整七列必须符合迁移默认值，且 created_at 等于 updated_at。租约不是 ownership，永不 DELETE。

真实 GET/PATCH（包括拒绝、no-op、stale、value-before-version 控制）后，逐次保存实际请求、响应摘要与完整 expected-after 行；先停止本 run 所有 writer、确认 pending transaction/active work，再复核当前完整行精确等于已记录 expected-after。使用 xmin 与完整行 CAS 恢复原七列，保留真实外层 COMMIT ACK，并从另一个新验证连接证明完整行精确还原；完成后才能清理 owned actor 引用。

未知变化、未知 writer、COMMIT 不确定或恢复验证失败时保留恢复账本和相关行，禁止猜测恢复或继续删除 actor。普通借用主体/定义仍只读；59 个具名 UUID ownership 表及完整 107 表引用扫描边界不变。

## 验证与剩余阻断

原始凭据、session、全行事实和 child log 留在本环境 private；公开仅存路径、字节数、摘要和有限结果。初次 Node 公共回归中 Native build、API/admin lint、API tests 已通过；admin test 因 Root 全局传入 experimental-vm-modules 导致启动失败，原记录保留，只修正工具参数后补跑未通过/未执行部分，不把启动失败称产品回归。

本 checkpoint 解除的是精确 fixture 修复的实现准入。最终状态仍为 Pending，须补齐真实 HTTP/SQL/内部服务/合成 supplier/UI、完整清理与停止、独立 G3、固定提交复核及 G4。#80/#67 仅在全部自身条件满足后关闭；#57 保持开放。
