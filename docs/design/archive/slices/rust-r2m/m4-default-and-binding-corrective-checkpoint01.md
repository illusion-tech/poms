# R2M M4 默认 provider 与父项绑定纠偏

本记录补充版本输入 checkpoint；原 Source08、版本 checkpoint `691367ac…` 和 `an4b` 原件保持原标签。Native、Rust、索引、DTO、公共路由均不修改。

## 默认切换的原边界

旧 I/J 的 explicit set-default 已观察过 200 和 500，不能将天然跨两行切换概括为固定 500。原 Native 对旧默认 false、新默认 true 的两个 managed 对象一次 `persist.flush`；当前 Rust 多行 UPDATE 也没有用预检顺序保证行更新顺序。原 partial unique index 保留。

原 K 的 `tools/rust-r2k/k-obs-actual.mjs:15` 明确使用 `updateOwned` 将唯一 owned 旧默认置 false，再准备另一默认及继续消费。来源、原 hash 和读级别见 `tools/rust-r2m/audit-attachment-default-inheritance01.json`；不将此准备称为天然 API 原子切换成功。

`an4b` 中切到 OBS 已成功；随后对 local 的 set-default 实际返回 500，原日志为 `uq_attachment_storage_provider_default`。完整已保事实为 OBS `is_default=true` / version 2、local `is_default=false` / version 3。原请求、响应和 partial 保留，不把这一观察推广为所有 ID、顺序或后端必然失败。

## 新 planned 正向前置

两次切换采用同一受限规则：切到 OBS 前只对本 run 已真实认领的 local provider 执行 `is_default=false`；回到 local 前只对本 run 已真实认领的 OBS provider 执行 `is_default=false`。使用成熟 owned 完整行与 xmin CAS、外层 COMMIT、独立可见性账本；不触及未认领 provider。

准备后先证明没有默认，再执行原目标 provider 的单行 set-default 请求并证明真实 200、唯一默认和无其他业务行变化。真实 audit 的 `previousDefaultConfigId` 为 NULL，不伪造旧 ID；保留 operator、request_id NULL 的原受限来源及脱敏 metadata。短暂无默认属于隔离 fixture 准备，不是产品事务边界的认证。

原天然切换 500 证据保留，新正例不增加试探请求，不修复或认证双行 UPDATE 顺序；原 API body 不改。

## 两项工具绑定修正

- M4.2 的 `attachment_download_package` immutable intent 和 binder 明确加入已真实认领的 `project_id`。不向没有此列的 package item 虚加字段；后生 package PK 仍由实际 SDK/PG typed parent 守卫处理。
- M4.1 的真实 prepared project 已由成熟 direct batch 认领后，明确将该绑定保存在 `localProject`，再进入 K 项目链；不从查询或响应认领 ID，不虚构 source-value 导出，也不依赖失败的 M4.2 才传播绑定。

Source09 的逻辑范围和 HTTP 计划数保持 20 项 / 170 请求，新增的是上述两个具名 owned 准备动作。新输入须独立必要源审、新 capsule 与双端 actual 后才通过。旧失败不回写；#80/#67 仍待全批 G3/G4，#57 保持开放。
