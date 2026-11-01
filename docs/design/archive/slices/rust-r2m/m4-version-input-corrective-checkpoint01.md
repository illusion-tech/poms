# R2M M4 版本与 provider 绑定输入纠偏

本记录保留原 G1、Source06、`an4a` 全部原始请求和 partial 标签，只纠正本批验收输入；不修改 Native、Rust、索引、DTO 或公共路由。

## 原已冻结边界与本轮实测

I/J 的[纠偏记录](../archive/slices/rust-r2ij-corrective-checkpoint.md)及冻结验收已明确：未准备的 create-version complete 返回 500。当前 Rust `attachments/store.rs` 明确保留 Native CREATE 先于普通 UPDATE 的顺序，以及 catch 再 flush 时的原失败边界。

`an4a` 在首附件创建成功后，原 version complete 实际返回 500，原 Native 日志为 `uq_attachment_latest_active`。本轮完整物理事实证明：该 session 为 `validating` / rowVersion 3 / failedReason NULL；没有新附件，原附件仍 active、versionNo 1、isLatest true。不能把这一结果称为完全无业务变化或把旧 session 改标成功。

已有 K 的真实正例使用明确的 prepared 前置：`tools/rust-r2k/k-advanced-cases.mjs:18–29`，原 SHA256 为 `cb755b332d6a6e3424f9027005bbe6a57d0f6c560110a4d2b435279aa52e7452`。它在 PUT 后对唯一 owned 旧附件执行 `is_latest=false`，随后真实 complete 200，并保留真实 SDK、复制链接和下游消费证据；原注释明确没有修复 J 的 INSERT 排序边界。

来源与读级别见 `tools/rust-r2m/audit-attachment-version-inheritance01.json`。独立协议裁决为 `m4-version-input-design-review01.json`，原大报告未因此重新标定。

## 同一 M4 逻辑矩阵的新输入

1. 完整保留原未准备的 create-version / PUT / complete，单列 500、session 实际残留状态，以及附件和链接未新增的兼容负证。
2. 另创建具有唯一文件名的新 version session 并真实 PUT。不得复用旧 validating session。
3. 复用 K 的唯一 prepared 前置：仅以本 run 真实出生证书已认领的旧附件为目标，使用成熟 `updateOwned` 的完整行、xmin、外层 COMMIT 和独立可见性账本，将 `is_latest` 改为 false。不是业务 API 成功，也不授予任何查询匹配的 UUID 身份。
4. 随后真实 complete 200，保真实新版本和复制链接的出生证据，再执行原 version2、history、latest、mark-final、download 正向链。不得称为没有前置条件的天然版本成功。

M4.4 的 OBS provider 绑定原来只用 `key_prefix`，与同 run 的 local provider 共享该值。新 selector 精确使用原输入的 `provider_type`、`display_name`、`created_by`、`key_prefix`，再与实际已注册出生证书取唯一交集；不从响应或查询结果授予 ownership。local provider 同样精确化。

新 Source07 计划 HTTP 从 167 增为 170，只增加三个新 session 的真实请求；planned 不等于 actual。逻辑矩阵仍为每端 20 项，本片新增公共操作为 0。新 caller 必须经独立必要增量 SourceReady、新 source capsule 和真实双端验收后才可收口。

#80/#67 仍待全批实际验收及独立 G3/G4；#57 保持开放。旧 PG17、旧数据、private 和历史证据保持原状。
